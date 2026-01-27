import pytest

from src.errors.security_violation_error import SecurityViolationError
from src.task_analyzer import TaskAnalyzer
from src.config.security_config import SecurityConfig
from src.constants import BLOCKED_ATTRIBUTES, BLOCKED_NAMES


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
            runner_env_deny=True,
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

    def test_all_blocked_names_are_blocked(self, analyzer: TaskAnalyzer) -> None:
        for name in BLOCKED_NAMES:
            code = f"{name}"
            with pytest.raises(SecurityViolationError) as exc_info:
                analyzer.validate(code)
            assert name in exc_info.value.description

    def test_loader_access_attempts_blocked(self, analyzer: TaskAnalyzer) -> None:
        exploit_attempts = [
            "__loader__.load_module('posix')",
            "posix = __loader__.load_module('posix'); posix.system('echo')",
            "module = __loader__.load_module('os')",
        ]

        for code in exploit_attempts:
            with pytest.raises(SecurityViolationError) as exc_info:
                analyzer.validate(code)
            assert "__loader__" in exc_info.value.description

    def test_spec_access_attempts_blocked(self, analyzer: TaskAnalyzer) -> None:
        exploit_attempts = [
            "__spec__.loader().load_module('posix')",
            "posix = __spec__.loader().load_module('posix')",
            "__spec__",
            "loader = __spec__.loader()",
        ]

        for code in exploit_attempts:
            with pytest.raises(SecurityViolationError) as exc_info:
                analyzer.validate(code)
            assert "__spec__" in exc_info.value.description

    def test_dunder_name_attempts_blocked(self, analyzer: TaskAnalyzer) -> None:
        exploit_attempts = [
            "sys.modules[__name__]",
            "builtins_module = sys.modules[__name__]",
            "sys.modules[__name__].open('/etc/passwd', 'r')",
            "builtins_module = sys.modules[__name__]; unfiltered_open = builtins_module.open",
        ]

        for code in exploit_attempts:
            with pytest.raises(SecurityViolationError) as exc_info:
                analyzer.validate(code)
            assert "__name__" in exc_info.value.description

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

    def test_name_mangled_attributes_blocked(self, analyzer: TaskAnalyzer) -> None:
        exploit_attempts = [
            "license._Printer__filenames",
            "obj._SomeClass__private_attr",
            "help._Helper__name",
            "credits._Printer__data",
            "instance._MyClass__secret",
        ]

        for code in exploit_attempts:
            with pytest.raises(SecurityViolationError) as exc_info:
                analyzer.validate(code)
            assert "name-mangled" in exc_info.value.description.lower()

    def test_attribute_error_obj_blocked(self, analyzer: TaskAnalyzer) -> None:
        exploit_attempts = [
            "e.obj",
            "exception.obj",
            "error.obj",
        ]

        for code in exploit_attempts:
            with pytest.raises(SecurityViolationError) as exc_info:
                analyzer.validate(code)
            assert "obj" in exc_info.value.description


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


class TestFormatStringAttacks(TestTaskAnalyzer):
    def test_dangerous_format_patterns_blocked(self, analyzer: TaskAnalyzer) -> None:
        dangerous_strings = [
            # Attribute access patterns
            '"{.__builtins__}".format(print)',
            '"{.__class__}".format(obj)',
            '"{.__globals__}".format(fn)',
            '"{.__class__.__mro__}".format(obj)',
            # Subscript access patterns
            '"{.__builtins__[__import__]}".format(print)',
            '"{[__import__]}".format(__builtins__)',
            'fmt = "{.__class__}"',
            'fmt = "{.__builtins__}"; fmt.format(obj)',
        ]

        for code in dangerous_strings:
            with pytest.raises(SecurityViolationError) as exc_info:
                analyzer.validate(code)
            assert "disallowed" in exc_info.value.description.lower()

    def test_safe_format_strings_allowed(self, analyzer: TaskAnalyzer) -> None:
        safe_format_strings = [
            '"Hello {}".format(name)',
            '"{0} {1}".format(a, b)',
            '"{name}".format(name="world")',
            '"{.value}".format(obj)',
            '"{[key]}".format(data)',
            '"{:.2f}".format(3.14159)',
        ]

        for code in safe_format_strings:
            analyzer.validate(code)

    def test_escaped_braces_allowed(self, analyzer: TaskAnalyzer) -> None:
        safe_escaped = [
            '"{{.__class__}}".format()',
            '"{{.__builtins__}}".format()',
            '"{{.__globals__}}".format()',
        ]

        for code in safe_escaped:
            analyzer.validate(code)

    def test_fstring_blocked_attributes_detected(self, analyzer: TaskAnalyzer) -> None:
        exploit_attempts = [
            'f"{obj.__class__}"',
            'f"{fn.__globals__}"',
        ]

        for code in exploit_attempts:
            with pytest.raises(SecurityViolationError) as exc_info:
                analyzer.validate(code)
            assert "disallowed" in exc_info.value.description.lower()


class TestAllowAll(TestTaskAnalyzer):
    def test_allow_all_bypasses_validation(self) -> None:
        security_config = SecurityConfig(
            stdlib_allow={"*"},
            external_allow={"*"},
            builtins_deny=set(),
            runner_env_deny=True,
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
