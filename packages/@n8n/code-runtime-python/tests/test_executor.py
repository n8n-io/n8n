import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

import executor  # noqa: E402


def settings(code, mode="runOnceForAllItems", items=None, **extra):
    return {"code": code, "nodeMode": mode, "items": items or [], **extra}


class AllItemsTest(unittest.TestCase):
    def test_returns_items(self):
        res = executor.run_task(settings("return _items", items=[{"json": {"a": 1}}]))
        self.assertTrue(res.ok)
        self.assertEqual(res.result, [{"json": {"a": 1}}])

    def test_query(self):
        res = executor.run_task(settings("return [{'json': {'q': _query}}]", query="hi"))
        self.assertEqual(res.result, [{"json": {"q": "hi"}}])

    def test_imports_are_not_restricted(self):
        # The task runner blocks imports by default. The sandbox is the boundary.
        res = executor.run_task(settings("import os, subprocess\nreturn [{'json': {'ok': True}}]"))
        self.assertTrue(res.ok, res.error)

    def test_print_args(self):
        res = executor.run_task(settings("print('a', 1, None, {'b': [1]})\nreturn []"))
        self.assertEqual(res.print_args, [["'a'", "1", "None", '{"b": [1]}']])

    def test_print_accepts_keywords(self):
        res = executor.run_task(settings("print('a', end='')\nreturn []"))
        self.assertTrue(res.ok, res.error)
        self.assertEqual(res.print_args, [["'a'"]])

    def test_print_truncated(self):
        res = executor.run_task(settings("for i in range(150):\n    print(i)\nreturn []"))
        self.assertEqual(len(res.print_args), 101)
        self.assertIn("50 more print statements", res.print_args[-1][0])

    def test_unserializable_print_arg(self):
        res = executor.run_task(settings("a = []\na.append(a)\nprint(a)\nreturn []"))
        self.assertEqual(res.print_args, [["[Circular list]"]])


class PerItemTest(unittest.TestCase):
    def test_per_item(self):
        items = [{"json": {"n": 1}}, {"json": {"n": 2}}, {"json": {"n": 3}}]
        code = "if _item['json']['n'] == 2:\n    return None\nreturn {'n': _item['json']['n'] * 10}"
        res = executor.run_task(settings(code, mode="runOnceForEachItem", items=items))
        self.assertEqual(
            res.result,
            [{"json": {"n": 10}, "pairedItem": {"item": 0}}, {"json": {"n": 30}, "pairedItem": {"item": 2}}],
        )

    def test_binary_is_kept(self):
        code = "return {'json': {'a': 1}, 'binary': {'data': {'id': 'x'}}}"
        res = executor.run_task(settings(code, mode="runOnceForEachItem", items=[{"json": {}}]))
        self.assertEqual(res.result[0]["binary"], {"data": {"id": "x"}})


class ErrorTest(unittest.TestCase):
    def test_user_error(self):
        res = executor.run_task(settings("print('before')\nraise ValueError('boom')"))
        self.assertFalse(res.ok)
        self.assertEqual(res.error["message"], "boom")
        self.assertIn("<all_items_task_execution>", res.error["stack"])
        self.assertEqual(res.print_args, [["'before'"]])

    def test_stderr_is_description(self):
        res = executor.run_task(settings("import sys\nsys.stderr.write('details')\nraise ValueError('boom')"))
        self.assertEqual(res.error["description"], "details")

    def test_system_exit(self):
        res = executor.run_task(settings("import sys\nsys.exit(3)"))
        self.assertEqual(res.error["message"], "Process exited with code 3")

    def test_syntax_error(self):
        res = executor.run_task(settings("x = 1\nreturn ("))
        self.assertFalse(res.ok)
        # Same message as the task runner: the line of the user code.
        self.assertIn("line 2", res.error["message"])

    def test_error_without_text(self):
        res = executor.run_task(settings("raise MemoryError()"))
        self.assertEqual(res.error["message"], "MemoryError")

    def test_continue_on_fail(self):
        res = executor.run_task(settings("raise ValueError('boom')", continueOnFail=True))
        self.assertTrue(res.ok)
        self.assertEqual(res.result, [{"json": {"error": "boom"}}])

    def test_unknown_mode(self):
        res = executor.run_task(settings("return []", mode="nope"))
        self.assertFalse(res.ok)


if __name__ == "__main__":
    unittest.main()
