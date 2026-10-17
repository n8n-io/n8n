Copies of small parts of `@n8n/task-runner` and `n8n-core` (spike).

The worker loads only `n8n-workflow`. Loading `n8n-core` and the task runner
package doubled the start time of a worker. Production moves these parts to a
shared lightweight package.
