"""Leaf module housing the callables exposed to user code.

This module's imports are intentionally narrow. Anything reachable through
``__globals__`` on a callable defined here is fair game once user code finds
a path through the introspection deny-list, so we keep that surface minimal.
Sensitive callables and config are passed in to constructors and stored on
instance slots; they never appear as module globals.

As a further layer, this module replaces its own ``__builtins__`` with a
minimal mapping (see ``_sanitized_builtins``) once it has finished loading, so
that reading this namespace does not hand back ``eval`` / ``open`` /
``__import__`` and similar. The callables defined above are unaffected: on the
supported interpreters each function resolves builtins against the references
captured when it was defined, not this mapping.
"""

import json
import sys
from collections.abc import Callable

from src.constants import (
    BLOCKED_ATTRIBUTES,
    EXECUTOR_CIRCULAR_REFERENCE_KEY,
    EXECUTOR_FILENAMES,
)
from src.errors import SecurityViolationError

# Bind the frame helper while ``sys`` is importable (this module drops most of
# its builtins at end of load). Keep only this function, not all of ``sys``, to
# limit what user code could reach through this module.
_get_frame = sys._getframe
del sys


# Sourced from the analyzer's BLOCKED_ATTRIBUTES so the static and runtime
# checks share one ground truth. Callable-specific dunders (``__call__``,
# ``__init__``, ``__new__``, ``__doc__``, ``__dir__``, ``__subclasshook__``,
# ``__repr__``) are added on top — they're not relevant to the AST visitor
# but matter for object-introspection denial.
_INTROSPECTION_DENY: frozenset = frozenset(BLOCKED_ATTRIBUTES) | frozenset(
    {
        "__call__",
        "__init__",
        "__new__",
        "__doc__",
        "__dir__",
        "__subclasshook__",
        "__repr__",
    }
)


# Spoofed type name used in attribute-error messages so the underlying class
# identity stays hidden and the error is indistinguishable from one raised on
# a real builtin function.
_SPOOF_TYPE = "builtin_function_or_method"


def _attribute_error(name: str) -> AttributeError:
    return AttributeError(f"'{_SPOOF_TYPE}' object has no attribute {name!r}")


class _HardenedCallable:
    """Base for callables exposed to user code.

    Denies attribute access (read, write, delete) for any name in the
    subclass's ``_DENY`` set, plus any attribute that doesn't exist. Calling
    ``instance(...)`` still works because Python looks up ``__call__`` via
    the type slot, not through ``__getattribute__``.

    Missing attributes raise the same shape of error as denied ones so the
    error message can't be used as an oracle to distinguish "blocked" from
    "doesn't exist", and uses a spoofed type name so the class identity is
    not revealed.

    ``__setattr__`` / ``__delattr__`` reject all mutations after construction
    so user code can't swap out the internal callables (slot data is set via
    ``object.__setattr__`` from ``__init__``).
    """

    __slots__ = ()
    _DENY: frozenset = _INTROSPECTION_DENY

    def __getattribute__(self, name):
        if name in object.__getattribute__(type(self), "_DENY"):
            raise _attribute_error(name)
        try:
            return object.__getattribute__(self, name)
        except AttributeError:
            raise _attribute_error(name) from None

    def __setattr__(self, name, value):
        raise _attribute_error(name)

    def __delattr__(self, name):
        raise _attribute_error(name)


class _SafePrint(_HardenedCallable):
    __slots__ = ("_print_args", "_format_print_args")
    _DENY = _INTROSPECTION_DENY | frozenset({"_print_args", "_format_print_args"})

    def __init__(self, print_args: list, format_print_args: Callable):
        object.__setattr__(self, "_print_args", print_args)
        object.__setattr__(self, "_format_print_args", format_print_args)

    def __call__(self, *args):
        serializable_args = []
        for arg in args:
            try:
                json.dumps(arg, default=str, ensure_ascii=False)
                serializable_args.append(arg)
            except Exception:
                # Ensure args are serializable across the multiprocessing pipe.
                serializable_args.append(
                    {
                        EXECUTOR_CIRCULAR_REFERENCE_KEY: repr(arg),
                        "__type__": type(arg).__name__,
                    }
                )

        format_args = object.__getattribute__(self, "_format_print_args")
        print_args = object.__getattribute__(self, "_print_args")
        print_args.append(format_args(*serializable_args))
        print("[user code]", *args)

    # ``__repr__`` runs via the type slot so calling ``repr(instance)``
    # returns this spoofed string; ``instance.__repr__`` attribute access is
    # denied by ``__getattribute__``.
    def __repr__(self) -> str:
        return "<built-in function print>"


def _import_module_anchor(args, kwargs) -> str | None:
    """The string anchor of ``import_module(name, package)``, or ``None``.

    ``package`` may be a keyword or the first positional argument. Anything that
    isn't a string in that slot (notably ``__import__``'s ``globals`` dict) is
    not an anchor.
    """
    # The anchor is a string, passed by keyword or as the first positional arg.
    package = kwargs.get("package")
    if isinstance(package, str):
        return package
    if args and isinstance(args[0], str):
        return args[0]
    # No string in that slot (e.g. ``__import__``'s globals dict): no anchor.
    return None


def _level_relative_target(name, args, kwargs) -> tuple[str, str] | None:
    """The ``(leading-dot name, anchor)`` for a relative
    ``__import__(name, globals, .., level)``, or ``None`` if it isn't one.

    A relative ``__import__`` is a bare ``name`` with ``level > 0``; the anchor
    is the importing module's ``globals["__package__"]``. The dots are rebuilt
    onto the name so it resolves the same way as the ``import_module`` form.
    """
    # Only a string name can be reshaped into a leading-dot form and resolved.
    if not isinstance(name, str):
        return None
    # ``level`` is the dot count, ``__import__``'s 5th arg (keyword or 4th of *args).
    level = kwargs.get("level")
    if level is None and len(args) >= 4:
        level = args[3]
    # level <= 0 is an absolute import, not a relative one.
    if not isinstance(level, int) or level <= 0:
        return None
    # The anchor lives in the importer's globals (``__import__``'s 2nd arg).
    importer_globals = kwargs.get("globals")
    if importer_globals is None and args and isinstance(args[0], dict):
        importer_globals = args[0]
    if not isinstance(importer_globals, dict):
        return None
    # No usable parent package: let the caller fall through (and fail closed)
    # rather than guess an anchor.
    anchor = importer_globals.get("__package__")
    if not (isinstance(anchor, str) and anchor):
        return None
    # Rebuild the leading-dot form, e.g. ("sub", level 1) -> ".sub".
    return "." * level + name, anchor


def _validation_target(name, args, kwargs) -> tuple[str, str | None]:
    """Return the ``(name, anchor_package)`` the allowlist should check.

    Relative imports arrive in two shapes; both are normalized to a leading-dot
    name plus a string anchor, which the validator resolves to a top-level
    package. The real import is performed separately with the original name.
    """
    # import_module(".sub", "pkg"): the name already carries its dots.
    anchor = _import_module_anchor(args, kwargs)
    if anchor is not None:
        return name, anchor

    # __import__("sub", globals, .., level): rebuild the dotted name from level.
    relative = _level_relative_target(name, args, kwargs)
    if relative is not None:
        return relative

    # Absolute import (or unrecognized shape): check the name as-is.
    return name, None


def _import_initiated_by_user_code() -> bool:
    """Whether this import's immediate caller is the user's own code.

    Told apart by the calling frame's filename: user code runs under a fixed
    sentinel filename, set when the executor compiles it. This is the immediate
    initiator, not the ultimate one — an import a package makes on the user's
    behalf counts as package code.
    """
    # Frames: 0 here, 1 _GuardedImport.__call__, 2 the import statement / importlib call.
    try:
        initiator = _get_frame(2)
    except ValueError:
        # No frame to inspect: fail closed and treat it as user code.
        return True
    return initiator.f_code.co_filename in EXECUTOR_FILENAMES


class _GuardedImport(_HardenedCallable):
    """Hardened wrapper around an import entry point.

    Used both for the ``__import__`` injected into user builtins and for the
    in-place replacements on ``importlib.import_module`` / ``importlib.__import__``.
    Only the importlib entry points are ``trust_eligible``; the user-builtins
    ``__import__`` always validates, regardless of caller.
    """

    __slots__ = ("_security_config", "_validate_import", "_original", "_trust_eligible")
    _DENY = _INTROSPECTION_DENY | frozenset(
        {"_security_config", "_validate_import", "_original", "_trust_eligible"}
    )

    def __init__(
        self,
        security_config,
        validate_import: Callable,
        original: Callable,
        trust_eligible: bool = False,
    ):
        object.__setattr__(self, "_security_config", security_config)
        object.__setattr__(self, "_validate_import", validate_import)
        object.__setattr__(self, "_original", original)
        object.__setattr__(self, "_trust_eligible", trust_eligible)

    def __call__(self, name, *args, **kwargs):
        config = object.__getattribute__(self, "_security_config")
        # When trusted, package-initiated imports skip the allowlist; user
        # imports are always validated. Applies to all package code.
        trusted = (
            object.__getattribute__(self, "_trust_eligible")
            and config.allow_transitive_imports
            and not _import_initiated_by_user_code()
        )
        if not trusted:
            validate = object.__getattribute__(self, "_validate_import")
            check_name, package = _validation_target(name, args, kwargs)
            is_allowed, error_msg = validate(check_name, config, package)
            if not is_allowed:
                assert error_msg is not None
                raise SecurityViolationError(
                    message="Security violation detected",
                    description=error_msg,
                )
        original = object.__getattribute__(self, "_original")
        return original(name, *args, **kwargs)

    def __repr__(self) -> str:
        return "<built-in function __import__>"


class _SafeFormat(_HardenedCallable):
    """Hardened wrapper around the format-validation entry point injected into
    user globals under ``EXECUTOR_SAFE_FORMAT_KEY``.

    The actual implementation lives in a module with sensitive globals, so it
    is held on a denied slot and only ever invoked through ``__call__`` — user
    code that reaches this instance cannot read it back out.
    """

    __slots__ = ("_impl",)
    _DENY = _INTROSPECTION_DENY | frozenset({"_impl"})

    def __init__(self, impl: Callable):
        object.__setattr__(self, "_impl", impl)

    def __call__(self, method_name, receiver, /, *args, **kwargs):
        impl = object.__getattribute__(self, "_impl")
        return impl(method_name, receiver, *args, **kwargs)

    def __repr__(self) -> str:
        return "<built-in function format>"


def _sanitized_builtins() -> dict:
    """Builtins exposed when this module's namespace is read.

    Restricted to the benign names the callables above rely on. The
    high-leverage primitives (``eval`` / ``exec`` / ``compile`` / ``open`` /
    ``__import__`` / ``getattr`` / ``globals`` / ...) are intentionally absent,
    so reading this module's ``__builtins__`` yields nothing directly usable.
    ``object`` and ``type`` remain because the boundary itself needs them;
    weaponising those requires attributes the analyzer already rejects.
    """
    import builtins

    return {
        name: getattr(builtins, name)
        for name in (
            "object",
            "type",
            "repr",
            "print",
            "Exception",
            "AttributeError",
        )
    }


# Must be the final statement: top-level code above runs against the real
# builtins, and only the attacker-visible mapping is narrowed here.
__builtins__ = _sanitized_builtins()
