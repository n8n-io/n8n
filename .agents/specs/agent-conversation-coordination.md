# Agent conversation coordination and fencing

Status: Implemented from the approved specification and plan.

Scope: The execution lease comment on [PR #38778](https://github.com/n8n-io/n8n/pull/38778#discussion_r4028193318).

## Purpose

Make the database the authority for agent conversation execution ownership. Define which database writes a former owner must no longer be able to make.

The previous implementation used `LockService` to coordinate execution. Queue and execution state were stored in the database. An expired lease could leave a former owner running. The database now rejects protected writes from that attempt.

Moving lease storage into SQL does not by itself provide fencing. A fence must reject an outdated owner when the protected write occurs.

## Terms

- A main is a backend server process.
- A conversation is the existing logical chat thread.
- An owner is one execution attempt that holds the current right to process that conversation. A main process can own different conversations at the same time.
- A former owner is an attempt whose lease has expired, been released, or been replaced. Its main process can still be alive. If that process resumes after a pause, it must not write protected state with the former ownership identity.
- A lease is the database record of that right and its expiry.
- A fence is an ownership condition that the database enforces with a protected mutation. An earlier ownership check does not provide the same guarantee.

## Required behavior

### One authority for each conversation

1. The database grants at most one current execution owner for a conversation.
2. Competing mains must receive a consistent result when they try to claim the same conversation.
3. Different conversations can execute concurrently.
4. Ownership must work before the first execution or history record exists.
5. Queue processing, HITL resumption, wake execution, automatic workflow continuations, and recovery must use the same ownership rules. Existing conversation busy checks must reflect these rules.
6. The database determines lease expiry. Differences between main-process clocks must not decide ownership.
7. Notifications can prompt work. Receiving or missing a notification must not grant ownership.

### Preserve queue and HITL behavior

1. Ordinary messages keep their current durable FIFO order. Eligible HITL responses keep priority over waiting ordinary messages.
2. An incoming message or HITL response can enter the queue while another turn owns execution.
3. Editing, removal, and Stop keep their existing contracts in the preview follow-up PR.
4. A suspended run releases active execution ownership. Its persisted HITL state continues to block ordinary messages and wakes.
5. A valid response acquires ownership before resuming the matching suspension. Another suspension keeps ordinary messages blocked.
6. Wake requests remain in the existing wake system. This change does not assign them a FIFO position among queued messages.

### Ownership loss and recovery

1. A current owner can renew its lease. An expired or replaced owner cannot revive its old claim.
2. A process that detects ownership loss must stop starting further work for that attempt and request cancellation of work in progress.
3. Protected database writes from that attempt must fail even if the process has not handled its cancellation signal.
4. A late heartbeat, completion, or release from a former owner must not change a successor's ownership or queue entry.
5. Recovery must recheck ownership and liveness when it changes state. It must not interrupt a healthy owner based on an earlier stale read.
6. Preserve the current interrupted-run policy. Recovery marks abandoned active work interrupted and does not replay that input.
7. Preserve waiting-message recovery for integrations. Recovery of waiting previews after the accepting main dies remains outside this change.
8. An explicit Stop retains the execution slot until cancellation finishes. A stale Stop cannot cancel a successor.
9. An unavailable database must not cause execution to continue through a fallback ownership mechanism. A rejected renewal requests cancellation.

## Fence coverage

The fence covers the state below. Each protected write must enforce the ownership condition.

| State | Required guarantee | Decision |
| --- | --- | --- |
| Conversation ownership | Claim, renewal, takeover, and release reject an outdated ownership identity. | Core scope |
| Queue processing state | Execution claims, execution links, owner heartbeats, completion, and recovery cleanup obey current ownership. User edits and removal retain their queued-status conditions. | Core scope |
| Execution records | A former owner cannot update the active timeline, heartbeat, or terminal result after ownership loss. | Included; agreed |
| HITL checkpoints | A former owner cannot restore, replace, resume, or expire checkpoint state after ownership loss. | Included; agreed |
| Saved conversation messages | A former owner cannot add, replace, or delete messages in the conversation after ownership loss. This includes messages used as context by later turns. | Included; agreed |

The ownership condition and each protected mutation must form one atomic database decision. A lease check followed by an unguarded write is insufficient.

## Boundaries

- This specification addresses the conversation execution lease. The other two human review comments on #38778 are separate.
- Preview work stays on its accepting main. The transport changes in #38836 and the frontend in #38820 keep their agreed scope.
- Admission, session rotation, callback handling, and other `LockService` consumers are separate unless they directly use the conversation execution lease.
- No new broker, queue framework, message limits, reordering, execution retries, or admission deduplication is added.
- External actions already started can still finish after ownership loss. This change does not guarantee that a tool or platform API action occurs exactly once.
- Database transactions must not remain open while an agent waits for a model, tool, or human response.
- SQLite and PostgreSQL must support the same ownership and recovery contract. Multi-main deployments must remain supported.
- Any required schema change belongs to the unmerged base PR. Amend its existing migration, as agreed. The existing queue migration also creates the conversation lease table.

## Acceptance scenarios

| Scenario | Required result |
| --- | --- |
| Two mains claim the same conversation | Only one receives current execution ownership. |
| Two different conversations have waiting work | Both can progress independently. |
| A queue turn races with a wake or automatic continuation | Both paths observe the same owner. They cannot each receive valid ownership. |
| A first message has no execution record yet | It still receives the same ownership protection. |
| A lease expires and another main takes over | The former owner cannot renew, release, or mutate protected state with its old identity. |
| A stale process resumes after recovery | Its protected writes are rejected. It cannot overwrite the successor's state. |
| A former owner sends an execution heartbeat, timeline update, or terminal result | The database rejects the write, even if the process has not handled its cancellation signal. |
| A former owner saves, resumes, or expires a HITL checkpoint | The database rejects the write. The current suspension or resolved state remains intact. |
| A former owner adds, replaces, or deletes saved conversation messages | The database rejects the mutation. Stale output does not enter the history that later turns read. |
| Recovery races with a valid renewal or completion | Recovery does not act on a stale ownership decision. |
| A run suspends for HITL, resumes, and suspends again | Ordinary messages and wakes remain blocked until the suspension is resolved. |
| Stop races with completion and the next queued turn | Cancellation finishes before the slot is released. The request cannot target the next turn. |
| The accepting main dies during execution | The active input is interrupted without replay. Existing waiting-input recovery rules apply. |
| A notification is duplicated or missed | Ownership remains correct. Existing recovery can prompt pending work. |
| Mains have different local clocks | Lease validity follows database time. |

Run the ownership and stale-writer scenarios against SQLite and PostgreSQL. Run the queue integration suite with Redis to verify notifications between mains.

## Open decisions

None remain.

## Implementation TODO

- [x] Agree on fence coverage: ownership, queue state, execution records, HITL checkpoints, and saved conversation messages.
- [x] Review and agree on the complete specification.
- [x] Create and agree on a separate implementation plan.
- [x] Implement and validate the approved plan.

The approved plan uses a database lease of two minutes and renews it every 30 seconds. Backend execution context carries each attempt's ownership identity. The unmerged queue migration creates the lease table. Preview admission, session rotation, and callback locks remain separate.

## Execution context

`AgentConversationLeaseService` carries the owner with `AsyncLocalStorage`. It uses a two-minute lease and renews it every 30 seconds. Each acquisition receives a new UUID. The service locks the ownership row before it checks expiry and writes protected state in the same transaction.

The PostgreSQL expiry check uses `clock_timestamp()`. This reads the current database time after a row-lock wait. Queue and execution recovery also use database time.

Chat runs, task runs, saved agents invoked by workflows, and persisted child agents use this context. A foreground child keeps its parent cancellation signal. A detached child starts outside the parent context and receives its own lease. Cached runtimes store no ownership token. Each stream chunk and deferred persistence callback keeps the attempt that created it.

Builder operations, explicit history deletion, and inline workflow agents use a separate persistence path. An inline workflow agent has no stored agent row for the lease foreign key. Title, observation, and episodic-memory writes keep their existing behavior.

Existing telemetry keeps its event names and payloads. `Agent execution count` retains its message, tool, and token counters. `Agent session metrics` records a turn only after its terminal database update succeeds. A rejected former-owner completion does not add a completed turn.

## Deployment and draft databases

Stop or drain all older mains before starting this implementation. The old `LockService` implementation and the database implementation do not share ownership. Do not run both implementations against the same conversations during deployment.

The migration is still part of an unmerged PR. It replaces the earlier draft of `1789499956927-CreateAgentMessageQueue.ts`. It does not add a second migration.

Refresh a disposable development database that already applied the earlier draft:

1. Stop every n8n process connected to that database.
2. For SQLite, delete the disposable database file and its `-wal` and `-shm` files.
3. For PostgreSQL, drop and recreate the disposable database.
4. Start n8n from the updated branch. Let it apply the migrations to the empty database.

Keep a database that contains required data separate from this reset procedure. Removing only the migration-history row does not refresh the schema.

## Pull request stack

1. #38778 contains the queue and database coordination. Its migration creates both tables.
2. #38836 adds preview admission, push delivery, editing, removal, and cancellation. It retains its separate admission lock.
3. #38820 adds the preview queue interface.

## Validation

The focused queue and ownership suites pass on SQLite and PostgreSQL. PostgreSQL cases use separate connections to test a protected write against takeover and expiry during a row-lock wait. Redis covers queue notifications between mains.

The affected unit suites, migration up/down checks, shared build, affected package typechecks, and changed-file lint pass. The migration checks use fresh databases.
