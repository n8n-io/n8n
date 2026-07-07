"""Tests for ``allow_transitive_imports``: trusting a package's own imports.

When on, imports made by package code skip the allowlist (so an allowlisted
package can load its dependencies without each being listed), while the user's
own imports are still checked. Trust is keyed on the initiating frame's filename,
which user code can't forge.

The guard only sees an import that package code routes through ``importlib``;
plain ``import x`` statements inside a package use the unpatched
``builtins.__import__`` and aren't seen here. The synthetic packages below use
``importlib``, matching how pandas/boto3 lazy-load their dependencies.
"""

import importlib
import sys

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
    EXECUTOR_ALL_ITEMS_FILENAME,
    EXECUTOR_SAFE_FORMAT_KEY,
    EXECUTOR_USER_OUTPUT_KEY,
)


@pytest.fixture(autouse=True)
def _restore_importlib_entries():
    # ``_harden_importlib`` mutates the global ``importlib`` module; restore the
    # pristine refs after each test so a guarded version isn't left installed.
    try:
        yield
    finally:
        importlib.import_module = _PRISTINE_IMPORT_MODULE
        importlib.__import__ = _PRISTINE_DUNDER_IMPORT


def _config(
    external: set[str],
    *,
    trust: bool = False,
    stdlib: set[str] | None = None,
) -> SecurityConfig:
    return SecurityConfig(
        stdlib_allow=stdlib if stdlib is not None else {"importlib"},
        external_allow=external,
        builtins_deny=set(),
        runner_env_deny=True,
        allow_transitive_imports=trust,
    )


def _run(code: str, config: SecurityConfig) -> object:
    """Run user code through the full guard pipeline. Raises
    SecurityViolationError on rejection; returns the user output on success."""
    TaskAnalyzer(config).validate(code)
    # Compile under the real executor sentinel filename so the guard's
    # user-code detection (which keys on the initiating frame's filename)
    # behaves as it does in production.
    compiled = TaskExecutor._compile_user_code(code, EXECUTOR_ALL_ITEMS_FILENAME)

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


def _evict(*roots: str) -> None:
    """Drop cached modules under the given top-level names so a subsequent
    import re-executes through the guard instead of returning a cached module."""
    for name in list(sys.modules):
        if name.split(".")[0] in roots:
            sys.modules.pop(name, None)


class TestTransitiveDependencyTrust:
    """Synthetic, deterministic coverage. ``parentpkg`` is allowlisted;
    ``childdep`` (its dependency) is deliberately NOT allowlisted. ``parentpkg``
    loads its dependency lazily via importlib, the same way pandas/boto3 reach
    pytz/dateutil."""

    def _build_parent_and_child(self, tmp_path, monkeypatch):
        parent = tmp_path / "parentpkg"
        parent.mkdir()
        (parent / "__init__.py").write_text(
            "import importlib\n"
            "def use():\n"
            "    return importlib.import_module('childdep').VALUE\n"
        )
        (tmp_path / "childdep.py").write_text("VALUE = 99\n")
        monkeypatch.syspath_prepend(str(tmp_path))

    def test_dependency_allowed_when_transitive_imports_trusted(
        self, tmp_path, monkeypatch
    ):
        # With the opt-in on, the allowlisted package's own import of its
        # (non-allowlisted) dependency resolves.
        self._build_parent_and_child(tmp_path, monkeypatch)
        code = "import importlib\nreturn importlib.import_module('parentpkg').use()"
        try:
            result = _run(code, _config({"parentpkg"}, trust=True))
        finally:
            _evict("parentpkg", "childdep")
        assert result == 99

    def test_dependency_rejected_by_default(self, tmp_path, monkeypatch):
        # Default (opt-in off): the package's dependency import is still
        # validated and rejected, preserving the existing strict behavior.
        self._build_parent_and_child(tmp_path, monkeypatch)
        code = "import importlib\nreturn importlib.import_module('parentpkg').use()"
        try:
            with pytest.raises(SecurityViolationError):
                _run(code, _config({"parentpkg"}, trust=False))
        finally:
            _evict("parentpkg", "childdep")

    def test_user_code_cannot_import_dependency_even_when_trusted(
        self, tmp_path, monkeypatch
    ):
        # The trust is scoped to package code. User code importing the
        # non-allowlisted dependency directly is still rejected with the opt-in
        # on, so the allowlist still bounds user code.
        self._build_parent_and_child(tmp_path, monkeypatch)
        code = "import importlib\nreturn importlib.import_module('childdep').VALUE"
        try:
            with pytest.raises(SecurityViolationError):
                _run(code, _config({"parentpkg"}, trust=True))
        finally:
            _evict("parentpkg", "childdep")

    def test_user_code_import_of_non_allowlisted_package_still_rejected(self):
        # A plain user import of a non-allowlisted module is rejected with the
        # opt-in on (the flag is not a wildcard).
        code = "import importlib\nreturn importlib.import_module('os')"
        with pytest.raises(SecurityViolationError):
            _run(code, _config(set(), trust=True))

    def test_non_allowlisted_package_cannot_be_imported_when_trusted(
        self, tmp_path, monkeypatch
    ):
        # Trust derives from the parent being allowlisted: if the parent itself
        # is not allowlisted, user code cannot import it even with the opt-in on.
        self._build_parent_and_child(tmp_path, monkeypatch)
        code = "import importlib\nreturn importlib.import_module('parentpkg').use()"
        try:
            with pytest.raises(SecurityViolationError):
                _run(code, _config(set(), trust=True))
        finally:
            _evict("parentpkg", "childdep")

    def _build_stdlib_importer(self, tmp_path, monkeypatch):
        # An allowlisted package whose code imports a stdlib module via importlib.
        pkg = tmp_path / "stdlibparent"
        pkg.mkdir()
        (pkg / "__init__.py").write_text(
            "import importlib\n"
            "def use():\n"
            "    return importlib.import_module('base64').b64encode(b'x')\n"
        )
        monkeypatch.syspath_prepend(str(tmp_path))

    def test_package_may_import_non_allowlisted_stdlib_when_trusted(
        self, tmp_path, monkeypatch
    ):
        # Trust covers package-initiated stdlib imports too, not only external
        # ones: an allowlisted package can import a stdlib module that stdlib_allow
        # does not list. (stdlib_allow has importlib but not base64.)
        self._build_stdlib_importer(tmp_path, monkeypatch)
        code = "import importlib\nreturn str(importlib.import_module('stdlibparent').use())"
        try:
            result = _run(
                code, _config({"stdlibparent"}, trust=True, stdlib={"importlib"})
            )
        finally:
            _evict("stdlibparent")
        assert "eA==" in result

    def test_package_non_allowlisted_stdlib_rejected_by_default(
        self, tmp_path, monkeypatch
    ):
        # Default (opt-in off): the package's stdlib import is still validated
        # against stdlib_allow and rejected.
        self._build_stdlib_importer(tmp_path, monkeypatch)
        code = "import importlib\nreturn str(importlib.import_module('stdlibparent').use())"
        try:
            with pytest.raises(SecurityViolationError):
                _run(code, _config({"stdlibparent"}, trust=False, stdlib={"importlib"}))
        finally:
            _evict("stdlibparent")

    def test_user_supplied_import_callback_is_always_validated(
        self, tmp_path, monkeypatch
    ):
        # A user-supplied callable reaches the user-builtins __import__, which is
        # not trust-eligible, so the import is validated regardless of which frame
        # invokes it; a non-allowlisted module stays blocked even with the opt-in on.
        pkg = tmp_path / "cbpkg"
        pkg.mkdir()
        (pkg / "__init__.py").write_text("def run(cb, name):\n    return cb(name)\n")
        monkeypatch.syspath_prepend(str(tmp_path))
        code = (
            "import cbpkg\nreturn [{'json': {'r': str(cbpkg.run(__import__, 'os'))}}]"
        )
        try:
            with pytest.raises(SecurityViolationError):
                _run(code, _config({"cbpkg"}, trust=True, stdlib={"importlib"}))
        finally:
            _evict("cbpkg")


class TestUserCodeAttribution:
    """Pin the frame contract behind ``_import_initiated_by_user_code``: the
    guard treats its immediate caller as user code only when that frame runs
    under a sentinel filename. Fails loudly if the call depth regresses (e.g. an
    indirection frame is added between the import and the guard)."""

    def _recorder_guard(self):
        from src._sandbox_callables import _GuardedImport

        state = {"validated": 0}

        def validate(name, config, package=None):
            state["validated"] += 1
            return (True, None)

        guard = _GuardedImport(
            _config({"x"}, trust=True),
            validate,
            lambda *a, **k: "imported",
            trust_eligible=True,  # mirror the importlib-path guard
        )
        return guard, state

    def test_call_from_user_frame_is_validated(self):
        # Caller compiled under the sentinel filename -> user code -> checked.
        guard, state = self._recorder_guard()
        exec(compile("g('x')", EXECUTOR_ALL_ITEMS_FILENAME, "exec"), {"g": guard})
        assert state["validated"] == 1

    def test_call_from_package_frame_is_trusted(self):
        # Caller is this test frame (non-sentinel filename) -> package -> skipped.
        guard, state = self._recorder_guard()
        guard("x")
        assert state["validated"] == 0
