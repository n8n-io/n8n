import ast
import sys
from typing import Set

from src.errors import SecurityViolationError


class ImportValidationVisitor(ast.NodeVisitor):
    def __init__(self, stdlib_allow: Set[str], external_allow: Set[str]):
        self.stdlib_allow = stdlib_allow
        self.external_allow = external_allow
        self.imported_modules: Set[str] = set()
        self.violations: list[str] = []
        self.stdlib_modules = sys.stdlib_module_names

    def visit_Import(self, node: ast.Import) -> None:
        # import module

        for alias in node.names:
            module_name = alias.name
            self._validate_import(module_name, node.lineno)
        self.generic_visit(node)

    def visit_ImportFrom(self, node: ast.ImportFrom) -> None:
        # from module import ...

        if node.module:  # Can be None for relative imports like 'from . import x'
            self._validate_import(node.module, node.lineno)
        elif node.level > 0:
            # Relative import without module name (e.g., 'from . import x')
            self.violations.append(
                f"Line {node.lineno}: Relative imports are not allowed"
            )
        self.generic_visit(node)

    def visit_Call(self, node: ast.Call) -> None:
        # __import__() or importlib

        if isinstance(node.func, ast.Name) and node.func.id == "__import__":
            if node.args and isinstance(node.args[0], ast.Constant):
                module_name = node.args[0].value
                if isinstance(module_name, str):
                    self._validate_import(module_name, node.lineno)
            else:
                self.violations.append(
                    f"Line {node.lineno}: Dynamic imports using __import__() are not allowed"
                )

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
                    self.violations.append(
                        f"Line {node.lineno}: Dynamic imports using importlib are not allowed"
                    )

        self.generic_visit(node)

    def _validate_import(self, module_name: str, lineno: int) -> None:
        top_level = module_name.split(".")[0]

        if top_level in self.imported_modules:
            return

        self.imported_modules.add(top_level)

        is_stdlib = self._is_stdlib_module(top_level)

        if is_stdlib:
            if top_level not in self.stdlib_allow:
                self.violations.append(
                    f"Line {lineno}: Import of standard library module '{module_name}' is not allowed. "
                    f"Allowed stdlib modules: {', '.join(sorted(self.stdlib_allow)) if self.stdlib_allow else 'none'}"
                )
        else:
            if top_level not in self.external_allow:
                self.violations.append(
                    f"Line {lineno}: Import of external package '{module_name}' is not allowed. "
                    f"Allowed external packages: {', '.join(sorted(self.external_allow)) if self.external_allow else 'none'}"
                )

    def _is_stdlib_module(self, module_name: str) -> bool:
        return module_name in self.stdlib_modules


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
            message = "Security violations detected:\n" + "\n".join(
                visitor.violations
            )
            raise SecurityViolationError(message)
