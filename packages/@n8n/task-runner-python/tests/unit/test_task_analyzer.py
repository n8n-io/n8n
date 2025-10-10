import pytest

from src.errors.security_violation_error import SecurityViolationError
from src.task_analyzer import TaskAnalyzer
from src.config.security_config import SecurityConfig
from src.constants import BLOCKED_ATTRIBUTES


class TestTaskAnalyzer:
    @pytest.fixture
    def analyzer(self) -> TaskAnalyzer:
        security_config = SecurityConfig(
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
            builtins_deny=set(),
        )

        return TaskAnalyzer(security_config)


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
    def test_all_blocked_attributes_are_blocked(self, analyzer: TaskAnalyzer) -> None:
        for attr in BLOCKED_ATTRIBUTES:
            code = f"obj.{attr}"
            with pytest.raises(SecurityViolationError) as exc_info:
                analyzer.validate(code)
            assert attr in exc_info.value.description.lower()

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
        security_config = SecurityConfig(
            stdlib_allow={"*"}, external_allow={"*"}, builtins_deny=set()
        )
        analyzer = TaskAnalyzer(security_config)

        unsafe_allowed_code = [
            "import os",
            "import sys",
            "__import__('subprocess')",
            "obj.__subclasses__",
            "from . import relative",
        ]

        for code in unsafe_allowed_code:
            analyzer.validate(code)
