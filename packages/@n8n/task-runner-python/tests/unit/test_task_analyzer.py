import pytest

from src.errors.security_violation_error import SecurityViolationError
from src.task_analyzer import TaskAnalyzer
from src.config.security_config import SecurityConfig
from src.constants import (
    BLOCKED_ATTRIBUTES,
    BLOCKED_NAMES,
    EXECUTOR_SAFE_FORMAT_KEY,
)


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

    def test_objclass_attribute_blocked(self, analyzer: TaskAnalyzer) -> None:
        exploit_attempts = [
            "str.__or__.__objclass__",
            "str.__init__.__objclass__",
            "type_ref = str.__or__.__objclass__",
            "object_ref = str.__init__.__objclass__",
        ]

        for code in exploit_attempts:
            with pytest.raises(SecurityViolationError) as exc_info:
                analyzer.validate(code)
            assert "__objclass__" in exc_info.value.description

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

    def test_nested_format_spec_blocked_attributes_detected(
        self, analyzer: TaskAnalyzer
    ) -> None:
        nested_attempts = [
            '"{x:{y.__class__}}".format(x="a", y=obj)',
            '"{x:{y.__globals__}}".format(x="a", y=fn)',
            '"{0:{1.__class__}}".format("a", obj)',
            '"{x!r:>{y.__bases__}}".format(x="a", y=obj)',
            '"{a:{b}{c.__class__}}".format(a="x", b="y", c=obj)',
            '"{a:{b:{c.__class__}}}".format(a="x", b="y", c=obj)',
        ]

        for code in nested_attempts:
            with pytest.raises(SecurityViolationError) as exc_info:
                analyzer.validate(code)
            assert "disallowed" in exc_info.value.description.lower()

    def test_nested_format_spec_without_blocked_attributes_allowed(
        self, analyzer: TaskAnalyzer
    ) -> None:
        safe_nested = [
            '"{0:>{1}}".format("a", 10)',
            '"{x:{width}}".format(x="a", width=5)',
            '"{value:{spec}}".format(value=42, spec=".2f")',
        ]

        for code in safe_nested:
            analyzer.validate(code)


class TestFormatMethodAccess(TestTaskAnalyzer):
    def test_format_call_form_allowed(self, analyzer: TaskAnalyzer) -> None:
        allowed = [
            '"Hello {}".format(name)',
            '"{key}".format(key="value")',
            'template = "Hello {}"; template.format(name)',
            '"{}".format_map({"a": 1})',
            'f"{x}".format()',
        ]
        for code in allowed:
            analyzer.validate(code)

    def test_bare_format_extraction_blocked(self, analyzer: TaskAnalyzer) -> None:
        bare_extractions = [
            'f = "hello".format',
            "getter = template.format_map",
            "fn = obj.format",
            "return obj.format",
        ]
        for code in bare_extractions:
            with pytest.raises(SecurityViolationError) as exc_info:
                analyzer.validate(code)
            description = exc_info.value.description.lower()
            assert "format" in description
            assert "bound method" in description

    def test_format_method_in_call_chain_allowed(self, analyzer: TaskAnalyzer) -> None:
        chained = [
            '"a".format("b").upper()',
            '"{}".format("x").lower()',
        ]
        for code in chained:
            analyzer.validate(code)


class TestImportAliasValidation(TestTaskAnalyzer):
    def test_import_alias_using_blocked_name_rejected(
        self, analyzer: TaskAnalyzer
    ) -> None:
        for name in BLOCKED_NAMES:
            code = f"import json as {name}"
            with pytest.raises(SecurityViolationError) as exc_info:
                analyzer.validate(code)
            assert name in exc_info.value.description

    def test_from_import_alias_using_blocked_name_rejected(
        self, analyzer: TaskAnalyzer
    ) -> None:
        for name in BLOCKED_NAMES:
            code = f"from json import dumps as {name}"
            with pytest.raises(SecurityViolationError) as exc_info:
                analyzer.validate(code)
            assert name in exc_info.value.description

    def test_safe_import_aliases_allowed(self, analyzer: TaskAnalyzer) -> None:
        safe = [
            "import json as j",
            "from json import dumps as d",
            "from collections import Counter as C",
        ]
        for code in safe:
            analyzer.validate(code)


class TestExceptHandlerNameValidation(TestTaskAnalyzer):
    def test_except_handler_using_blocked_name_rejected(
        self, analyzer: TaskAnalyzer
    ) -> None:
        for name in BLOCKED_NAMES:
            code = f"""
try:
    pass
except Exception as {name}:
    pass
"""
            with pytest.raises(SecurityViolationError) as exc_info:
                analyzer.validate(code)
            assert name in exc_info.value.description

    def test_safe_except_handler_names_allowed(self, analyzer: TaskAnalyzer) -> None:
        safe = [
            "try:\n    pass\nexcept Exception as err:\n    pass",
            "try:\n    pass\nexcept (ValueError, TypeError) as e:\n    pass",
        ]
        for code in safe:
            analyzer.validate(code)


class TestRuntimeGuardName(TestTaskAnalyzer):
    """The runtime format guard is injected into user globals under a reserved
    name. User code must not be able to read, assign, or shadow it."""

    def test_runtime_guard_name_is_blocked(self) -> None:
        assert EXECUTOR_SAFE_FORMAT_KEY in BLOCKED_NAMES

    def test_reading_runtime_guard_name_blocked(self, analyzer: TaskAnalyzer) -> None:
        code = f"x = {EXECUTOR_SAFE_FORMAT_KEY}"
        with pytest.raises(SecurityViolationError) as exc_info:
            analyzer.validate(code)
        assert EXECUTOR_SAFE_FORMAT_KEY in exc_info.value.description

    def test_assigning_runtime_guard_name_blocked(self, analyzer: TaskAnalyzer) -> None:
        code = f"{EXECUTOR_SAFE_FORMAT_KEY} = lambda *a, **k: None"
        with pytest.raises(SecurityViolationError) as exc_info:
            analyzer.validate(code)
        assert EXECUTOR_SAFE_FORMAT_KEY in exc_info.value.description

    def test_import_alias_to_runtime_guard_name_blocked(
        self, analyzer: TaskAnalyzer
    ) -> None:
        code = f"import json as {EXECUTOR_SAFE_FORMAT_KEY}"
        with pytest.raises(SecurityViolationError) as exc_info:
            analyzer.validate(code)
        assert EXECUTOR_SAFE_FORMAT_KEY in exc_info.value.description

    def test_def_runtime_guard_name_blocked(self, analyzer: TaskAnalyzer) -> None:
        code = f"def {EXECUTOR_SAFE_FORMAT_KEY}(): pass"
        with pytest.raises(SecurityViolationError) as exc_info:
            analyzer.validate(code)
        assert EXECUTOR_SAFE_FORMAT_KEY in exc_info.value.description


class TestDynamicFormatTemplateBlocked(TestTaskAnalyzer):
    def test_method_extraction_via_dynamic_template_blocked(
        self, analyzer: TaskAnalyzer
    ) -> None:
        code = """
d = chr(95) * 2
template = "{0." + d + "globals" + d + "}"
caller = template.format
"""
        with pytest.raises(SecurityViolationError) as exc_info:
            analyzer.validate(code)
        assert "bound method" in exc_info.value.description.lower()


class TestMatchPatternValidation(TestTaskAnalyzer):
    def test_match_pattern_with_blocked_attributes_blocked(
        self, analyzer: TaskAnalyzer
    ) -> None:
        attempts = [
            """
ex = None
try:
    pass
except Exception as e:
    ex = e
match ex:
    case AttributeError(obj=rip):
        pass
""",
            """
match error:
    case ValueError(obj=x):
        pass
""",
            """
match e:
    case Exception(__traceback__=tb):
        pass
""",
        ]

        for code in attempts:
            with pytest.raises(SecurityViolationError) as exc_info:
                analyzer.validate(code)
            assert "disallowed" in exc_info.value.description.lower()

    def test_positional_match_patterns_blocked(self, analyzer: TaskAnalyzer) -> None:
        attempts = [
            """
match error:
    case ValueError(x):
        pass
""",
            """
match obj:
    case SomeClass(a, b):
        pass
""",
        ]

        for code in attempts:
            with pytest.raises(SecurityViolationError) as exc_info:
                analyzer.validate(code)
            assert "positional" in exc_info.value.description.lower()

    def test_safe_match_patterns_allowed(self, analyzer: TaskAnalyzer) -> None:
        safe_patterns = [
            """
match value:
    case 1:
        pass
    case "hello":
        pass
""",
            """
match point:
    case Point(x=x, y=y):
        pass
""",
            """
match data:
    case {"key": value}:
        pass
""",
            """
match result:
    case [first, *rest]:
        pass
""",
        ]

        for code in safe_patterns:
            analyzer.validate(code)


class TestGlobalStatementValidation(TestTaskAnalyzer):
    def test_global_builtins_blocked(self, analyzer: TaskAnalyzer) -> None:
        code = "global __builtins__"
        with pytest.raises(SecurityViolationError) as exc_info:
            analyzer.validate(code)
        assert "__builtins__" in exc_info.value.description

    def test_global_other_blocked_names(self, analyzer: TaskAnalyzer) -> None:
        for name in BLOCKED_NAMES:
            code = f"global {name}"
            with pytest.raises(SecurityViolationError) as exc_info:
                analyzer.validate(code)
            assert name in exc_info.value.description

    def test_global_safe_names_allowed(self, analyzer: TaskAnalyzer) -> None:
        safe = ["global x", "global my_var", "global counter"]
        for code in safe:
            analyzer.validate(code)


class TestFunctionDefNameValidation(TestTaskAnalyzer):
    def test_funcdef_builtins_blocked(self, analyzer: TaskAnalyzer) -> None:
        code = "def __builtins__(): pass"
        with pytest.raises(SecurityViolationError) as exc_info:
            analyzer.validate(code)
        assert "__builtins__" in exc_info.value.description

    def test_decorated_funcdef_builtins_blocked(self, analyzer: TaskAnalyzer) -> None:
        code = """\
@(lambda f: {})
def __builtins__(): pass
"""
        with pytest.raises(SecurityViolationError) as exc_info:
            analyzer.validate(code)
        assert "__builtins__" in exc_info.value.description

    def test_async_funcdef_builtins_blocked(self, analyzer: TaskAnalyzer) -> None:
        code = "async def __builtins__(): pass"
        with pytest.raises(SecurityViolationError) as exc_info:
            analyzer.validate(code)
        assert "__builtins__" in exc_info.value.description

    def test_funcdef_other_blocked_names(self, analyzer: TaskAnalyzer) -> None:
        for name in BLOCKED_NAMES:
            code = f"def {name}(): pass"
            with pytest.raises(SecurityViolationError) as exc_info:
                analyzer.validate(code)
            assert name in exc_info.value.description

    def test_async_funcdef_other_blocked_names(self, analyzer: TaskAnalyzer) -> None:
        for name in BLOCKED_NAMES:
            code = f"async def {name}(): pass"
            with pytest.raises(SecurityViolationError) as exc_info:
                analyzer.validate(code)
            assert name in exc_info.value.description

    def test_funcdef_safe_names_allowed(self, analyzer: TaskAnalyzer) -> None:
        safe = [
            "def my_func(): pass",
            "def helper(): pass",
            "async def fetch(): pass",
        ]
        for code in safe:
            analyzer.validate(code)


class TestFunctionParameterValidation(TestTaskAnalyzer):
    def test_function_positional_param_using_blocked_name_rejected(
        self, analyzer: TaskAnalyzer
    ) -> None:
        for name in BLOCKED_NAMES:
            code = f"def f({name}): pass"
            with pytest.raises(SecurityViolationError) as exc_info:
                analyzer.validate(code)
            assert name in exc_info.value.description

    def test_function_positional_only_param_using_blocked_name_rejected(
        self, analyzer: TaskAnalyzer
    ) -> None:
        for name in BLOCKED_NAMES:
            code = f"def f({name}, /): pass"
            with pytest.raises(SecurityViolationError) as exc_info:
                analyzer.validate(code)
            assert name in exc_info.value.description

    def test_function_keyword_only_param_using_blocked_name_rejected(
        self, analyzer: TaskAnalyzer
    ) -> None:
        for name in BLOCKED_NAMES:
            code = f"def f(*, {name}): pass"
            with pytest.raises(SecurityViolationError) as exc_info:
                analyzer.validate(code)
            assert name in exc_info.value.description

    def test_function_vararg_using_blocked_name_rejected(
        self, analyzer: TaskAnalyzer
    ) -> None:
        for name in BLOCKED_NAMES:
            code = f"def f(*{name}): pass"
            with pytest.raises(SecurityViolationError) as exc_info:
                analyzer.validate(code)
            assert name in exc_info.value.description

    def test_function_kwarg_using_blocked_name_rejected(
        self, analyzer: TaskAnalyzer
    ) -> None:
        for name in BLOCKED_NAMES:
            code = f"def f(**{name}): pass"
            with pytest.raises(SecurityViolationError) as exc_info:
                analyzer.validate(code)
            assert name in exc_info.value.description

    def test_function_param_with_default_using_blocked_name_rejected(
        self, analyzer: TaskAnalyzer
    ) -> None:
        for name in BLOCKED_NAMES:
            code = f"def f({name}=None): pass"
            with pytest.raises(SecurityViolationError) as exc_info:
                analyzer.validate(code)
            assert name in exc_info.value.description

    def test_async_function_param_using_blocked_name_rejected(
        self, analyzer: TaskAnalyzer
    ) -> None:
        for name in BLOCKED_NAMES:
            code = f"async def f({name}): pass"
            with pytest.raises(SecurityViolationError) as exc_info:
                analyzer.validate(code)
            assert name in exc_info.value.description

    def test_lambda_param_using_blocked_name_rejected(
        self, analyzer: TaskAnalyzer
    ) -> None:
        for name in BLOCKED_NAMES:
            code = f"f = lambda {name}: 0"
            with pytest.raises(SecurityViolationError) as exc_info:
                analyzer.validate(code)
            assert name in exc_info.value.description

    def test_safe_function_params_allowed(self, analyzer: TaskAnalyzer) -> None:
        safe = [
            "def f(x): pass",
            "def f(x, y, z): pass",
            "def f(x, /, y, *, z): pass",
            "def f(*args, **kwargs): pass",
            "def f(x=1, y=2): pass",
            "async def f(x): pass",
            "g = lambda x, y: x + y",
        ]
        for code in safe:
            analyzer.validate(code)

    def test_runtime_guard_name_as_param_rejected(self, analyzer: TaskAnalyzer) -> None:
        """A parameter named like the injected runtime guard would otherwise
        cause rewritten `.format()` calls inside that scope to resolve to the
        parameter instead of the guard."""

        shapes = [
            f"def f({EXECUTOR_SAFE_FORMAT_KEY}): return 1",
            f"def f(*{EXECUTOR_SAFE_FORMAT_KEY}): return 1",
            f"def f(**{EXECUTOR_SAFE_FORMAT_KEY}): return 1",
            f"async def f({EXECUTOR_SAFE_FORMAT_KEY}): return 1",
            f"g = lambda {EXECUTOR_SAFE_FORMAT_KEY}: 0",
        ]
        for code in shapes:
            with pytest.raises(SecurityViolationError) as exc_info:
                analyzer.validate(code)
            assert EXECUTOR_SAFE_FORMAT_KEY in exc_info.value.description


class TestClassDefNameValidation(TestTaskAnalyzer):
    def test_classdef_builtins_blocked(self, analyzer: TaskAnalyzer) -> None:
        code = "class __builtins__: pass"
        with pytest.raises(SecurityViolationError) as exc_info:
            analyzer.validate(code)
        assert "__builtins__" in exc_info.value.description

    def test_decorated_classdef_builtins_blocked(self, analyzer: TaskAnalyzer) -> None:
        code = """\
@(lambda c: c)
class __builtins__: pass
"""
        with pytest.raises(SecurityViolationError) as exc_info:
            analyzer.validate(code)
        assert "__builtins__" in exc_info.value.description

    def test_classdef_other_blocked_names(self, analyzer: TaskAnalyzer) -> None:
        for name in BLOCKED_NAMES:
            code = f"class {name}: pass"
            with pytest.raises(SecurityViolationError) as exc_info:
                analyzer.validate(code)
            assert name in exc_info.value.description

    def test_classdef_safe_names_allowed(self, analyzer: TaskAnalyzer) -> None:
        safe = [
            "class MyClass: pass",
            "class Helper: pass",
            "class Foo(Bar): pass",
        ]
        for code in safe:
            analyzer.validate(code)


class TestReduceBlocked(TestTaskAnalyzer):
    def test_reduce_blocked(self, analyzer: TaskAnalyzer) -> None:
        code = "obj.__reduce__()"
        with pytest.raises(SecurityViolationError):
            analyzer.validate(code)

    def test_reduce_ex_blocked(self, analyzer: TaskAnalyzer) -> None:
        code = "obj.__reduce_ex__(2)"
        with pytest.raises(SecurityViolationError):
            analyzer.validate(code)

    def test_prepare_blocked(self, analyzer: TaskAnalyzer) -> None:
        code = "obj.__prepare__()"
        with pytest.raises(SecurityViolationError):
            analyzer.validate(code)

    def test_instancecheck_blocked(self, analyzer: TaskAnalyzer) -> None:
        code = "obj.__instancecheck__(x)"
        with pytest.raises(SecurityViolationError):
            analyzer.validate(code)

    def test_match_args_blocked(self, analyzer: TaskAnalyzer) -> None:
        code = "obj.__match_args__"
        with pytest.raises(SecurityViolationError):
            analyzer.validate(code)


class TestFullExploitChainBlocked(TestTaskAnalyzer):
    def test_full_poc_blocked(self, analyzer: TaskAnalyzer) -> None:
        """The split-string literals intentionally sidestep the constant-string
        check; rejection comes from visit_MatchClass at the positional pattern."""
        poc = """\
_int = int
_repr = repr

global __builtins__

@(lambda f: {"getattr": lambda o, n, *d: None})
def __builtins__(): pass

_obj = _int.__init__.__reduce__()[1][0]
_type = _int.__prepare__.__reduce__()[1][0]

ic = "__instancech" + "eck__"
M = _type("M", (_type,), {ic: lambda c, i: True})
ma = "__match_ar" + "gs__"
sa = "__se" + "lf__"
E = M("E", (_obj,), {ma: (sa,)})

bm = None
match _repr:
    case E(bm):
        pass
"""
        with pytest.raises(SecurityViolationError):
            analyzer.validate(poc)


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
