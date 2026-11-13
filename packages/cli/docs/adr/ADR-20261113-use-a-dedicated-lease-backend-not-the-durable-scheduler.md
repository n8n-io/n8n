# Use a dedicated lease backend, not the durable scheduler

Date: 2026-11-13

Status: Active

Decision Owner: Core Application

Source: https://linear.app/n8n/issue/CAP-750

## Context

A lease gives one resource, such as the trigger of a published workflow, to exactly one main in a
cluster. No main is a leader. The `LeaseProvider` port in `@n8n/leases` defines the contract, and a
backend implements it.

The cli already has the durable scheduler. Its `scheduled_job` and `scheduled_task` tables, claim
loop, heartbeat, backoff, and reaper serve short scheduled tasks. A lease is different. A main holds
it for a long time. Its fencing token never restarts. Its fence check stays valid until the
transaction of the consumer ends. Another main takes it over about one lease duration after a
crash. Mains claim leases fairly. The backend runs on Postgres and SQLite, and current scheduler
users must see no regression.

## Decision

The cli implements `LeaseProvider` in a dedicated lease backend. The backend has its own tables
for leases, sessions, and lease kinds. It uses the database, the configuration, and the pubsub of
n8n. It does not import or change the durable scheduler.

The main reason is that lease semantics stay out of the scheduler model. Of the options we
designed, this one scored highest on correctness, clarity, and operational risk. It also needs the
least work: the tables are additive, and a plain rolling upgrade applies them.

## Alternatives Considered

1. **An isolated backend that reuses scheduler code.** We rejected it because it would cost more
   for the same correctness. The scheduler would have to export its internals, and it would gain
   nothing at run time.
2. **Leases as `scheduled_task` rows without a job.** We rejected it because the rows would carry
   two meanings. `running` would also mean held, and `attempts` and the expiry would read
   differently on lease rows. Every future reader of the table would need a filter for lease rows.
   The option would also need the first SQLite rebuild of `scheduled_task`.
3. **The claim state of every task in a lease table, one row for each task.** We rejected it for
   three reasons. Short tasks would need more row writes. The claim, executor, and reaper code
   would need a rewrite. The upgrade would stop all mains.
4. **One lease table for scheduler tasks and lease kinds.** We rejected it because the two users
   would pull the table in different directions. This option had the most correctness gaps. The
   default lease duration of scheduler tasks would fall from 60 s to 20 s, so a short database
   stall would abort running tasks. The upgrade would stop all mains.
5. **A lease layer under the scheduler, with the scheduler rebuilt on top.** We rejected it because
   it had the highest effort and risk. It would need two releases with dual writes. A fault in
   session renewal would stop scheduled runs and triggers together.

## Consequences

1. The durable scheduler and its users do not change.
2. The lease tables are additive. A rolling upgrade adds them.
3. Claim, backoff, and token logic exists in two places: the scheduler and the lease backend.
4. The scheduler does not gain sessions or fair claiming. The session table, the fencing counter,
   and the clock helper can move into the scheduler later, when ordinary tasks need them.
5. The port keeps a provider on top of the scheduler possible. Consumers do not change if a
   later record selects one.

## Links

RFC: https://app.notion.com/p/4055b6e0c94f81bd8f96c22c386c778c

Documentation: https://app.notion.com/p/4165b6e0c94f81b1a074da1a750f16d3

Related ADRs: ADR-20261113-keep-the-leases-package-free-of-runtime-dependencies
