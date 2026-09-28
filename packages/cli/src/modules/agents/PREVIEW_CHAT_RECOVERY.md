# Preview chat recovery

An accepted preview turn continues when its browser connection closes. This applies to new messages and resumed interactions. The server records the execution and registers its cancellation handle before it sends `execution-started`. The event contains `executionId` and `sessionId`.

The original connection receives live SSE events. After a reload or disconnect, the client reads the recorded transcript. It follows later `agentExecutionUpdated` notifications with fresh history reads. Each successful read replaces the recovered transcript. A failed read keeps the last known state. The client does not submit the message or resume request again.

`GET /projects/:projectId/agents/v2/:agentId/chat/:threadId/messages` returns `messages`, `openSuspensions`, and `activeExecutionId`. The active ID is present even before the first output. A `null` ID means that the recorded thread has no running execution.

All tabs of the owning user can follow the execution and request Stop. Other users cannot read or cancel a private preview turn. New-message submission stays blocked while a turn runs. The draft remains editable. A competing request receives the `turn_already_running` error and keeps its draft.

Stop uses `DELETE /projects/:projectId/agents/v2/:agentId/chat/:threadId/executions/:executionId`. It requires `agent:execute` and the preview owner. The server cancels the local execution or relays the request to the main that owns it. The response `{ cancelRequested }` reports the request. Recorded state determines completion. A late request cannot cancel a later execution. Suspended turns use the existing checkpoint cancellation path.

Recovery guarantees the latest retained timeline, followed by newer snapshots. Updates can arrive in batches. Snapshots do not contain original text-stream IDs or every transient live event. Child text and reasoning share the existing 4,000-character limit for each delegation. Text beyond that limit is not part of recovery.

This contract does not include token replay, queued messages, execution fencing, or survival of backend process failure. The existing Agents enablement controls the feature.
