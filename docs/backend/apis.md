---
title: APIs
audience: Backend engineers new to n8n
tier: 3
last_reviewed: 2026-11-06
contact: SamWooler
---

# APIs

The [Workflow publication](workflow-publication.md) page followed a REST call from the editor. The backend serves two HTTP APIs:

- The **REST API** under `/rest` serves the editor. It is private and can change without notice.
- The **public API** under `/api/v1` serves scripts, CI pipelines, and other tools. Since it is public, a change must not break existing callers.

This page explains how a request reaches your code, how the two APIs differ, and how the backend sends live data to callers. [Authentication](authentication.md) explains how n8n knows who sent a request.

## REST routes

A REST route is a method on a controller class. Decorators on the method give the HTTP method and the path. n8n serves each route under `/rest`.

Before the method runs, n8n checks, in this order:

1. **Authentication:** The caller is signed in, unless the route skips this check.
2. **License:** The license has the feature that the route needs.
3. **Permission:** The role of the user allows the action. [Authorization](authorization.md#roles-and-scopes) explains roles.

Decorators on the method declare the license and the permission that the route needs.

To read the body or the query of a request, use a data transfer object (DTO), i.e. a class from `@n8n/api-types` that holds a Zod schema. If the request does not match the schema, n8n answers 400.

n8n sends the value that the method returns as JSON, under the key `data`. If the method throws, the error class sets the status code:

| Error | Status |
|---|---|
| A subclass of `ResponseError` (e.g. `NotFoundError`) | The status of that class |
| `UserError` | 400 |
| Any other error | 500 |

Only one browser tab at a time can change a workflow. A route that changes a workflow must check that the request comes from that tab.

## Public API

A user can give an API key only the scopes that the user has. An endpoint checks both the scopes of the key and the role of the user.

The build generates the OpenAPI document from the DTOs of the endpoints, so a change to one of these DTOs changes the public contract. The `n8n:public-api` skill explains how to add an endpoint.

## Live updates

A REST route answers once. To show progress while work runs, the backend uses one of two mechanisms:

- **Push:** Each editor tab keeps a WebSocket connection to a main open, and the backend sends messages over it at any time (e.g. updates on manual executions).
- **Streamed response:** The backend keeps the response to one request open, and writes each part when it is ready (e.g. agent chat, n8n Assistant, streaming webhooks).

> [!WARNING]
> **When a connection drops, the data in transit is lost.** Only the n8n Assistant replays the missed parts. Send over push only the state that the editor can also fetch again.

The types of push messages are in `@n8n/api-types`.

In multi-main, each tab connects to one main. Push can address a message in two ways:

- **To one tab:** n8n pubsub relays the message to the main of that tab, so the tab always gets it (e.g. a worker sends the progress of a manual execution).
- **To a user:** n8n does not relay the message. If the user has tabs on two mains, only the tabs on the main that sends the message get it.

## Quiz

1. You add a REST route, and do not skip authentication. Who can call it?
   - A. Anyone.
   - B. Only a signed-in user.
   - C. Only the owner.
   - D. Only users with the owner role.
2. You rename a field in the DTO of a public API endpoint. What else changes?
   - A. Nothing. DTOs are internal.
   - B. The public contract, so existing callers can break.
   - C. Only the REST API.
   - D. Only the editor.
3. In multi-main, a main sends a push message to a user. Which tabs get it?
   - A. All tabs of the user, on every main.
   - B. Only the most recent tab.
   - C. Only the tabs of that user on the main that sends the message.
   - D. None.

<details>
<summary>Answers</summary>

1. B. Authentication is the first check, and every route runs it unless the route skips it.
2. B. The build generates the OpenAPI document from these DTOs, so a DTO change changes the public contract.
3. C. n8n does not relay a message to a user, so only the tabs on the main that sends the message get it.

</details>
