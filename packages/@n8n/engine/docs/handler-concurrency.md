# Configure handler concurrency for the engine v2 spike

Set these variables on the process that hosts the engine v2 data plane:

| Variable | Default | Limit |
| --- | --- | --- |
| `N8N_ENGINE_STEP_CONCURRENCY` | `1` | In-flight `step:ready` handlers. |
| `N8N_ENGINE_ORCHESTRATION_CONCURRENCY` | `1` | In-flight execution start and `step:settled` handlers. |

Use positive integers. Invalid environment values produce a warning and use the
default. Restart the data plane process after a change. Both the standalone
engine and the integrated data plane use these settings.

For a comparison at five concurrent handlers per queue, set:

```sh
N8N_ENGINE_STEP_CONCURRENCY=5
N8N_ENGINE_ORCHESTRATION_CONCURRENCY=5
```

The limits apply to each process across all executions. They do not limit the
number of workflows in an instance. Handlers overlap asynchronous work on the
same JavaScript thread. CPU work does not run in parallel.

Each queue starts messages in publish order. When any handler settles, the
queue starts the next message if a slot is free. Completion order can differ
from publish order. A handler failure is logged and releases its slot.

On shutdown, the queues stop dispatching and wait for all active handlers.
Pending messages remain unconsumed. These queues use memory, so pending messages
are lost when the process exits.

Keep the serial defaults until concurrency validation is complete. Compare the
same I/O workload with limits of one, five, and 10. Record throughput, latency,
errors, and memory before selecting a higher default. This spike does not include
benchmark results.
