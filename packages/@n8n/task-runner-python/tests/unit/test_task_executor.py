import ast
import pytest
import json
from unittest.mock import MagicMock, patch

from src.task_executor import (
    TaskExecutor,
    FormatGuardTransformer,
    _safe_format,
    _validate_format_template,
)
from src.pipe_reader import PipeReader
from src.errors import (
    SecurityViolationError,
    TaskCancelledError,
    TaskKilledError,
    TaskSubprocessFailedError,
)
from src.constants import (
    EXECUTOR_SAFE_FORMAT_KEY,
    PIPE_MSG_PREFIX_LENGTH,
    SIGKILL_EXIT_CODE,
    SIGTERM_EXIT_CODE,
)
from src.config.security_config import SecurityConfig
from src.message_types.pipe import (
    PipeResultMessage,
    PipeErrorMessage,
    TaskErrorInfo,
)


class TestTaskExecutorProcessExitHandling:
    def test_sigterm_raises_task_cancelled_error(self):
        process = MagicMock()
        process.is_alive.return_value = False
        process.exitcode = SIGTERM_EXIT_CODE

        read_conn = MagicMock()
        write_conn = MagicMock()
        read_conn.fileno.return_value = 999

        with pytest.raises(TaskCancelledError):
            TaskExecutor.execute_process(
                process=process,
                read_conn=read_conn,
                write_conn=write_conn,
                task_timeout=60,
                pipe_reader_timeout=3.0,
                continue_on_fail=False,
            )

    def test_sigkill_raises_task_killed_error(self):
        process = MagicMock()
        process.is_alive.return_value = False
        process.exitcode = SIGKILL_EXIT_CODE

        read_conn = MagicMock()
        write_conn = MagicMock()
        read_conn.fileno.return_value = 999

        with pytest.raises(TaskKilledError):
            TaskExecutor.execute_process(
                process=process,
                read_conn=read_conn,
                write_conn=write_conn,
                task_timeout=60,
                pipe_reader_timeout=3.0,
                continue_on_fail=False,
            )

    def test_other_non_zero_exit_code_raises_task_subprocess_failed_error(self):
        process = MagicMock()
        process.is_alive.return_value = False
        process.exitcode = -1  # Some other error code

        read_conn = MagicMock()
        write_conn = MagicMock()
        read_conn.fileno.return_value = 999

        with pytest.raises(TaskSubprocessFailedError) as exc_info:
            TaskExecutor.execute_process(
                process=process,
                read_conn=read_conn,
                write_conn=write_conn,
                task_timeout=60,
                pipe_reader_timeout=3.0,
                continue_on_fail=False,
            )

        assert exc_info.value.exit_code == -1

    def test_zero_exit_code_with_empty_pipe_raises_task_result_read_error(self):
        from src.errors import TaskResultReadError

        process = MagicMock()
        process.is_alive.return_value = False
        process.exitcode = 0

        read_conn = MagicMock()
        write_conn = MagicMock()
        read_conn.fileno.return_value = 999

        with pytest.raises(TaskResultReadError):
            TaskExecutor.execute_process(
                process=process,
                read_conn=read_conn,
                write_conn=write_conn,
                task_timeout=60,
                pipe_reader_timeout=3.0,
                continue_on_fail=False,
            )


class TestTaskExecutorPipeCommunication:
    @patch("os.read")
    def test_successful_result_communication(self, mock_os_read):
        result_data: PipeResultMessage = {
            "result": [{"json": {"foo": "bar"}}],
            "print_args": [],
        }
        result_json = json.dumps(result_data).encode("utf-8")
        result_length = len(result_json).to_bytes(PIPE_MSG_PREFIX_LENGTH, "big")

        mock_os_read.side_effect = [result_length, result_json]

        process = MagicMock()
        process.is_alive.return_value = False
        process.exitcode = 0

        read_conn = MagicMock()
        write_conn = MagicMock()
        read_conn.fileno.return_value = 999

        result, print_args, size = TaskExecutor.execute_process(
            process=process,
            read_conn=read_conn,
            write_conn=write_conn,
            task_timeout=60,
            pipe_reader_timeout=3.0,
            continue_on_fail=False,
        )

        assert result == [{"json": {"foo": "bar"}}]
        assert print_args == []
        assert size == len(result_json)

    @patch("os.read")
    def test_successful_error_communication(self, mock_os_read):
        from src.errors import TaskRuntimeError

        error_info: TaskErrorInfo = {
            "message": "Test error",
            "description": "",
            "stack": "traceback...",
            "stderr": "",
        }
        error_data: PipeErrorMessage = {
            "error": error_info,
            "print_args": [],
        }
        error_json = json.dumps(error_data).encode("utf-8")
        error_length = len(error_json).to_bytes(PIPE_MSG_PREFIX_LENGTH, "big")

        mock_os_read.side_effect = [error_length, error_json]

        process = MagicMock()
        process.is_alive.return_value = False
        process.exitcode = 0

        read_conn = MagicMock()
        write_conn = MagicMock()
        read_conn.fileno.return_value = 999

        with pytest.raises(TaskRuntimeError) as exc_info:
            TaskExecutor.execute_process(
                process=process,
                read_conn=read_conn,
                write_conn=write_conn,
                task_timeout=60,
                pipe_reader_timeout=3.0,
                continue_on_fail=False,
            )

        assert str(exc_info.value) == "Test error"
        assert exc_info.value.stack_trace == "traceback..."


class TestTaskExecutorLowLevelIO:
    @patch("os.read")
    def test_read_exact_bytes_single_read(self, mock_os_read):
        data = b"test data"
        mock_os_read.return_value = data

        result = PipeReader._read_exact_bytes(999, len(data))

        assert result == data
        mock_os_read.assert_called_once_with(999, len(data))

    @patch("os.read")
    def test_read_exact_bytes_multiple_reads(self, mock_os_read):
        mock_os_read.side_effect = [b"test", b" ", b"data"]

        result = PipeReader._read_exact_bytes(999, 9)

        assert result == b"test data"
        assert mock_os_read.call_count == 3

    @patch("os.read")
    def test_read_exact_bytes_eof_error(self, mock_os_read):
        mock_os_read.side_effect = [b"test", b""]  # empty for EOF

        with pytest.raises(EOFError, match="Pipe closed before reading all data"):
            PipeReader._read_exact_bytes(999, 10)

    @patch("os.write")
    def test_write_bytes_write_failure(self, mock_os_write):
        mock_os_write.return_value = 0

        with pytest.raises(OSError, match="Write failed"):
            TaskExecutor._write_bytes(999, b"test data")


class TestFilterBuiltins:
    def _make_security_config(self) -> SecurityConfig:
        return SecurityConfig(
            stdlib_allow=set(),
            external_allow=set(),
            builtins_deny=set(),
            runner_env_deny=False,
        )

    def test_returns_mapping_proxy(self):
        result = TaskExecutor._filter_builtins(self._make_security_config())

        assert result["__import__"] is not None
        assert result["len"] is len
        assert "len" in result

    def test_supports_attribute_access(self):
        result = TaskExecutor._filter_builtins(self._make_security_config())

        assert result.__import__ is not None
        assert result.len is len

    def test_is_not_a_dict(self):
        result = TaskExecutor._filter_builtins(self._make_security_config())

        assert not isinstance(result, dict)

    @pytest.mark.parametrize(
        "name,mutate,expected",
        [
            (
                "item_assignment",
                lambda r: r.__setitem__("len", None),
                (TypeError, AttributeError),
            ),
            (
                "attribute_assignment",
                lambda r: setattr(r, "__import__", None),
                AttributeError,
            ),
            (
                "dict_class_setitem",
                lambda r: dict.__setitem__(r, "len", None),
                TypeError,
            ),
            ("dict_class_init", lambda r: dict.__init__(r, {"pwned": True}), TypeError),
            ("dict_class_update", lambda r: dict.update(r, {"len": None}), TypeError),
            ("dict_class_clear", lambda r: dict.clear(r), TypeError),
            ("class_swap", lambda r: setattr(r, "__class__", dict), AttributeError),
            ("vars_injection", lambda r: vars(r), TypeError),
            (
                "object_setattr",
                lambda r: object.__setattr__(r, "_x", {"pwned": True}),
                AttributeError,
            ),
        ],
    )
    def test_rejects_mutation(self, name, mutate, expected):
        result = TaskExecutor._filter_builtins(self._make_security_config())

        with pytest.raises(expected):
            mutate(result)

    def test_applies_builtins_deny(self):
        config = SecurityConfig(
            stdlib_allow=set(),
            external_allow=set(),
            builtins_deny={"open", "eval"},
            runner_env_deny=False,
        )
        result = TaskExecutor._filter_builtins(config)

        assert "open" not in result
        assert "eval" not in result
        assert "len" in result
        assert result["__import__"] is not None


def _run_with_guard(code: str, namespace: dict | None = None) -> dict:
    tree = ast.parse(code)
    transformed = FormatGuardTransformer().visit(tree)
    ast.fix_missing_locations(transformed)
    ns: dict = {EXECUTOR_SAFE_FORMAT_KEY: _safe_format}
    if namespace:
        ns.update(namespace)
    exec(compile(transformed, "<test>", "exec"), ns)
    return ns


class TestValidateFormatTemplate:
    def test_safe_templates_pass(self):
        safe = [
            "",
            "no fields here",
            "{}",
            "{0}",
            "{name}",
            "{0.value}",
            "{0[key]}",
            "{:.2f}",
            "{{not a field}}",
            "{0!r:>10}",
        ]
        for template in safe:
            _validate_format_template(template)  # should not raise

    @pytest.mark.parametrize(
        "template,token",
        [
            ("{0.__class__}", "__class__"),
            ("{0.__globals__}", "__globals__"),
            ("{0.__class__.__bases__}", "__class__"),
            ("{0.__globals__[__builtins__]}", "__globals__"),
            ("{0[__builtins__]}", "__builtins__"),
            ("{0['__builtins__']}", "__builtins__"),
            ('{0["__import__"]}', "__import__"),
        ],
    )
    def test_blocked_tokens_rejected(self, template, token):
        with pytest.raises(SecurityViolationError) as exc_info:
            _validate_format_template(template)
        assert token in exc_info.value.description


class TestSafeFormatGuard:
    def test_str_receiver_safe_template(self):
        result = _safe_format("format", "Hello {}", "world")
        assert result == "Hello world"

    def test_str_receiver_blocked_template(self):
        with pytest.raises(SecurityViolationError):
            _safe_format("format", "{0.__globals__}", lambda: None)

    def test_format_map_blocked_template(self):
        with pytest.raises(SecurityViolationError):
            _safe_format("format_map", "{0.__class__}", {0: object()})

    def test_nested_format_spec_blocked_template(self):
        with pytest.raises(SecurityViolationError):
            _safe_format("format", "{x:{y.__class__}}", x="a", y=object())

    def test_nested_format_spec_blocked_subscript_template(self):
        with pytest.raises(SecurityViolationError):
            _safe_format(
                "format",
                "{x:{y[__globals__]}}",
                x="a",
                y={"__globals__": ""},
            )

    def test_str_class_unbound_method_form(self):
        with pytest.raises(SecurityViolationError):
            _safe_format("format", str, "{0.__globals__}", lambda: None)

    def test_str_class_unbound_method_form_safe(self):
        result = _safe_format("format", str, "Hello {}", "world")
        assert result == "Hello world"

    def test_non_string_receiver_passes_through(self):
        class Custom:
            def format(self, *args):
                return ("custom", args)

        result = _safe_format("format", Custom(), "anything")
        assert result == ("custom", ("anything",))

    def test_kwarg_named_like_internal_param_passes_through(self):
        assert _safe_format("format", "{method_name}", method_name="ok") == "ok"
        assert _safe_format("format", "{receiver}", receiver="ok") == "ok"


class TestFormatGuardTransformer:
    def test_rewrites_format_method_call(self):
        tree = ast.parse('"hi {}".format(name)')
        FormatGuardTransformer().visit(tree)
        ast.fix_missing_locations(tree)
        rendered = ast.unparse(tree)
        assert EXECUTOR_SAFE_FORMAT_KEY in rendered
        assert ".format(" not in rendered

    def test_rewrites_format_map_method_call(self):
        tree = ast.parse('"hi {a}".format_map({"a": 1})')
        FormatGuardTransformer().visit(tree)
        ast.fix_missing_locations(tree)
        rendered = ast.unparse(tree)
        assert EXECUTOR_SAFE_FORMAT_KEY in rendered
        assert ".format_map(" not in rendered

    def test_leaves_unrelated_calls_untouched(self):
        tree = ast.parse('"abc".upper()')
        FormatGuardTransformer().visit(tree)
        ast.fix_missing_locations(tree)
        assert EXECUTOR_SAFE_FORMAT_KEY not in ast.unparse(tree)


class TestFormatGuardEndToEnd:
    def test_dynamic_template_with_blocked_token_rejected(self):
        code = """
d = chr(95) * 2
template = "{0." + d + "globals" + d + "}"
result = template.format(_target)
"""
        with pytest.raises(SecurityViolationError) as exc_info:
            _run_with_guard(code, {"_target": lambda: None})
        assert "__globals__" in exc_info.value.description

    def test_dynamic_template_using_join_rejected(self):
        code = """
parts = ["{0.", "_" * 2, "class", "_" * 2, "}"]
template = "".join(parts)
result = template.format(_target)
"""
        with pytest.raises(SecurityViolationError) as exc_info:
            _run_with_guard(code, {"_target": object()})
        assert "__class__" in exc_info.value.description

    def test_dynamic_template_subscript_form_rejected(self):
        code = """
d = chr(95) * 2
template = "{0." + d + "globals" + d + "[" + d + "builtins" + d + "]}"
result = template.format(_target)
"""
        with pytest.raises(SecurityViolationError) as exc_info:
            _run_with_guard(code, {"_target": lambda: None})
        # Either token reveals the rejection — both are in BLOCKED_NAMES.
        assert (
            "__globals__" in exc_info.value.description
            or "__builtins__" in exc_info.value.description
        )

    def test_dynamic_nested_format_spec_template_rejected(self):
        code = """
d = chr(95) * 2
template = "{x:{y." + d + "class" + d + "}}"
result = template.format(x="a", y=object())
"""
        with pytest.raises(SecurityViolationError) as exc_info:
            _run_with_guard(code)
        assert "__class__" in exc_info.value.description

    def test_str_class_unbound_form_rejected(self):
        code = """
d = chr(95) * 2
template = "{0." + d + "globals" + d + "}"
result = str.format(template, _target)
"""
        with pytest.raises(SecurityViolationError):
            _run_with_guard(code, {"_target": lambda: None})

    def test_safe_dynamic_template_still_works(self):
        code = """
template = "Hello, " + "{}!"
result = template.format("world")
"""
        ns = _run_with_guard(code)
        assert ns["result"] == "Hello, world!"

    def test_safe_inline_format_still_works(self):
        code = 'result = "{:.2f}".format(3.14159)'
        ns = _run_with_guard(code)
        assert ns["result"] == "3.14"

    def test_safe_format_map_still_works(self):
        code = 'result = "{a}-{b}".format_map({"a": 1, "b": 2})'
        ns = _run_with_guard(code)
        assert ns["result"] == "1-2"

    def test_user_kwarg_named_like_internal_param_works(self):
        code = (
            'result = "{method_name}-{receiver}".format(method_name="a", receiver="b")'
        )
        ns = _run_with_guard(code)
        assert ns["result"] == "a-b"

    def test_custom_format_method_passes_through(self):
        code = """
class Money:
    def __init__(self, value):
        self.value = value
    def format(self):
        return "$" + str(self.value)

result = Money(42).format()
"""
        ns = _run_with_guard(code)
        assert ns["result"] == "$42"


class TestCompileUserCode:
    def test_compiles_and_injects_guard(self):
        compiled = TaskExecutor._compile_user_code(
            'return "{}".format("ok")', "<inline>"
        )

        ns = {"__builtins__": __builtins__, EXECUTOR_SAFE_FORMAT_KEY: _safe_format}
        exec(compiled, ns)
        from src.constants import EXECUTOR_USER_OUTPUT_KEY

        assert ns[EXECUTOR_USER_OUTPUT_KEY] == "ok"

    def test_compiled_code_rejects_dynamic_blocked_template(self):
        raw = """
d = chr(95) * 2
template = "{0." + d + "globals" + d + "}"
return template.format(lambda: None)
"""
        compiled = TaskExecutor._compile_user_code(raw, "<inline>")
        ns = {"__builtins__": __builtins__, EXECUTOR_SAFE_FORMAT_KEY: _safe_format}
        with pytest.raises(SecurityViolationError):
            exec(compiled, ns)
