# Preview chat recovery

An accepted preview turn continues when its browser connection closes. This applies to new messages and resumed interactions. For a new message, the server commits the session and queue item before it sends `message-queued`. This event contains `queueId` and `sessionId`. The composer clears the submitted draft on acceptance. When the consumer claims the item, it records the execution and registers its cancellation handle before it sends `execution-started`. The event contains `executionId` and `sessionId`.

The original connection receives live SSE events. After a reload or disconnect, the client reads the recorded transcript. It follows later `agentExecutionUpdated` notifications with fresh history reads. Each successful read replaces the recovered transcript. A failed read keeps the last known state. The client does not submit the message or resume request again.

`GET /projects/:projectId/agents/v2/:agentId/chat/:threadId/messages` returns `messages`, `openSuspensions`, and `activeExecutionId`. The active ID is present even before the first output. A `null` ID means that the recorded thread has no running execution.

All tabs of the owning user can follow the execution and request Stop. Other users cannot read or cancel a private preview turn. Users can submit messages while a turn runs or waits for approval. Pending messages appear only in the queue panel. Each message enters the conversation when its execution starts. Typed answers to question cards still resume the suspended interaction. Waiting SSE requests do not block history recovery or approval actions.

Stop uses `DELETE /projects/:projectId/agents/v2/:agentId/chat/:threadId/executions/:executionId`. It requires `agent:execute` and the preview owner. The server cancels the local execution or relays the request to the main that owns it. The response `{ cancelRequested }` reports the request. Recorded state determines completion. A late request cannot cancel a later execution. Suspended turns use the existing checkpoint cancellation path. Stop leaves pending messages in place. The next message starts after cancellation settles.

Recovery guarantees the latest retained timeline, followed by newer snapshots. Updates can arrive in batches. Snapshots do not contain original text-stream IDs or every transient live event. Child text and reasoning share the existing 4,000-character limit for each delegation. Text beyond that limit is not part of recovery.

`GET /projects/:projectId/agents/v2/:agentId/chat/:threadId/queue` restores pending messages in FIFO order. It requires `agent:read` and the Preview session owner. `DELETE` on the same path with `/:queueId` requires `agent:execute`. Removal locks the session and rejects an item that has started. Successful removal discards its attachments. Queue changes use `agentMessageQueueUpdated` notifications across mains. Execution updates also refresh the queue. Neither notification replays stream events.

Accepted input survives backend process failure through the durable queue. Interrupted executions are not replayed. Valid approval checkpoints retain their place. The existing Agents enablement controls the feature. This contract does not include token replay, sender deduplication, queue editing, or queue reordering.
