import ast
import hashlib
from typing import Set, Tuple
from collections import OrderedDict

from src.errors import SecurityViolationError
from src.import_validation import validate_module_import
from src.config.security_config import SecurityConfig
from src.constants import (
    MAX_VALIDATION_CACHE_SIZE,
    ERROR_RELATIVE_IMPORT,
    ERROR_DANGEROUS_ATTRIBUTE,
    ERROR_DYNAMIC_IMPORT,
    BLOCKED_ATTRIBUTES,
)

CacheKey = Tuple[str, Tuple]  # (code_hash, allowlists_tuple)
CachedViolations = list[str]
ValidationCache = OrderedDict[CacheKey, CachedViolations]


class SecurityValidator(ast.NodeVisitor):
    """AST visitor that enforces import allowlists and blocks dangerous attribute access."""

    def __init__(self, security_config: SecurityConfig):
        self.checked_modules: Set[str] = set()
        self.violations: list[str] = []
        self.security_config = security_config

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

        if node.attr in BLOCKED_ATTRIBUTES:
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

        is_allowed, error_msg = validate_module_import(
            module_path, self.security_config
        )

        if not is_allowed:
            self._add_violation(lineno, error_msg)

    def _add_violation(self, lineno: int, message: str) -> None:
        self.violations.append(f"Line {lineno}: {message}")


class TaskAnalyzer:
    _cache: ValidationCache = OrderedDict()

    def __init__(self, security_config: SecurityConfig):
        self._security_config = security_config
        self._allowlists = (
            tuple(sorted(security_config.stdlib_allow)),
            tuple(sorted(security_config.external_allow)),
        )
        self._allow_all = (
            "*" in security_config.stdlib_allow
            and "*" in security_config.external_allow
        )

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

        security_validator = SecurityValidator(self._security_config)
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
