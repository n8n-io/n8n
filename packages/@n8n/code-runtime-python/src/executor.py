"""Runs the user code of one Python Code node task.

The semantics are the same as in the Python task runner
(packages/@n8n/task-runner-python/src/task_executor.py): the same code wrapper,
the same globals (`_items`, `_item`, `_query`), the same result shape, the same
print formatting and the same error shape. The difference: there are no
language guards (import allowlist, builtins denylist, format guard). The code
sandbox is the security boundary.
"""

import ast
import builtins
import io
import json
import sys
import textwrap
import traceback

# Same names as in the task runner, so stack frames and errors look the same.
USER_OUTPUT_KEY = "__n8n_internal_user_output__"
CIRCULAR_REFERENCE_KEY = "__n8n_internal_circular_ref__"
ALL_ITEMS_FILENAME = "<all_items_task_execution>"
PER_ITEM_FILENAME = "<per_item_task_execution>"

# The task runner keeps the first 100 print calls. Keep the same limit: the
# print output goes in one control message.
MAX_PRINT_ARGS_ALLOWED = 100

NODE_MODES = {
    "runOnceForAllItems": "all_items",
    "runOnceForEachItem": "per_item",
}


class TaskResult:
    """The outcome of a task: a result or an error, and the print output."""

    def __init__(self, ok, result=None, error=None, print_args=None):
        self.ok = ok
        self.result = result
        self.error = error
        self.print_args = print_args or []


def run_task(settings):
    """Runs the task. Never raises for errors of the user code."""
    print_args = []
    continue_on_fail = bool(settings.get("continueOnFail", False))
    try:
        # Like the task runner: parse the code as written first, so a syntax
        # error has the line numbers of the user code, not of the wrapper.
        ast.parse(settings.get("code") or "")
    except SyntaxError as e:
        # The task runner sends only the message, also with continueOnFail.
        return TaskResult(False, error={"message": str(e), "description": ""})
    stderr_capture = io.StringIO()
    real_stderr = sys.stderr
    # Like the task runner: stderr of the user code becomes the description of
    # its error. stdout stays the stdout of the process.
    sys.stderr = stderr_capture
    try:
        code = settings["code"]
        mode = NODE_MODES.get(settings.get("nodeMode"))
        if mode is None:
            raise ValueError(f"Unknown nodeMode: {settings.get('nodeMode')}")
        items = settings.get("items") or []
        if mode == "all_items":
            result = _all_items(code, items, settings.get("query"), print_args)
        else:
            result = _per_item(code, items, print_args)
        # Fail here, not later in n8n, if the result cannot be serialized.
        json.dumps(result, default=str, ensure_ascii=False)
        return TaskResult(True, result=result, print_args=_truncate(print_args))
    except BaseException as e:  # noqa: BLE001 - user code can raise anything
        error = _error_info(e, stderr_capture.getvalue())
        if continue_on_fail:
            return TaskResult(
                True,
                result=[{"json": {"error": error["message"]}}],
                print_args=_truncate(print_args),
            )
        return TaskResult(False, error=error, print_args=_truncate(print_args))
    finally:
        sys.stderr = real_stderr


def _all_items(code, items, query, print_args):
    compiled = compile_user_code(code, ALL_ITEMS_FILENAME)
    scope = {
        "__builtins__": builtins,
        "_items": items,
        "_query": query,
        "print": _make_print(print_args),
    }
    exec(compiled, scope)
    return scope[USER_OUTPUT_KEY]


def _per_item(code, items, print_args):
    compiled = compile_user_code(code, PER_ITEM_FILENAME)
    custom_print = _make_print(print_args)
    result = []
    for index, item in enumerate(items):
        scope = {"__builtins__": builtins, "_item": item, "print": custom_print}
        exec(compiled, scope)
        user_output = scope[USER_OUTPUT_KEY]
        if user_output is None:
            continue
        output_item = {"json": _extract_json(user_output), "pairedItem": {"item": index}}
        if isinstance(user_output, dict) and "binary" in user_output:
            output_item["binary"] = user_output["binary"]
        result.append(output_item)
    return result


def compile_user_code(raw_code, filename):
    indented = textwrap.indent(raw_code, "    ")
    wrapped = f"def _user_function():\n{indented}\n\n{USER_OUTPUT_KEY} = _user_function()"
    return compile(wrapped, filename, "exec")


def _extract_json(user_output):
    if not isinstance(user_output, dict):
        return user_output
    if "json" in user_output:
        return user_output["json"]
    if "binary" in user_output:
        return {k: v for k, v in user_output.items() if k != "binary"}
    return user_output


def _error_info(e, stderr):
    message = f"Process exited with code {e.code}" if isinstance(e, SystemExit) else str(e)
    # MemoryError and bare raises have no text; the task runner shows an empty message.
    message = message or type(e).__name__
    # The task runner sends `message` and `description` to n8n. The
    # description is the error's own description, else the captured stderr.
    return {
        "message": message,
        "description": getattr(e, "description", "") or stderr,
        "stack": traceback.format_exc(),
    }


# ========== print() ==========


def _make_print(print_args):
    def n8n_print(*args, **_kwargs):
        serializable = []
        for arg in args:
            try:
                json.dumps(arg, default=str, ensure_ascii=False)
                serializable.append(arg)
            except Exception:  # noqa: BLE001
                serializable.append({CIRCULAR_REFERENCE_KEY: repr(arg), "__type__": type(arg).__name__})
        print_args.append(format_print_args(*serializable))

    n8n_print.__name__ = "print"
    return n8n_print


def format_print_args(*args):
    """Same as TaskExecutor._format_print_args in the task runner."""
    formatted = []
    for arg in args:
        if isinstance(arg, str):
            formatted.append(f"'{arg}'")
        elif arg is None or isinstance(arg, (int, float, bool)):
            formatted.append(str(arg))
        elif isinstance(arg, dict) and CIRCULAR_REFERENCE_KEY in arg:
            formatted.append(f"[Circular {arg.get('__type__', 'Object')}]")
        else:
            formatted.append(json.dumps(arg, default=str, ensure_ascii=False))
    return formatted


def _truncate(print_args):
    if len(print_args) <= MAX_PRINT_ARGS_ALLOWED:
        return print_args
    truncated = print_args[:MAX_PRINT_ARGS_ALLOWED]
    truncated.append(
        [f"[Output truncated - {len(print_args) - MAX_PRINT_ARGS_ALLOWED} more print statements]"]
    )
    return truncated
