"""Runs worker.py as the code daemon does: a socketpair on fd 3, JSON lines."""

import json
import os
import socket
import subprocess
import sys
import tempfile
import threading
import time
import unittest

WORKER = os.path.join(os.path.dirname(__file__), "..", "src", "worker.py")


class FakeDaemon:
    def __init__(self, task_memory_mb=256, kill_strays=False):
        self.parent, child = socket.socketpair()
        extra = ["--kill-strays"] if kill_strays else []
        self.proc = subprocess.Popen(
            [sys.executable, "-I", "-B", WORKER, "--task-memory-mb", str(task_memory_mb), *extra],
            close_fds=False,
            preexec_fn=lambda: os.dup2(child.fileno(), 3),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        child.close()
        self.buf = b""
        self.msgs = []
        self.lock = threading.Condition()
        self.reader = threading.Thread(target=self._read, daemon=True)
        self.reader.start()
        self.root = tempfile.mkdtemp()

    def _read(self):
        while True:
            try:
                data = self.parent.recv(65536)
            except OSError:
                break
            if not data:
                break
            self.buf += data
            while b"\n" in self.buf:
                line, self.buf = self.buf.split(b"\n", 1)
                with self.lock:
                    self.msgs.append(json.loads(line))
                    self.lock.notify_all()

    def send(self, msg):
        self.parent.sendall((json.dumps(msg) + "\n").encode())

    def wait_for(self, pred, timeout=10):
        deadline = time.time() + timeout
        with self.lock:
            while True:
                for m in self.msgs:
                    if pred(m):
                        return m
                left = deadline - time.time()
                if left <= 0:
                    raise AssertionError(f"timeout; messages: {self.msgs}")
                self.lock.wait(left)

    def terminal(self, task_id, timeout=10):
        return self.wait_for(
            lambda m: m.get("taskId") == task_id and m["type"] in ("done", "error", "failed", "cancelled"),
            timeout,
        )

    def output(self, task_id):
        with self.lock:
            return "".join(m["text"] for m in self.msgs if m["type"] == "output" and m.get("taskId") == task_id)

    def start(self, task_id, code, shared, mode="runOnceForAllItems", items=None):
        d = os.path.join(self.root, task_id)
        os.makedirs(os.path.join(d, "in"))
        os.makedirs(os.path.join(d, "out"))
        with open(os.path.join(d, "in", "task.json"), "w") as f:
            json.dump({"taskId": task_id, "settings": {"code": code, "nodeMode": mode, "items": items or []}}, f)
        self.send({"type": "start", "taskId": task_id, "dir": d, "deadline": 0, "shared": shared})
        return d

    def result(self, d):
        with open(os.path.join(d, "out", "result.json")) as f:
            return json.load(f)

    def close(self):
        # shutdown first: on Linux, close does not end a recv that the reader
        # thread is blocked in, so the worker would not see the end of fd 3.
        try:
            self.parent.shutdown(socket.SHUT_RDWR)
        except OSError:
            pass
        self.parent.close()
        try:
            self.proc.wait(5)
        except subprocess.TimeoutExpired:
            self.proc.kill()
            self.proc.wait()
        self.proc.stdout.close()
        self.proc.stderr.close()


class OneTaskTest(unittest.TestCase):
    def test_done_and_exit(self):
        fd = FakeDaemon()
        try:
            fd.wait_for(lambda m: m["type"] == "ready")
            d = fd.start("t1", "print('hi')\nreturn [{'json': {'pid': __import__('os').getpid()}}]", shared=False)
            self.assertEqual(fd.terminal("t1")["type"], "done")
            res = fd.result(d)
            self.assertEqual(res["printArgs"], [["'hi'"]])
            self.assertEqual(res["result"][0]["json"]["pid"], fd.proc.pid)
            self.assertEqual(fd.proc.wait(5), 0)
        finally:
            fd.close()

    def test_error_carries_print_args(self):
        fd = FakeDaemon()
        try:
            fd.start("t1", "print('x')\nraise ValueError('boom')", shared=False)
            m = fd.terminal("t1")
            self.assertEqual(m["type"], "error")
            self.assertEqual(m["error"]["message"], "boom")
            self.assertEqual(m["error"]["printArgs"], [["'x'"]])
        finally:
            fd.close()

    def test_stdout_goes_to_the_pipe(self):
        fd = FakeDaemon()
        try:
            fd.start("t1", "import sys\nsys.stdout.write('raw\\n')\nreturn []", shared=False)
            fd.terminal("t1")
            self.assertEqual(fd.proc.stdout.read(), b"raw\n")
        finally:
            fd.close()


class SharedTest(unittest.TestCase):
    def setUp(self):
        self.fd = FakeDaemon()
        self.fd.wait_for(lambda m: m["type"] == "ready")

    def tearDown(self):
        self.fd.close()

    def test_tasks_run_in_children_with_a_clean_state(self):
        code = (
            "import os, json\n"
            "seen = getattr(json, 'marker', None)\n"
            "json.marker = 'set'\n"
            "print('task')\n"
            "return [{'json': {'pid': os.getpid(), 'seen': seen}}]"
        )
        pids = set()
        for i in range(3):
            d = self.fd.start(f"s{i}", code, shared=True)
            m = self.fd.terminal(f"s{i}")
            self.assertEqual(m["type"], "done", m)
            self.assertEqual(m["timings"]["workerTasks"], i + 1)
            res = self.fd.result(d)["result"][0]["json"]
            # A change of a module in one task is not seen by the next task.
            self.assertIsNone(res["seen"])
            pids.add(res["pid"])
        self.assertEqual(len(pids), 3)
        self.assertNotIn(self.fd.proc.pid, pids)

    def test_concurrent_tasks_and_output(self):
        code = "import time, sys\ntime.sleep(0.5)\nsys.stdout.write('out of %s\\n' % _items[0]['json']['n'])\nreturn _items"
        t0 = time.time()
        for i in range(2):
            self.fd.start(f"c{i}", code, shared=True, items=[{"json": {"n": i}}])
        for i in range(2):
            self.assertEqual(self.fd.terminal(f"c{i}")["type"], "done")
            self.assertEqual(self.fd.output(f"c{i}"), f"out of {i}\n")
        self.assertLess(time.time() - t0, 1.5)

    def test_cancel_is_clean(self):
        self.fd.start("h1", "import time\ntime.sleep(30)", shared=True)
        time.sleep(0.2)
        self.fd.send({"type": "cancel", "taskId": "h1"})
        m = self.fd.terminal("h1")
        self.assertEqual(m, {"type": "cancelled", "taskId": "h1", "clean": True})
        # The worker still takes tasks.
        self.fd.start("h2", "return []", shared=True)
        self.assertEqual(self.fd.terminal("h2")["type"], "done")

    def test_crash_and_strays(self):
        self.fd.start("x1", "import os\nos._exit(3)", shared=True)
        m = self.fd.terminal("x1")
        self.assertEqual((m["type"], m["outcome"]), ("failed", "crashed"))
        # A task that leaves a process behind: the process is killed.
        d = self.fd.start(
            "x2",
            "import subprocess\np = subprocess.Popen(['sleep', '30'])\nreturn [{'json': {'pid': p.pid}}]",
            shared=True,
        )
        self.assertEqual(self.fd.terminal("x2")["type"], "done")
        stray = self.fd.result(d)["result"][0]["json"]["pid"]
        deadline = time.time() + 5
        while time.time() < deadline:
            try:
                os.kill(stray, 0)
            except ProcessLookupError:
                break
            # A zombie that is not reaped yet still answers kill 0.
            if is_zombie(stray):
                break
            time.sleep(0.05)
        else:
            self.fail("stray process still runs")

    @unittest.skipUnless(
        os.environ.get("N8N_PY_RUNTIME_IN_SANDBOX") == "1",
        "kills all other processes: run only in the code sandbox image",
    )
    def test_processes_that_leave_the_group_are_killed(self):
        self.fd.close()
        self.fd = FakeDaemon(kill_strays=True)
        self.fd.wait_for(lambda m: m["type"] == "ready")
        code = (
            "import subprocess\n"
            "p = subprocess.Popen(['sleep', '30'], start_new_session=True)\n"
            "return [{'json': {'pid': p.pid}}]"
        )
        d = self.fd.start("k1", code, shared=True)
        self.assertEqual(self.fd.terminal("k1")["type"], "done")
        stray = self.fd.result(d)["result"][0]["json"]["pid"]
        deadline = time.time() + 5
        while time.time() < deadline and not is_zombie(stray):
            try:
                os.kill(stray, 0)
            except ProcessLookupError:
                break
            time.sleep(0.05)
        else:
            if not is_zombie(stray):
                self.fail("process in a new session still runs")

    def test_user_error(self):
        self.fd.start("e1", "raise KeyError('k')", shared=True)
        m = self.fd.terminal("e1")
        self.assertEqual(m["type"], "error")
        self.assertEqual(m["error"]["message"], "'k'")

    def test_control_socket_is_closed_in_children(self):
        code = "import os\ntry:\n    os.fstat(4)\n    return [{'json': {'fd4': True}}]\nexcept OSError:\n    return [{'json': {'fd4': False}}]"
        d = self.fd.start("f1", code, shared=True)
        self.assertEqual(self.fd.terminal("f1")["type"], "done")
        self.assertFalse(self.fd.result(d)["result"][0]["json"]["fd4"])


def is_zombie(pid):
    try:
        with open(f"/proc/{pid}/stat") as f:
            return f.read().split()[2] == "Z"
    except OSError:
        out = subprocess.run(["ps", "-o", "stat=", "-p", str(pid)], capture_output=True, text=True).stdout
        return out.strip().startswith("Z") or out.strip() == ""


if __name__ == "__main__":
    unittest.main()
