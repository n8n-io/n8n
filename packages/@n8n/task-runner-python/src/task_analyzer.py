import ast
import sys
from typing import Set

from src.errors import SecurityViolationError

ERROR_RELATIVE_IMPORTS = "Relative imports are disallowed"
ERROR_DYNAMIC_IMPORT = "Dynamic imports using `__import__()` are disallowed (could bypass allowlist validation at runtime)"
ERROR_DYNAMIC_IMPORTLIB = "Dynamic imports using `importlib` are disallowed (could bypass allowlist validation at runtime)"
ERROR_STDLIB_DISALLOWED = "Import of standard library module '{module}' is disallowed. Allowed stdlib modules: {allowed}"
ERROR_EXTERNAL_DISALLOWED = "Import of external package '{module}' is disallowed. Allowed external packages: {allowed}"
ERROR_SECURITY_VIOLATIONS = "Security violations detected:\n{violations}"


class ImportValidationVisitor(ast.NodeVisitor):
    def __init__(self, stdlib_allow: Set[str], external_allow: Set[str]):
        self.checked_modules: Set[str] = set()
        self.violations: list[str] = []

        self.stdlib_allow = stdlib_allow
        self.external_allow = external_allow
        self._stdlib_allowed_str = self._format_allowed(stdlib_allow)
        self._external_allowed_str = self._format_allowed(external_allow)

    # ========== Visitors ==========

    def visit_Import(self, node: ast.Import) -> None:
        """Validate bare import statements (e.g., import os). Also aliased bare import statements (e.g., import numpy as np)."""

        for alias in node.names:
            module_name = alias.name
            self._validate_import(module_name, node.lineno)
        self.generic_visit(node)

    def visit_ImportFrom(self, node: ast.ImportFrom) -> None:
        """Validate from import statements (e.g., from os import path). Block relative imports."""

        if node.module:
            self._validate_import(node.module, node.lineno)
        elif node.level > 0:
            self._add_violation(node.lineno, ERROR_RELATIVE_IMPORTS)

        self.generic_visit(node)

    def visit_Call(self, node: ast.Call) -> None:
        """Validate dynamic imports, i.e. __import__() or importlib.import_module(). Block non-constant module names."""

        if isinstance(node.func, ast.Name) and node.func.id == "__import__":
            if node.args and isinstance(node.args[0], ast.Constant):
                module_name = node.args[0].value
                if isinstance(module_name, str):
                    self._validate_import(module_name, node.lineno)
            else:
                self._add_violation(node.lineno, ERROR_DYNAMIC_IMPORT)

        elif isinstance(node.func, ast.Attribute) and node.func.attr == "import_module":
            if (
                isinstance(node.func.value, ast.Name)
                and node.func.value.id == "importlib"
            ):
                if node.args and isinstance(node.args[0], ast.Constant):
                    module_name = node.args[0].value
                    if isinstance(module_name, str):
                        self._validate_import(module_name, node.lineno)
                else:
                    self._add_violation(node.lineno, ERROR_DYNAMIC_IMPORTLIB)

        self.generic_visit(node)

    # ========== Validation ==========

    def _validate_import(self, module_path: str, lineno: int) -> None:
        """Validate that a module import is allowed based on allowlists."""

        module_name = module_path.split(".")[0]  # e.g., os.path -> os

        if module_name in self.checked_modules:
            return

        self.checked_modules.add(module_name)

        is_stdlib = module_name in sys.stdlib_module_names
        is_external = not is_stdlib

        if is_stdlib and module_name in self.stdlib_allow:
            return

        if is_external and module_name in self.external_allow:
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
        """Add a violation with line number prefix."""
        self.violations.append(f"Line {lineno}: {message}")


class TaskAnalyzer:
    def __init__(self, stdlib_allow: Set[str], external_allow: Set[str]):
        self.stdlib_allow = stdlib_allow
        self.external_allow = external_allow

    def validate(self, code: str) -> None:
        try:
            tree = ast.parse(code)
        except SyntaxError:
            raise

        visitor = ImportValidationVisitor(self.stdlib_allow, self.external_allow)
        visitor.visit(tree)

        if visitor.violations:
            message = ERROR_SECURITY_VIOLATIONS.format(
                violations="\n".join(visitor.violations)
            )
            raise SecurityViolationError(message)
