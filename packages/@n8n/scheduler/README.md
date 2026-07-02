# @n8n/scheduler

A durable, distributed scheduling service for n8n. It schedules recurring and
one-off work and dispatches each due occurrence to a handler, coordinating through
the database so every main instance participates and no occurrence is lost across a
restart or failover. Scheduling (deciding that something is due) is decoupled from
execution (running it), and dispatch is effectively-once.

It is a general scheduling primitive, not tied to one feature: each occurrence is
routed to a handler by a `task_type` key. The Schedule Trigger node is its first
consumer; poll triggers, system tasks and waiting executions are intended to follow,
replacing today's in-memory, leader-only scheduling. All of it sits behind
`N8N_SCHEDULER_ENABLED` (default off) while the legacy engine stays in place for
rollback.

## Scope

- **Coordination** (the core): assign each due occurrence to a single main via
  claim, lease and fencing, recover work whose owner has died, and dispatch it
  across the cluster.
- **Recurrence**: turn a cron, interval or one-off schedule definition into its next
  occurrence, with correct timezone and DST handling.

## Status

Early foundation. Today the package ships the domain types, the schedule math and a
thin storage boundary; the coordination engine (sweep, executor, reaper) lands in
later milestones.
