# @n8n/code-runtime-python (spike)

The Python runtime (`n8n-py`) of the code sandbox image. The code daemon of the
sandbox service starts `src/worker.py` with a control socket on fd 3. The
protocol is the same as for the JS runtime (`@n8n/code-runtime`).

| File | Purpose |
|---|---|
| `src/executor.py` | Runs the user code of one task. Same semantics as the Python task runner (`task_executor.py`): code wrapper, `_items` / `_item` / `_query`, result shape, print formatting, error shape. No language guards: the sandbox is the security boundary. |
| `src/worker.py` | The worker protocol. One-task mode runs the task in the worker process. Shared mode (reuse) forks a child process per task from the loaded worker. |

## Modes

| Mode | Process per task | Cancel | Cost of a later task |
|---|---|---|---|
| One task (`N8N_CODE_SANDBOX_REUSE_WORKERS=false`) | New interpreter (the spare) | The daemon kills the process | Interpreter start |
| Shared (`N8N_CODE_SANDBOX_REUSE_WORKERS=true`) | Forked child of the worker | The worker kills the child, answers `cancelled` with `clean: true` | A fork (about 1 ms) |

In shared mode, each child:

- starts from the modules that the worker loaded, with a clean state. A change
  of a module or a global in one task is not seen by the next task.
- has its own process group. The worker kills the group when the task ends, so
  processes that the task started do not stay.
- gets a message pipe on fd 3. The control socket of the daemon and the pipes of
  other children are closed.
- gets an address space limit of `--task-memory-mb` (`{memoryPerTaskMb}`). At
  the limit, Python raises `MemoryError`.

`task.json` holds `{ taskId, language: "python", settings }`. `settings` is what
the Code node gives to `startJob('python')`. `out/result.json` holds
`{ result, printArgs }`. n8n logs `printArgs` to the node output, like the task
runner. A failed task sends `printArgs` in its error.

## Tests

```sh
python3 -m unittest discover -s tests
```
