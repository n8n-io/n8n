---
title: Live updates
audience: Backend engineers new to n8n
tier: 3
last_reviewed: 2026-11-05
contact: tomi
---

# Live updates

On Day 1, the canvas showed the progress of your manual run while it ran, and an agent streams its answer word by word. The backend sends live data to the browser in four ways. This page explains each one and what happens when a connection drops. Read it when your feature must show progress, or when a message does not arrive.

| Channel | Carries | After a reconnect |
|---|---|---|
| Push | Progress of manual runs, collaboration, and notifications | Lost. The editor fetches the state again |
| The response of an agent chat | One agent turn in the editor | The editor reads the recorded conversation |
| The response of an Assistant run | One run of the n8n Assistant | Missed events play again from the event log |
| A streaming webhook response | The output of a workflow, while it runs | Lost |

## Push

Push is one connection for each browser tab, over WebSocket by default, or Server-Sent Events. Each tab has a **push reference**. The backend can send a message to one tab, to the tabs of one user, or to everyone.

In multi-main, only one main holds a given tab. A worker or another main sends the message for that tab over pubsub. The main that holds the tab passes it on. Pubsub has a size limit. When the output of a node is too large, the relay drops it. The editor then shows placeholders, and it loads the data when the execution ends.

A message to the tabs of a user goes only to tabs on the current main. In multi-main, those messages can therefore miss some tabs.

The types of all push messages live in `@n8n/api-types`, so the backend and the editor use the same definitions.

## Collaboration

When two people open the same workflow, the editor shows both. Only one tab at a time can change the workflow: the tab that holds the **write lock**. The lock expires after two minutes without a heartbeat, so a closed tab cannot block a workflow for long. The routes that change a workflow check the lock. They answer 409 when another tab of the same user holds it, and 423 when another user holds it.

Collaboration needs WebSocket, because the browser sends messages too. With `N8N_PUSH_BACKEND=sse`, collaboration does not start.

## Agent streams

An agent chat keeps its HTTP response open and streams the turn, as [Agent turn](../agent-turn.md) showed. If the connection drops, the turn goes on. After a reload, the editor reads the result from the recorded conversation.

The Assistant writes each event to a log table first. The editor reads the log as a stream, and after a reconnect it asks for the events after the last one that it saw. Small text pieces go only to clients that are connected at that moment, and the log keeps the full messages.

## Chat widget

The Chat Trigger node has a chat widget that a user can put on a website. The widget uses its own WebSocket at `/chat`, and it can resume a waiting execution with the next message. Mains and webhook processes both serve it.

## Quiz

1. In multi-main, the backend sends a push message to all tabs of one user. Which tabs get it?
   - A. All tabs of the user, on every main.
   - B. Only the most recent tab.
   - C. Only the tabs on the current main.
   - D. None, because user messages need SSE.
2. The output of a node is too large for pubsub. What does the editor show?
   - A. An error on the node.
   - B. Placeholders, and then the data when the execution ends.
   - C. The output, after a delay.
   - D. Nothing, until a reload.
3. An operator sets `N8N_PUSH_BACKEND=sse`. What stops working?
   - A. Collaboration, because the browser must also send messages.
   - B. The progress of manual runs.
   - C. Agent streams.
   - D. Notifications.
4. Another user holds the write lock of a workflow. What does a route that changes the workflow answer?
   - A. 409.
   - B. 403.
   - C. 200, and the change waits.
   - D. 423.
5. The connection of an Assistant run drops. What does the editor get after it reconnects?
   - A. Nothing. The run is lost.
   - B. The full run, from the start.
   - C. The events that it missed, from the event log.
   - D. Only the final answer.

<details>
<summary>Answers</summary>

1. C. Only the tabs on the current main. A message to the tabs of a user goes only to tabs on the current main, so it can miss some tabs.
2. B. Placeholders, and then the data when the execution ends. Pubsub has a size limit, so the relay drops large output.
3. A. Collaboration, because the browser must also send messages. Collaboration needs WebSocket. Server-Sent Events go only from the server to the browser.
4. D. 423. The answer is 409 when another tab of the same user holds the lock, and 423 when another user holds it.
5. C. The events that it missed, from the event log. The Assistant writes each event to a log table first, and the editor asks for the events after the last one that it saw.

</details>
