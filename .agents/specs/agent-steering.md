# Agent steering

## Goal

Let a user send a saved preview message to the parent agent that is already running.

## Behavior

- Add **Send now** to each waiting preview message.
- Bind the action to the exact active execution and SDK run.
- Add accepted messages at the next safe boundary.
- Finish the current model request and its complete tool batch first.
- Keep all accepted messages in server acceptance order.
- Continue the same SDK run, execution, counters, and budgets.
- Keep other waiting messages in their existing order.
- Disable the action while a HITL response is pending.
- Reject a stale target. Do not select a newer run.
- Keep a stopped or failed delivery as undelivered input. Do not run it automatically.
- If the parent turn ended while background work remains, start a new parent turn for the selected message.
- Keep background jobs running and keep their result delivery unchanged.

## Durability

- Store the accepted input in the existing message queue.
- Checkpoint the runtime after it adds the input and before the next model request.
- Keep one stable input ID from the queue through the runtime, stream, and execution history.
- Do not replay a started model request or tool call after process loss.

## Scope

This specification covers preview chat queue messages. AGENT-700 covers ordering with other event sources.
