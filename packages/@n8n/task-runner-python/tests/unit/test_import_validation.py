"""Unit tests for module-import allowlist validation."""

from src.import_validation import validate_module_import
from src.config.security_config import SecurityConfig


def _config(external: set[str] | None = None) -> SecurityConfig:
    return SecurityConfig(
        stdlib_allow=set(),
        external_allow=external if external is not None else set(),
        builtins_deny=set(),
        runner_env_deny=True,
    )


class TestPackageRelativeImports:
    def test_relative_import_resolves_to_allowlisted_parent(self):
        # A package-internal relative name (e.g. pydantic loading
        # ``.type_adapter`` via importlib) anchored on an allowlisted package
        # must pass once resolved to its absolute top-level package.
        allowed, error = validate_module_import(
            ".type_adapter", _config({"pydantic"}), "pydantic"
        )
        assert allowed is True
        assert error is None

    def test_relative_import_with_non_allowlisted_anchor_is_blocked(self):
        # A relative name anchored on a non-allowlisted package is still
        # rejected after resolution, and the error names the resolved package
        # rather than the bare relative name.
        allowed, error = validate_module_import(
            ".sub", _config({"pydantic"}), "requests"
        )
        assert allowed is False
        assert error is not None
        assert "requests.sub" in error

    def test_multi_level_relative_resolves_to_top_level_package(self):
        # A parent-relative name (``..``) anchored within an allowlisted
        # package resolves to that same top-level package and is allowed.
        allowed, error = validate_module_import(
            "..types", _config({"pydantic"}), "pydantic.v1"
        )
        assert allowed is True
        assert error is None

    def test_multi_level_relative_resolution_stays_within_anchor_top_level(self):
        # A parent-relative name resolves within the anchor's own top-level
        # package, so anchoring on a non-allowlisted package stays blocked and
        # the error names the resolved package, never a different top-level one.
        allowed, error = validate_module_import(
            "..sub", _config({"pydantic"}), "requests.api"
        )
        assert allowed is False
        assert error is not None
        assert "requests.sub" in error

    def test_relative_import_without_anchor_is_blocked(self):
        # Without an anchor the relative name cannot be resolved; it must fail
        # closed rather than slip through.
        allowed, error = validate_module_import(".sub", _config({"pydantic"}))
        assert allowed is False
        assert error is not None

    def test_unresolvable_relative_import_is_blocked(self):
        # When resolution fails (here, a name that reaches beyond the anchor's
        # top-level package), the check falls back to the raw name and rejects.
        allowed, error = validate_module_import("...x", _config({"a"}), "a.b")
        assert allowed is False
        assert error is not None

    def test_absolute_non_allowlisted_package_is_blocked(self):
        allowed, error = validate_module_import("requests", _config({"pydantic"}))
        assert allowed is False
        assert error is not None
        assert "requests" in error

    def test_absolute_allowlisted_package_passes(self):
        allowed, error = validate_module_import("pydantic", _config({"pydantic"}))
        assert allowed is True
        assert error is None

    def test_absolute_submodule_inherits_top_level_decision(self):
        # An absolute dotted name is checked by its top-level package, so a
        # submodule of an allowlisted package passes and a submodule of a
        # non-allowlisted one is blocked.
        allowed, error = validate_module_import(
            "pydantic.type_adapter", _config({"pydantic"})
        )
        assert allowed is True
        assert error is None

        allowed, error = validate_module_import(
            "requests.sessions", _config({"pydantic"})
        )
        assert allowed is False
        assert error is not None
        assert "requests" in error
