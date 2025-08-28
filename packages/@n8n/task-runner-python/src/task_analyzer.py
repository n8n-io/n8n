import ast
import hashlib
import sys
from typing import Set, Tuple
from collections import OrderedDict

from src.errors import SecurityViolationError
from src.constants import MAX_VALIDATION_CACHE_SIZE

CacheKey = Tuple[str, Tuple]  # (code_hash, allowlists_tuple)
CachedViolations = list[str]
ValidationCache = OrderedDict[CacheKey, CachedViolations]

ERROR_RELATIVE_IMPORT = "Relative imports are disallowed."
ERROR_STDLIB_DISALLOWED = "Import of standard library module '{module}' is disallowed. Allowed stdlib modules: {allowed}"
ERROR_EXTERNAL_DISALLOWED = "Import of external package '{module}' is disallowed. Allowed external packages: {allowed}"
ERROR_DANGEROUS_ATTRIBUTE = "Access to attribute '{attr}' is disallowed, because it can be used to bypass security restrictions."
ERROR_SECURITY_VIOLATIONS = "Security violations detected:\n{violations}"

ALWAYS_BLOCKED_ATTRIBUTES = {
    "__subclasses__",
    "__globals__",
    "__builtins__",
    "__traceback__",
    "tb_frame",
    "tb_next",
    "f_back",
    "f_globals",
    "f_locals",
    "f_code",
    "f_builtins",
}

CONDITIONALLY_BLOCKED_ATTRIBUTES = {
    "__class__",
    "__bases__",
    "__code__",
    "__closure__",
    "__loader__",
    "__cached__",
    "__dict__",
    "__import__",
    "__mro__",
    "__init_subclass__",
    "__getattr__",
    "__setattr__",
    "__delattr__",
}

UNSAFE_ATTRIBUTES = ALWAYS_BLOCKED_ATTRIBUTES | CONDITIONALLY_BLOCKED_ATTRIBUTES


class ImportValidator(ast.NodeVisitor):
    """AST visitor that enforces import allowlists."""

    def __init__(self, stdlib_allow: Set[str], external_allow: Set[str]):
        self.checked_modules: Set[str] = set()
        self.violations: list[str] = []

        self.stdlib_allow = stdlib_allow
        self.external_allow = external_allow
        self._stdlib_allowed_str = self._format_allowed(stdlib_allow)
        self._external_allowed_str = self._format_allowed(external_allow)
        self._stdlib_allow_all = "*" in stdlib_allow
        self._external_allow_all = "*" in external_allow

    # ========== Detection ==========

    def visit_Import(self, node: ast.Import) -> None:
        """Detect bare import statements (e.g., import os), including aliased (e.g., import numpy as np)."""

        for alias in node.names:
            module_name = alias.name
            self._validate_import(module_name, node.lineno)
        self.generic_visit(node)

    def visit_ImportFrom(self, node: ast.ImportFrom) -> None:
        """Detect from import statements (e.g., from os import path)."""

        if node.level > 0:
            self._add_violation(node.lineno, ERROR_RELATIVE_IMPORT)
        elif node.module:
            self._validate_import(node.module, node.lineno)

        self.generic_visit(node)

    def visit_Attribute(self, node: ast.Attribute) -> None:
        """Detect access to unsafe attributes that could bypass security."""

        if node.attr in UNSAFE_ATTRIBUTES:
            # Block regardless of context
            if node.attr in ALWAYS_BLOCKED_ATTRIBUTES:
                self._add_violation(
                    node.lineno, ERROR_DANGEROUS_ATTRIBUTE.format(attr=node.attr)
                )
            # Block only in attribute chains (e.g., x.__class__.__bases__)
            elif isinstance(node.value, ast.Attribute):
                self._add_violation(
                    node.lineno, ERROR_DANGEROUS_ATTRIBUTE.format(attr=node.attr)
                )
            # Block only on literals (e.g., "".__class__)
            elif node.attr == "__class__" and isinstance(node.value, (ast.Constant)):
                self._add_violation(
                    node.lineno, ERROR_DANGEROUS_ATTRIBUTE.format(attr=node.attr)
                )

        self.generic_visit(node)

    # ========== Validation ==========

    def _validate_import(self, module_path: str, lineno: int) -> None:
        """Validate that a module import is allowed based on allowlists. Also disallow relative imports."""

        if module_path.startswith("."):
            self._add_violation(lineno, ERROR_RELATIVE_IMPORT)
            return

        module_name = module_path.split(".")[0]  # e.g., os.path -> os

        if module_name in self.checked_modules:
            return

        self.checked_modules.add(module_name)

        is_stdlib = module_name in sys.stdlib_module_names
        is_external = not is_stdlib

        if is_stdlib and (self._stdlib_allow_all or module_name in self.stdlib_allow):
            return

        if is_external and (
            self._external_allow_all or module_name in self.external_allow
        ):
            return

        error, allowed_str = (
            (ERROR_STDLIB_DISALLOWED, self._stdlib_allowed_str)
            if is_stdlib
            else (ERROR_EXTERNAL_DISALLOWED, self._external_allowed_str)
        )

        self._add_violation(
            lineno, error.format(module=module_path, allowed=allowed_str)
        )

    def _format_allowed(self, allow_set: Set[str]) -> str:
        return ", ".join(sorted(allow_set)) if allow_set else "none"

    def _add_violation(self, lineno: int, message: str) -> None:
        self.violations.append(f"Line {lineno}: {message}")


class TaskAnalyzer:
    _cache: ValidationCache = OrderedDict()

    def __init__(self, stdlib_allow: Set[str], external_allow: Set[str]):
        self._stdlib_allow = stdlib_allow
        self._external_allow = external_allow
        self._allowlists = (
            tuple(sorted(stdlib_allow)),
            tuple(sorted(external_allow)),
        )
        self._allow_all = "*" in stdlib_allow and "*" in external_allow

    def validate(self, code: str) -> None:
        if self._allow_all:
            return

        cache_key = self._to_cache_key(code)
        cached_violations = self._cache.get(cache_key)
        cache_hit = cached_violations is not None

        if cache_hit:
            self._cache.move_to_end(cache_key)

            if len(cached_violations) == 0:
                return

            if len(cached_violations) > 0:
                self._raise_security_error(cached_violations)

        tree = ast.parse(code)

        import_validator = ImportValidator(self._stdlib_allow, self._external_allow)
        import_validator.visit(tree)

        self._set_in_cache(cache_key, import_validator.violations)

        if import_validator.violations:
            self._raise_security_error(import_validator.violations)

    def _raise_security_error(self, violations: CachedViolations) -> None:
        message = ERROR_SECURITY_VIOLATIONS.format(violations="\n".join(violations))
        raise SecurityViolationError(message)

    def _to_cache_key(self, code: str) -> CacheKey:
        code_hash = hashlib.sha256(code.encode()).hexdigest()
        return (code_hash, self._allowlists)

    def _set_in_cache(self, cache_key: CacheKey, violations: CachedViolations) -> None:
        if len(self._cache) >= MAX_VALIDATION_CACHE_SIZE:
            self._cache.popitem(last=False)  # FIFO

        self._cache[cache_key] = violations.copy()
        self._cache.move_to_end(cache_key)
