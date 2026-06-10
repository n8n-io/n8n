"""Sandbox hardening regression tests."""

import importlib

import pytest

from src.task_executor import (
    TaskExecutor,
    _PRISTINE_DUNDER_IMPORT,
    _PRISTINE_IMPORT_MODULE,
)
from src.task_analyzer import TaskAnalyzer
from src.errors import SecurityViolationError
from src.config.security_config import SecurityConfig
from src.constants import (
    EXECUTOR_SAFE_FORMAT_KEY,
    EXECUTOR_USER_OUTPUT_KEY,
)


@pytest.fixture(autouse=True)
def _restore_importlib_entries():
    # ``_harden_importlib`` mutates the global ``importlib`` module. Pull the
    # pristine refs from ``task_executor`` (captured at its module load) so
    # restoration is correct even if a prior test left a guarded version
    # installed.
    try:
        yield
    finally:
        importlib.import_module = _PRISTINE_IMPORT_MODULE
        importlib.__import__ = _PRISTINE_DUNDER_IMPORT


def _realistic_config(stdlib: set[str] | None = None) -> SecurityConfig:
    return SecurityConfig(
        stdlib_allow=stdlib
        if stdlib is not None
        else {"string", "collections", "operator", "importlib"},
        external_allow=set(),
        builtins_deny=set(),
        runner_env_deny=True,
    )


def _run(code: str, config: SecurityConfig | None = None) -> object:
    """Run user code through the full pipeline. Raises SecurityViolationError
    on any rejection. Returns the user output value on success."""
    config = config or _realistic_config()

    TaskAnalyzer(config).validate(code)
    compiled = TaskExecutor._compile_user_code(code, "<test>")

    from src.task_executor import _safe_format

    TaskExecutor._harden_importlib(config)

    globs: dict = {
        "__builtins__": TaskExecutor._filter_builtins(config),
        "_items": [{"json": {}}],
        "_query": None,
        "print": TaskExecutor._create_custom_print([]),
        EXECUTOR_SAFE_FORMAT_KEY: _safe_format,
    }
    exec(compiled, globs)
    return globs.get(EXECUTOR_USER_OUTPUT_KEY)


class TestInjectedCallables:
    def test_print_callable_still_records_calls(self):
        print_args: list = []
        callable_obj = TaskExecutor._create_custom_print(print_args)
        callable_obj("hello", 42)
        assert len(print_args) == 1
        assert print_args[0] == ["'hello'", "42"]

    def test_import_callable_still_enforces_allowlist(self):
        config = SecurityConfig(
            stdlib_allow={"json"},
            external_allow=set(),
            builtins_deny=set(),
            runner_env_deny=True,
        )
        safe_import = TaskExecutor._create_safe_import(config)
        json_mod = safe_import("json", None, None, ("dumps",), 0)
        assert json_mod is not None
        with pytest.raises(SecurityViolationError):
            safe_import("os", None, None, None, 0)

    def test_print_callable_setattr_is_blocked(self):
        # User code must not be able to swap out the recording list or the
        # formatting helper held in the callable's slots.
        callable_obj = TaskExecutor._create_custom_print([])
        with pytest.raises(AttributeError):
            callable_obj._print_args = ["pwned"]
        with pytest.raises(AttributeError):
            callable_obj._format_print_args = lambda *a: a

    def test_import_callable_setattr_is_blocked(self):
        callable_obj = TaskExecutor._create_safe_import(_realistic_config())
        with pytest.raises(AttributeError):
            callable_obj._security_config = None
        with pytest.raises(AttributeError):
            callable_obj._original = lambda *a, **k: "pwned"


class TestStringConstantAnalysis:
    def test_bare_blocked_attribute_name_constant_is_rejected(self):
        code = 'return ["__globals__"]'
        with pytest.raises(SecurityViolationError) as exc_info:
            TaskAnalyzer(_realistic_config()).validate(code)
        assert "__globals__" in exc_info.value.description

    def test_bare_blocked_name_constant_is_rejected(self):
        code = 'return ["__builtins__"]'
        with pytest.raises(SecurityViolationError) as exc_info:
            TaskAnalyzer(_realistic_config()).validate(code)
        assert "__builtins__" in exc_info.value.description

    def test_safe_format_internal_key_constant_is_rejected(self):
        code = f'return ["{EXECUTOR_SAFE_FORMAT_KEY}"]'
        with pytest.raises(SecurityViolationError):
            TaskAnalyzer(_realistic_config()).validate(code)

    def test_runtime_concatenated_blocked_name_is_rejected(self):
        code = "attr = '__glob' + 'als__'\nreturn attr"
        with pytest.raises(SecurityViolationError) as exc_info:
            TaskAnalyzer(_realistic_config()).validate(code)
        assert "__globals__" in exc_info.value.description

    def test_unrelated_strings_pass(self):
        code = "return 'hello world ' + str(1 + 2)"
        TaskAnalyzer(_realistic_config()).validate(code)


class TestFormatterMethodCoverage:
    @pytest.mark.parametrize(
        "method",
        ["vformat", "get_field"],
    )
    def test_bare_formatter_method_extraction_is_rejected(self, method):
        code = f"x = ''\nf = x.{method}\nreturn f"
        with pytest.raises(SecurityViolationError):
            TaskAnalyzer(_realistic_config()).validate(code)

    def test_formatter_vformat_call_with_blocked_template_is_rejected(self):
        code = (
            "import string\n"
            "return string.Formatter().vformat('{0.__globals__}', (print,), {})"
        )
        with pytest.raises(SecurityViolationError):
            _run(code)

    def test_formatter_get_field_call_with_blocked_field_expression_is_rejected(self):
        code = (
            "import string\n"
            "g, _ = string.Formatter().get_field('0.__globals__', (print,), {})\n"
            "return list(g.keys())"
        )
        with pytest.raises(SecurityViolationError):
            _run(code)


class TestSafeFormatReceiverCoverage:
    def test_userstring_format_template_is_validated(self):
        code = (
            "import collections\n"
            "us = collections.UserString('{0.__globals__}')\n"
            "return us.format(print)"
        )
        with pytest.raises(SecurityViolationError):
            _run(code)


class TestImportAllowlistCoverage:
    def test_importlib_import_module_rejects_disallowed_stdlib(self):
        config = SecurityConfig(
            stdlib_allow={"importlib"},
            external_allow=set(),
            builtins_deny=set(),
            runner_env_deny=True,
        )
        code = "import importlib\nreturn importlib.import_module('os')"
        with pytest.raises(SecurityViolationError):
            _run(code, config)

    def test_importlib_dunder_import_rejects_disallowed_stdlib(self):
        config = SecurityConfig(
            stdlib_allow={"importlib"},
            external_allow=set(),
            builtins_deny=set(),
            runner_env_deny=True,
        )
        code = "import importlib\nreturn importlib.__import__('os')"
        with pytest.raises(SecurityViolationError):
            _run(code, config)

    def test_importlib_can_still_import_allowed_module(self):
        config = SecurityConfig(
            stdlib_allow={"importlib", "json"},
            external_allow=set(),
            builtins_deny=set(),
            runner_env_deny=True,
        )
        code = (
            "import importlib\nreturn importlib.import_module('json').dumps({'k': 1})"
        )
        result = _run(code, config)
        assert result == '{"k": 1}'


class TestIntrospectionDeniedOnHardenedCallables:
    """Regression tests covering the indirect-attribute-access surface.

    Removing ``__globals__`` from the callable instance is not enough on its
    own: a Python-defined ``__call__`` method has its own ``__globals__``
    pointing back at the defining module. The hardened callable boundary
    must deny attribute access for any name that could expose that path.
    """

    def test_print_call_globals_path_via_attrgetter_is_blocked(self):
        # The literal attribute names are assembled at runtime so the static
        # analyzer cannot reject them; this exercises the hardened-callable
        # runtime denial specifically.
        config = SecurityConfig(
            stdlib_allow={"operator"},
            external_allow=set(),
            builtins_deny=set(),
            runner_env_deny=True,
        )
        code = (
            "import operator\n"
            "u = '_' * 2\n"
            "path = '.'.join([u + 'call' + u, u + 'globals' + u])\n"
            "return operator.attrgetter(path)(print)"
        )
        with pytest.raises(AttributeError):
            _run(code, config)

    def test_safe_import_call_globals_path_via_attrgetter_is_blocked(self):
        config = SecurityConfig(
            stdlib_allow={"operator"},
            external_allow=set(),
            builtins_deny=set(),
            runner_env_deny=True,
        )
        code = (
            "import operator\n"
            "u = '_' * 2\n"
            "path = '.'.join([u + 'call' + u, u + 'globals' + u])\n"
            "return operator.attrgetter(path)(__import__)"
        )
        with pytest.raises(AttributeError):
            _run(code, config)

    def test_importlib_guarded_call_globals_path_via_attrgetter_is_blocked(self):
        config = SecurityConfig(
            stdlib_allow={"importlib", "operator"},
            external_allow=set(),
            builtins_deny=set(),
            runner_env_deny=True,
        )
        code = (
            "import importlib\n"
            "import operator\n"
            "u = '_' * 2\n"
            "path = '.'.join([u + 'call' + u, u + 'globals' + u])\n"
            "return operator.attrgetter(path)(importlib.import_module)"
        )
        with pytest.raises(AttributeError):
            _run(code, config)

    def test_missing_attribute_lookup_does_not_reveal_class_name(self):
        # The denied-attribute and missing-attribute paths should produce
        # the same error shape so the message can't be used as an oracle
        # and so the underlying class identity is not exposed.
        callable_obj = TaskExecutor._create_custom_print([])
        with pytest.raises(AttributeError) as exc_info:
            getattr(callable_obj, "definitely_not_an_attribute")
        message = str(exc_info.value)
        for marker in ("_SafePrint", "_HardenedCallable", "_GuardedImport"):
            assert marker not in message, (
                f"AttributeError message must not leak class identity '{marker}': {message!r}"
            )


class TestBuiltinsSanitization:
    """Reaching a hardened callable's module namespace (e.g. through a future
    gap in the attribute boundary) must not hand back directly usable
    primitives: the leaf module narrows its own builtins to a benign set."""

    def _leaf_builtins(self) -> dict:
        callable_obj = TaskExecutor._create_custom_print([])
        # ``type(obj)`` sidesteps the instance ``__getattribute__``; class-level
        # access to ``__call__.__globals__`` is the worst-case reachable namespace.
        ns = type(callable_obj).__call__.__globals__["__builtins__"]
        return ns if isinstance(ns, dict) else vars(ns)

    @pytest.mark.parametrize(
        "name",
        ["eval", "exec", "compile", "open", "__import__", "getattr", "globals", "vars"],
    )
    def test_high_leverage_builtin_is_absent(self, name):
        assert name not in self._leaf_builtins()

    def test_structural_builtins_remain_for_the_boundary(self):
        # Documented residual: object/type stay because the boundary needs them;
        # weaponising them requires attributes the analyzer rejects.
        leaf = self._leaf_builtins()
        assert "object" in leaf and "type" in leaf

    def test_module_namespace_excludes_executor_internals(self):
        module_ns = type(TaskExecutor._create_custom_print([])).__call__.__globals__
        for leaked in ("os", "sys", "TaskExecutor", "SecurityConfig"):
            assert leaked not in module_ns


class TestSafeFormatBoundary:
    """The format-validation helper injected into user globals is itself a
    hardened callable, so its executor-bearing globals are not reachable while
    it still validates and dispatches."""

    def test_safe_format_denies_introspection(self):
        from src.task_executor import _safe_format

        for attr in ("__globals__", "__call__", "_impl", "__class__"):
            with pytest.raises(AttributeError):
                getattr(_safe_format, attr)

    def test_safe_format_still_rejects_blocked_template(self):
        from src.task_executor import _safe_format

        with pytest.raises(SecurityViolationError):
            _safe_format("format", "{0.__globals__}", object())

    def test_safe_format_dispatches_benign_template(self):
        from src.task_executor import _safe_format

        assert _safe_format("format", "hi {0}", "there") == "hi there"


class TestUnboundFormatterCalls:
    """The runtime guard must validate unbound formatter calls the same way
    as bound ones, accounting for the shifted ``self`` argument."""

    def test_unbound_formatter_get_field_validates_field_argument(self):
        code = (
            "import string\n"
            "formatter = string.Formatter()\n"
            "field = '.'.join(['0', '__globals__'])\n"
            "return string.Formatter.get_field(formatter, field, (print,), {})"
        )
        with pytest.raises(SecurityViolationError):
            _run(code)

    def test_unbound_formatter_format_validates_template_argument(self):
        code = (
            "import string\n"
            "formatter = string.Formatter()\n"
            "template = '{0.' + '__globals__' + '}'\n"
            "return string.Formatter.format(formatter, template, print)"
        )
        # Either the analyzer catches the assembled template or _safe_format
        # rejects the validated argument at runtime.
        with pytest.raises(SecurityViolationError):
            _run(code)


class TestSafeFormatDoesNotProbeDataAttribute:
    """`_safe_format` must not evaluate ``.data`` on every non-str receiver
    just to check for ``UserString``-style wrappers; only the concrete type
    triggers that path."""

    def test_user_class_with_data_property_is_not_triggered(self):
        code = (
            "class C:\n"
            "    @property\n"
            "    def data(self):\n"
            "        raise RuntimeError('unexpected')\n"
            "    def format(self):\n"
            "        return 'ok'\n"
            "return C().format()"
        )
        # No allowlist needed — nothing is imported.
        config = SecurityConfig(
            stdlib_allow=set(),
            external_allow=set(),
            builtins_deny=set(),
            runner_env_deny=True,
        )
        assert _run(code, config) == "ok"


class TestAssembledStringDoesNotFalsePositive:
    """The analyzer's compile-time-assembly check is exact-match plus
    format-template scan, not substring matching. User strings that happen
    to contain blocked tokens as substrings must pass."""

    def test_fstring_containing_objects_word_passes(self):
        code = "n = 3\nreturn f'Found {n} objects'"
        TaskAnalyzer(_realistic_config()).validate(code)

    def test_concatenation_containing_object_word_passes(self):
        code = "return 'user_' + 'objects'"
        TaskAnalyzer(_realistic_config()).validate(code)

    def test_module_word_in_string_passes(self):
        code = "return 'load module name'"
        TaskAnalyzer(_realistic_config()).validate(code)

    def test_fstring_interpolation_does_not_fabricate_blocked_name(self):
        # The literal parts surround an interpolation, so the runtime string
        # can never be a bare ``__globals__``; the analyzer must not assemble
        # the literal fragments into one and reject it.
        code = "x = 5\nreturn f'__glob{x}als__'"
        TaskAnalyzer(_realistic_config()).validate(code)

    def test_bare_parse_attribute_extraction_is_allowed(self):
        # ``.parse`` is a common method name on unrelated objects (feedparser,
        # dateutil, XML/JSON parsers) and does not evaluate field expressions,
        # so extracting or calling it must not be treated as format access.
        code = "x = ''\nf = x.parse\nreturn f"
        TaskAnalyzer(_realistic_config()).validate(code)
