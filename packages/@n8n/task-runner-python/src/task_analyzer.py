import ast
import hashlib
import sys
from typing import Set, Tuple
from collections import OrderedDict

from src.errors import SecurityViolationError
from src.constants import (
    MAX_VALIDATION_CACHE_SIZE,
    ERROR_RELATIVE_IMPORT,
    ERROR_STDLIB_DISALLOWED,
    ERROR_EXTERNAL_DISALLOWED,
    ERROR_DANGEROUS_ATTRIBUTE,
    ERROR_DYNAMIC_IMPORT,
    ALWAYS_BLOCKED_ATTRIBUTES,
    UNSAFE_ATTRIBUTES,
)

CacheKey = Tuple[str, Tuple]  # (code_hash, allowlists_tuple)
CachedViolations = list[str]
ValidationCache = OrderedDict[CacheKey, CachedViolations]


class SecurityValidator(ast.NodeVisitor):
    """AST visitor that enforces import allowlists and blocks dangerous attribute access."""

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
        """Detect access to unsafe attributes that could bypass security restrictions."""

        if node.attr in UNSAFE_ATTRIBUTES:
            # Block regardless of context
            if node.attr in ALWAYS_BLOCKED_ATTRIBUTES:
                self._add_violation(
                    node.lineno, ERROR_DANGEROUS_ATTRIBUTE.format(attr=node.attr)
                )
            # Block in attribute chains (e.g., x.__class__.__bases__) or on literals (e.g., "".__class__)
            elif isinstance(node.value, (ast.Attribute, ast.Constant)):
                self._add_violation(
                    node.lineno, ERROR_DANGEROUS_ATTRIBUTE.format(attr=node.attr)
                )

        self.generic_visit(node)

    def visit_Call(self, node: ast.Call) -> None:
        """Detect calls to __import__() that could bypass security restrictions."""

        is_import_call = (
            # __import__()
            (isinstance(node.func, ast.Name) and node.func.id == "__import__")
            or
            # builtins.__import__() or __builtins__.__import__()
            (
                isinstance(node.func, ast.Attribute)
                and node.func.attr == "__import__"
                and isinstance(node.func.value, ast.Name)
                and node.func.value.id in {"builtins", "__builtins__"}
            )
        )

        if is_import_call:
            if (
                node.args
                and isinstance(node.args[0], ast.Constant)
                and isinstance(node.args[0].value, str)
            ):
                module_name = node.args[0].value
                self._validate_import(module_name, node.lineno)
            else:
                self._add_violation(node.lineno, ERROR_DYNAMIC_IMPORT)

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

        security_validator = SecurityValidator(self._stdlib_allow, self._external_allow)
        security_validator.visit(tree)

        self._set_in_cache(cache_key, security_validator.violations)

        if security_validator.violations:
            self._raise_security_error(security_validator.violations)

    def _raise_security_error(self, violations: CachedViolations) -> None:
        raise SecurityViolationError(
            message="Security violations detected", description="\n".join(violations)
        )

    def _to_cache_key(self, code: str) -> CacheKey:
        code_hash = hashlib.sha256(code.encode()).hexdigest()
        return (code_hash, self._allowlists)

    def _set_in_cache(self, cache_key: CacheKey, violations: CachedViolations) -> None:
        if len(self._cache) >= MAX_VALIDATION_CACHE_SIZE:
            self._cache.popitem(last=False)  # FIFO

        self._cache[cache_key] = violations.copy()
        self._cache.move_to_end(cache_key)
