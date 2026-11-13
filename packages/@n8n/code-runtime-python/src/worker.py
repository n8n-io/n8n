"""Worker of the `n8n-py` runtime of the code sandbox.

The code daemon starts it with a control socket on fd 3 (JSON lines), the
same protocol as the JS runtime (@n8n/code-runtime). The worker loads its
modules and sends `ready`. The first `start` message selects the mode:

- One task (`shared` false): the worker runs the task in its own process,
  writes `out/result.json`, sends `done` or `error` and exits.
- Shared (`shared` true, reuse mode): the worker is the one long-lived process
  of the sandbox. It forks a child process for each task, so each task starts
  from the loaded modules with a clean state, and a timeout kills only that
  child. The worker sends the messages and the console output of each child
  with its task id. A cancelled child is killed at once, so the worker answers
  `cancelled` with `clean: true` and stays usable.

Python tasks have no helpers that call n8n, so the worker sends no RPC calls.
"""

import codecs
import json
import os
import resource
import selectors
import signal
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import executor  # noqa: E402

CTRL_FD = 3
READ_SIZE = 64 * 1024
# The daemon cuts an `output` text longer than 64 KiB. Stay well below.
OUTPUT_CHUNK = 16 * 1024
# A child that sends a longer control line is killed.
MAX_CHILD_LINE = 64 * 1024 * 1024

# Modules that user code often imports. The shared worker loads them once, so
# an import in a task costs nothing. In one-task mode the spare worker loads
# them before the task arrives.
PRELOAD = (
    "base64",
    "collections",
    "copy",
    "csv",
    "datetime",
    "decimal",
    "functools",
    "hashlib",
    "itertools",
    "math",
    "operator",
    "random",
    "re",
    "statistics",
    "string",
    "textwrap",
    "time",
    "typing",
    "unicodedata",
    "urllib.parse",
    "uuid",
    "zoneinfo",
)


def preload():
    for name in PRELOAD:
        try:
            __import__(name)
        except ImportError:
            pass


def parse_args(argv):
    """Returns (task_memory_mb, kill_strays)."""
    task_memory_mb = 0
    kill_strays = False
    i = 0
    while i < len(argv):
        if argv[i] == "--kill-strays":
            kill_strays = True
            i += 1
            continue
        if argv[i] == "--task-memory-mb" and i + 1 < len(argv):
            try:
                task_memory_mb = int(argv[i + 1])
            except ValueError:
                task_memory_mb = 0
            i += 2
            continue
        i += 1
    return task_memory_mb, kill_strays


def limit_memory(task_memory_mb):
    """Lets the process allocate task_memory_mb more address space. Python
    raises MemoryError at the limit. The container memory limit stays the
    hard limit."""
    if task_memory_mb <= 0:
        return
    try:
        with open("/proc/self/statm") as f:
            pages = int(f.read().split()[0])
        current = pages * os.sysconf("SC_PAGE_SIZE")
        limit = current + task_memory_mb * 1024 * 1024
        resource.setrlimit(resource.RLIMIT_AS, (limit, limit))
    except (OSError, ValueError):
        pass


def write_all(fd, data):
    view = memoryview(data)
    while view:
        n = os.write(fd, view)
        view = view[n:]


def send(fd, message):
    write_all(fd, (json.dumps(message, ensure_ascii=False, default=str) + "\n").encode("utf-8"))


class LineBuffer:
    def __init__(self, limit=MAX_CHILD_LINE):
        self.pending = bytearray()
        self.limit = limit

    def feed(self, data):
        self.pending += data
        lines = []
        start = 0
        while True:
            nl = self.pending.find(b"\n", start)
            if nl == -1:
                break
            line = bytes(self.pending[start:nl]).strip()
            start = nl + 1
            if line:
                lines.append(line)
        del self.pending[:start]
        if len(self.pending) > self.limit:
            raise ValueError("control line too long")
        return lines


def ms(seconds):
    return round(seconds * 1000, 2)


def run_one(msg, out_fd, task_memory_mb):
    """Runs one task in this process and sends its terminal message to out_fd."""
    task_id = msg.get("taskId", "")
    task_dir = msg["dir"]
    t0 = time.perf_counter()
    limit_memory(task_memory_mb)
    try:
        with open(os.path.join(task_dir, "in", "task.json"), encoding="utf-8") as f:
            task = json.load(f)
        settings = task["settings"]
    except Exception as e:  # noqa: BLE001
        send(out_fd, {"type": "error", "taskId": task_id, "error": {"message": f"Invalid task: {e}"}})
        return
    t_read = time.perf_counter()
    res = executor.run_task(settings)
    t_run = time.perf_counter()
    timings = {"read": ms(t_read - t0), "build": 0, "run": ms(t_run - t_read), "binaryReads": 0, "rpcCount": 0, "rpcMs": 0}
    sys.stdout.flush()
    if not res.ok:
        error = dict(res.error)
        # n8n logs the print output of a failed task too, then removes this key.
        error["printArgs"] = res.print_args
        send(out_fd, {"type": "error", "taskId": task_id, "error": error, "timings": timings})
        return
    out_dir = os.path.join(task_dir, "out")
    os.makedirs(out_dir, exist_ok=True)
    with open(os.path.join(out_dir, "result.json"), "w", encoding="utf-8") as f:
        json.dump({"result": res.result, "printArgs": res.print_args}, f, default=str, ensure_ascii=False)
    timings["write"] = ms(time.perf_counter() - t_run)
    send(out_fd, {"type": "done", "taskId": task_id, "timings": timings})


def read_control_message():
    """Blocks until one control message arrives. Exits when the daemon closes fd 3."""
    buf = LineBuffer()
    while True:
        data = os.read(CTRL_FD, READ_SIZE)
        if not data:
            sys.exit(1)
        for line in buf.feed(data):
            try:
                return json.loads(line), buf
            except ValueError:
                continue


def main():
    task_memory_mb, kill_strays = parse_args(sys.argv[1:])
    preload()
    send(CTRL_FD, {"type": "ready"})
    msg, buf = read_control_message()
    while msg.get("type") != "start":
        # A cancel or an RPC result before the first task changes nothing.
        msg, buf = read_control_message()
    if msg.get("shared"):
        ForkServer(task_memory_mb, buf, kill_strays).run(msg)
        return
    run_one(msg, CTRL_FD, task_memory_mb)
    sys.stdout.flush()
    sys.stderr.flush()
    os._exit(0)


class Child:
    def __init__(self, pid, task_id, fds):
        self.pid = pid
        self.task_id = task_id
        # fd -> "msg" | "stdout" | "stderr"
        self.fds = fds
        self.msgs = LineBuffer()
        self.decoders = {
            "stdout": codecs.getincrementaldecoder("utf-8")("replace"),
            "stderr": codecs.getincrementaldecoder("utf-8")("replace"),
        }
        self.finished = False
        self.killed = False


class ForkServer:
    """The shared worker: one child process per task."""

    def __init__(self, task_memory_mb, ctrl_buf, kill_strays=False):
        self.task_memory_mb = task_memory_mb
        # Only in the sandbox: it kills every process outside the allowed
        # set, which is only safe in the PID namespace of the sandbox.
        self.kill_strays_on = kill_strays
        self.ctrl_buf = ctrl_buf
        self.sel = selectors.DefaultSelector()
        self.children = {}  # task id -> Child (running)
        self.by_pid = {}  # pid -> Child (not reaped)
        self.by_fd = {}  # fd -> Child
        self.served = 0

    def run(self, first):
        # Children cannot ptrace this process or read its memory, so a task
        # cannot take over the control socket of the daemon.
        set_not_dumpable()
        wake_r, wake_w = os.pipe()
        os.set_blocking(wake_r, False)
        os.set_blocking(wake_w, False)
        signal.set_wakeup_fd(wake_w)
        signal.signal(signal.SIGCHLD, lambda *_: None)
        self.sel.register(CTRL_FD, selectors.EVENT_READ, "ctrl")
        self.sel.register(wake_r, selectors.EVENT_READ, "wake")
        self.on_control(first)
        while True:
            for key, _ in self.sel.select():
                if key.data == "ctrl":
                    data = os.read(CTRL_FD, READ_SIZE)
                    if not data:
                        self.shutdown()
                        return
                    for line in self.ctrl_buf.feed(data):
                        try:
                            self.on_control(json.loads(line))
                        except ValueError:
                            continue
                elif key.data == "wake":
                    try:
                        while os.read(wake_r, READ_SIZE):
                            pass
                    except BlockingIOError:
                        pass
                    self.reap()
                else:
                    self.on_child_fd(key.fd)
            # A SIGCHLD can arrive between select calls; reaping is cheap.
            self.reap()

    def on_control(self, msg):
        kind = msg.get("type")
        if kind == "start":
            self.start(msg)
        elif kind == "cancel":
            self.cancel(msg.get("taskId", ""))

    def start(self, msg):
        task_id = msg.get("taskId", "")
        if task_id in self.children:
            return
        msg_r, msg_w = os.pipe()
        out_r, out_w = os.pipe()
        err_r, err_w = os.pipe()
        sys.stdout.flush()
        sys.stderr.flush()
        pid = os.fork()
        if pid == 0:
            self.child_main(msg, msg_w, out_w, err_w)
        try:
            os.setpgid(pid, pid)
        except OSError:
            pass
        for fd in (msg_w, out_w, err_w):
            os.close(fd)
        self.served += 1
        child = Child(pid, task_id, {msg_r: "msg", out_r: "stdout", err_r: "stderr"})
        self.children[task_id] = child
        self.by_pid[pid] = child
        for fd in child.fds:
            os.set_blocking(fd, False)
            self.by_fd[fd] = child
            self.sel.register(fd, selectors.EVENT_READ, "child")

    def child_main(self, msg, msg_w, out_w, err_w):
        try:
            os.setpgid(0, 0)
            signal.set_wakeup_fd(-1)
            signal.signal(signal.SIGCHLD, signal.SIG_DFL)
            os.dup2(out_w, 1)
            os.dup2(err_w, 2)
            # fd 3 becomes the message pipe of this child. The control socket
            # of the daemon, the pipes of other children and the selector are
            # closed, so a task cannot reach them.
            os.dup2(msg_w, CTRL_FD)
            close_fds_above(CTRL_FD)
            run_one(msg, CTRL_FD, self.task_memory_mb)
            sys.stdout.flush()
            sys.stderr.flush()
        except BaseException:  # noqa: BLE001
            pass
        finally:
            os._exit(0)

    def on_child_fd(self, fd):
        child = self.by_fd.get(fd)
        if child is None:
            return
        try:
            data = os.read(fd, READ_SIZE)
        except BlockingIOError:
            return
        except OSError:
            data = b""
        if not data:
            self.close_fd(fd)
            return
        self.on_child_data(child, child.fds[fd], data)

    def on_child_data(self, child, kind, data):
        if child.finished:
            return
        if kind != "msg":
            self.forward_output(child, kind, child.decoders[kind].decode(data))
            return
        try:
            lines = child.msgs.feed(data)
        except ValueError:
            self.finish(child, {"type": "failed", "outcome": "crashed", "text": "task sent a control line that is too long"})
            return
        for line in lines:
            try:
                m = json.loads(line)
            except ValueError:
                continue
            if m.get("type") in ("done", "error"):
                self.finish(child, m)
                return

    def forward_output(self, child, stream, text):
        start = 0
        while start < len(text):
            part = text[start : start + OUTPUT_CHUNK]
            start += len(part)
            send(CTRL_FD, {"type": "output", "taskId": child.task_id, "stream": stream, "text": part})

    def drain(self, child):
        """Reads what the child wrote before its last message or its exit."""
        for fd, kind in list(child.fds.items()):
            if kind == "msg":
                continue
            while True:
                try:
                    data = os.read(fd, READ_SIZE)
                except (BlockingIOError, OSError):
                    break
                if not data:
                    break
                self.forward_output(child, kind, child.decoders[kind].decode(data))
            tail = child.decoders[kind].decode(b"", final=True)
            if tail:
                self.forward_output(child, kind, tail)

    def finish(self, child, terminal):
        """Sends the terminal message of the task and stops its processes."""
        if child.finished:
            return
        self.drain(child)
        child.finished = True
        terminal = dict(terminal)
        # The worker sets the task id. A task cannot answer for another one.
        terminal["taskId"] = child.task_id
        if terminal.get("type") == "done":
            terminal.setdefault("timings", {})["workerTasks"] = self.served
        send(CTRL_FD, terminal)
        self.kill_group(child)
        self.close_child(child)
        self.kill_strays()

    def kill_group(self, child):
        # The child is not reaped yet, so its pid still names its group.
        if child.pid in self.by_pid and not child.killed:
            child.killed = True
            try:
                os.killpg(child.pid, signal.SIGKILL)
            except OSError:
                pass

    def close_child(self, child):
        for fd in list(child.fds):
            self.close_fd(fd)
        if self.children.get(child.task_id) is child:
            del self.children[child.task_id]

    def close_fd(self, fd):
        child = self.by_fd.pop(fd, None)
        try:
            self.sel.unregister(fd)
        except (KeyError, ValueError):
            pass
        try:
            os.close(fd)
        except OSError:
            pass
        if child is not None:
            child.fds.pop(fd, None)

    def cancel(self, task_id):
        child = self.children.get(task_id)
        if child is not None and not child.finished:
            child.finished = True
            self.kill_group(child)
            self.close_child(child)
        # SIGKILL ends the process group of the task, and kill_strays ends
        # processes of the task that left the group (setsid, setpgid).
        self.kill_strays()
        send(CTRL_FD, {"type": "cancelled", "taskId": task_id, "clean": True})

    def kill_strays(self):
        """Kills the processes of ended tasks that left their process group.
        Only tini (pid 1), the daemon, this worker and the process groups of
        running tasks may live. Processes of a running task that left its group
        are killed too: they cannot be told apart."""
        if not self.kill_strays_on:
            return
        keep_pids = {1, os.getpid(), os.getppid()}
        keep_groups = {c.pid for c in self.children.values() if not c.finished}
        for pid, pgid in list_processes():
            if pid in keep_pids or pgid in keep_groups:
                continue
            try:
                os.kill(pid, signal.SIGKILL)
            except OSError:
                pass

    def reap(self):
        while True:
            pid, status = self.next_exited()
            if not pid:
                return
            child = self.by_pid.get(pid)
            if child is None:
                continue
            if not child.finished:
                # Read the last message before the exit counts as a crash.
                for fd, kind in list(child.fds.items()):
                    if kind == "msg":
                        while not child.finished:
                            try:
                                data = os.read(fd, READ_SIZE)
                            except (BlockingIOError, OSError):
                                break
                            if not data:
                                break
                            self.on_child_data(child, "msg", data)
            if not child.finished:
                self.finish(child, crash_message(status, child.killed))
            del self.by_pid[pid]

    @staticmethod
    def next_exited():
        """Reaps one exited child. Returns (pid, status), or (0, 0)."""
        if hasattr(os, "waitid"):
            try:
                info = os.waitid(os.P_ALL, 0, os.WEXITED | os.WNOHANG | os.WNOWAIT)
            except ChildProcessError:
                return 0, 0
            if info is None or not info.si_pid:
                return 0, 0
            pid = info.si_pid
            # Strays of the task (processes that it started) die with it. The
            # child is not reaped yet, so its pid still names the group.
            try:
                os.killpg(pid, signal.SIGKILL)
            except OSError:
                pass
            try:
                return os.waitpid(pid, 0)
            except ChildProcessError:
                return 0, 0
        try:
            return os.waitpid(-1, os.WNOHANG)
        except ChildProcessError:
            return 0, 0

    def shutdown(self):
        for child in list(self.by_pid.values()):
            self.kill_group(child)
        os._exit(0)


def list_processes():
    """(pid, pgid) of the processes in /proc. Empty without /proc."""
    out = []
    try:
        names = os.listdir("/proc")
    except OSError:
        return out
    for name in names:
        if not name.isdigit():
            continue
        try:
            with open(f"/proc/{name}/stat", "rb") as f:
                stat = f.read()
            # The command name is in parentheses and can hold spaces.
            fields = stat[stat.rindex(b")") + 2 :].split()
            out.append((int(name), int(fields[2])))
        except (OSError, ValueError, IndexError):
            continue
    return out


def set_not_dumpable():
    try:
        import ctypes

        libc = ctypes.CDLL(None, use_errno=True)
        pr_set_dumpable = 4
        libc.prctl(pr_set_dumpable, 0, 0, 0, 0)
    except (OSError, AttributeError):
        pass


def close_fds_above(low):
    """Closes the open fds above low. os.closerange loops over every possible
    fd on musl (no close_range wrapper), which takes about 10 ms."""
    for fd_dir in ("/proc/self/fd", "/dev/fd"):
        try:
            fds = [int(name) for name in os.listdir(fd_dir)]
        except (OSError, ValueError):
            continue
        for fd in fds:
            if fd > low:
                try:
                    os.close(fd)
                except OSError:
                    pass
        return
    os.closerange(low + 1, 1 << 16)


def crash_message(status, killed_by_worker):
    if os.WIFSIGNALED(status):
        sig = os.WTERMSIG(status)
        # The worker did not kill it, so the kernel OOM killer is the likely cause.
        if sig == signal.SIGKILL and not killed_by_worker:
            return {"type": "failed", "outcome": "oom", "text": "task process was killed (out of memory)"}
        return {"type": "failed", "outcome": "crashed", "text": f"task process was killed by signal {sig}"}
    return {"type": "failed", "outcome": "crashed", "text": f"task process exited with code {os.WEXITSTATUS(status)}"}


if __name__ == "__main__":
    main()
