import pytest

from src.errors.security_violation_error import SecurityViolationError
from src.task_analyzer import TaskAnalyzer


class TestTaskAnalyzer:
    @pytest.fixture
    def analyzer(self) -> TaskAnalyzer:
        return TaskAnalyzer(
            stdlib_allow={
                "json",
                "math",
                "re",
                "datetime",
                "random",
                "string",
                "collections",
                "itertools",
                "functools",
                "operator",
            },
            external_allow=set(),
        )


class TestImportValidation(TestTaskAnalyzer):
    def test_allowed_standard_imports(self, analyzer: TaskAnalyzer) -> None:
        valid_imports = [
            "import json",
            "import math",
            "from datetime import datetime",
            "from collections import Counter",
            "import re as regex",
            "from itertools import chain, cycle",
            "from math import *",
        ]

        for code in valid_imports:
            analyzer.validate(code)

    def test_blocked_dangerous_imports(self, analyzer: TaskAnalyzer) -> None:
        dangerous_imports = [
            "import os",
            "import sys",
            "import subprocess",
            "from os import path",
            "import socket",
        ]

        for code in dangerous_imports:
            with pytest.raises(SecurityViolationError):
                analyzer.validate(code)

    def test_blocked_relative_imports(self, analyzer: TaskAnalyzer) -> None:
        relative_imports = [
            "from . import module",
            "from .. import parent_module",
            "from ...package import something",
        ]

        for code in relative_imports:
            with pytest.raises(SecurityViolationError):
                analyzer.validate(code)


class TestAttributeAccessValidation(TestTaskAnalyzer):
    def test_always_blocked_attributes(self, analyzer: TaskAnalyzer) -> None:
        blocked_attributes = [
            "obj.__subclasses__",
            "obj.__globals__",
            "obj.__builtins__",
            "obj.__traceback__",
            "obj.tb_frame",
        ]

        for code in blocked_attributes:
            with pytest.raises(SecurityViolationError):
                analyzer.validate(code)

    def test_conditionally_blocked_in_chains(self, analyzer: TaskAnalyzer) -> None:
        blocked_chains = [
            "x.__class__.__bases__",
            "obj.__class__.__mro__",
            "something.__init__.__globals__",
            "obj.__class__.__code__",
            "func.__func__.__closure__",
        ]

        for code in blocked_chains:
            with pytest.raises(SecurityViolationError):
                analyzer.validate(code)

    def test_conditionally_blocked_on_literals(self, analyzer: TaskAnalyzer) -> None:
        blocked_literals = [
            '"".__class__',
            '"test".__class__',
            "(0).__class__",
            "(42).__class__",
            "(3.14).__class__",
        ]

        for code in blocked_literals:
            with pytest.raises(SecurityViolationError):
                analyzer.validate(code)

        allowed_literals = [
            "[].__class__",
            "{}.__class__",
            "().__class__",
        ]

        for code in allowed_literals:
            analyzer.validate(code)

    def test_allowed_attribute_access(self, analyzer: TaskAnalyzer) -> None:
        allowed_attributes = [
            "obj.value",
            "data.items()",
            "list.append(item)",
            "dict.keys()",
            "str.upper()",
            "math.pi",
        ]

        for code in allowed_attributes:
            analyzer.validate(code)

    def test_safe_class_usage(self, analyzer: TaskAnalyzer) -> None:
        safe_code = """
class MyClass:
    def __init__(self):
        self.value = 42

obj = MyClass()
result = obj.__class__.__name__
"""
        analyzer.validate(safe_code)


class TestDynamicImportDetection(TestTaskAnalyzer):
    def test_various_dynamic_import_patterns(self, analyzer: TaskAnalyzer) -> None:
        disallowed_dynamic_imports = [
            "__import__('os')",
            "import builtins; builtins.__import__('sys')",
            "module_name = 'subprocess'; __import__(module_name)",
        ]

        for code in disallowed_dynamic_imports:
            with pytest.raises(SecurityViolationError):
                analyzer.validate(code)

    def test_allowed_modules_via_dynamic_import(self, analyzer: TaskAnalyzer) -> None:
        allowed_dynamic_imports = [
            "__import__('json')",
            "__import__('math')",
            "__import__('collections')",
            "module = __import__('datetime')",
        ]

        for code in allowed_dynamic_imports:
            analyzer.validate(code)


class TestAllowAll(TestTaskAnalyzer):
    def test_allow_all_bypasses_validation(self) -> None:
        analyzer = TaskAnalyzer(stdlib_allow={"*"}, external_allow={"*"})

        unsafe_allowed_code = [
            "import os",
            "import sys",
            "__import__('subprocess')",
            "obj.__subclasses__",
            "from . import relative",
        ]

        for code in unsafe_allowed_code:
            analyzer.validate(code)
