# System tasks

A system task is background work that n8n runs on a schedule, such as a cleanup,
a refresh or a report. No workflow owns it.

Use a system task instead of `setInterval`, a cron library or
`@OnLeaderTakeover`. The runner then handles leadership, shutdown, retries,
metrics and tracing for you.

## Write one

```ts
@SystemTask()
export class ExpiredTokenCleanupTask implements SystemTask {
	readonly name = 'expired-token-cleanup';

	readonly schedule: SystemTaskSchedule = intervalFromSeconds(60);

	readonly target = { scope: 'cluster', scheduler: { maxAttempts: 3 } } satisfies SystemTaskTarget;

	constructor(private readonly tokens: TokenRepository) {}

	async run(signal: AbortSignal): Promise<void> {
		await this.tokens.deleteExpired(signal);
	}
}
```

1. `name` is unique across all system tasks. A duplicate stops startup.
2. `schedule` is an interval (`intervalFromSeconds`, `intervalFromMilliseconds`)
   or a cron expression.
3. `target` says where the task runs. See below.
4. `run` does one occurrence. Honor `signal`: it aborts on shutdown, on lease
   loss and at the timeout.

## Make it safe to run twice

The cluster runs each occurrence once, in the normal case. It does not guarantee
this. Two runs can overlap, or one occurrence can run again:

1. A main stops during a run. Its lease expires, and another main runs the
   occurrence again while attempts remain.
2. A run ignores its `signal` after a timeout or a lease loss. It keeps going
   while the next run starts.

So write `run()` to tolerate a second run at the same time:

1. Change rows with a condition, for example "delete the rows that expired",
   not "delete the rows I read before".
2. Work in small batches and check `signal` between them.
3. Set `maxAttempts: 1` when a repeat sends something twice, such as an email or
   a report. This stops retries, but it does not stop an overlap with a stalled run.

See [Aiming for exactly-once across a cluster](../../../../@n8n/scheduler/README.md#aiming-for-exactly-once-across-a-cluster)
for how the scheduler gets there.

## Choose where it runs

| The work... | Use |
|---|---|
| touches shared state, so one run for the whole cluster is enough | `scope: 'cluster'` with `scheduler` |
| touches the memory or disk of each process | `scope: 'instance'` with `instanceTypes` |

A cluster task runs on the durable scheduler. While the scheduler is disabled
(`N8N_SCHEDULER_SYSTEM_TASKS_ENABLED=false`), it runs on the leader's timer.
`leaderTimer` only tunes that fallback. It is deprecated and goes away when the
scheduler is the only runner.

## Scheduler options

| Option | Default | Set it when |
|---|---|---|
| `maxAttempts` | required | Always. Set `1` if running twice for one occurrence is not safe. |
| `missedAfterSeconds` | 60 | A late run is still useful for longer than a minute. |
| `catchUp` | `true` | A late run has no value after downtime. Set `false`. |
| `concurrencyLimit` | 1 | Occurrences may overlap. Use a number or `'unlimited'`. |
| `timeoutSeconds` | `N8N_SCHEDULER_TASK_TIMEOUT_SECONDS` | A run takes longer than 5 minutes. |

Example of a late occurrence, with an interval of 10 minutes and
`missedAfterSeconds: 60`:

1. The previous run is still going at 10:01. The 10:00 occurrence is dropped.
2. No main was up from 09:55 to 10:25. With `catchUp: true`, the 10:20
   occurrence runs once at 10:25. With `catchUp: false`, the next run is 10:30.

## Register it

1. In a backend module, return the class from `systemTasks()`.
2. Otherwise, add it to `mainSystemTasks()` or `instanceSystemTasks()` in this
   folder.

Load the class with `await import()` so a disabled feature costs nothing.

## Test it

1. Unit: assert `target` and `schedule`, then call `run()` with mocks.
2. A task that moves to the scheduler needs an integration test that proves two
   parallel runs are safe. See `test/integration/scheduling/`.
