---
title: APIs
audience: Backend engineers new to n8n
tier: 3
last_reviewed: 2026-11-06
contact: SamWooler
---

# APIs

On [Workflow publication](workflow-publication.md), the editor called a REST route to publish a workflow. The backend serves two HTTP APIs. The REST API under `/rest` serves the editor. The public API under `/api/v1` serves scripts, CI pipelines, and other tools. This page explains how a request reaches your code, how the two APIs differ, and how the backend sends live data to the browser. [Authentication](authentication.md) explains how n8n knows who sent the request.

## REST routes

A REST route is a method on a class with `@RestController()`. A method decorator, such as `@Get('/summary')` or `@Post('/')`, gives the HTTP method and the path. At startup, n8n registers each controller under `/rest`.

Before the method runs, n8n runs these checks in this order:

1. Authentication, unless the route sets `skipAuth`.
2. The license check of `@Licensed`.
3. The scope check of `@GlobalScope` or `@ProjectScope`.

A parameter with `@Body` or `@Query` must have a DTO class from `@n8n/api-types` as its type. n8n parses the request with the Zod schema of that class. If the request does not match, n8n answers 400 with the first validation error, and the method does not run.

n8n sends the value that the method returns as JSON, under the key `data`. A thrown error sets the status code:

| Error | Status |
|---|---|
| A subclass of `ResponseError` from `@n8n/errors`, such as `NotFoundError` | The status of that class |
| `UserError` | 400 |
| Any other error | 500 |

n8n reports every error to the error reporter, except a `ResponseError` with a status of 404 or lower.

The REST API belongs to the editor, and the two change together.

## Public API

The public API is a contract with code outside n8n. A change must not break callers that already exist, also when the code behind an endpoint changes.

Most callers sign in with an API key. A key has its own scopes, a smaller set than the scopes of users. A key never has a scope that the role of its owner lacks.

Each endpoint is a method on a `@PublicApiController` class. The build generates the OpenAPI document from these methods and from the request and response types in `@n8n/api-types`, so a new endpoint describes itself. A public API controller calls services, not repositories. List endpoints page with cursors, not with page numbers.

`@n8n/cli` is a command line client that uses only the public API. To add an endpoint with a coding agent, point it to the `n8n:public-api` skill.

## Live updates

The backend also sends live data to the browser:

| Channel | Carries | After a reconnect |
|---|---|---|
| Push | The progress of manual runs, collaboration, and notifications | Lost. The editor fetches the state again |
| The response of an agent chat | One agent turn | The editor reads the recorded conversation |
| The response of an n8n Assistant run | One run of the Assistant | Missed events play again from a log |
| A streaming webhook response | The output of a workflow while it runs | Lost |

> **A push message is lost when the connection drops.** Send over push only the state that the editor can also fetch again.

Push is one connection for each browser tab, over WebSocket by default. In multi-main, only one main holds a given tab, so a worker or another main relays a message for that tab over pubsub. A message to all tabs of a user reaches only the tabs on the current main. The relay drops node output that is too large for pubsub, and the editor loads that data when the execution ends. The types of all push messages live in `@n8n/api-types`.

Only one tab at a time can change a workflow: the tab that holds the **write lock**. The routes that change a workflow check the lock. Collaboration needs WebSocket, so it does not start with `N8N_PUSH_BACKEND=sse`.

## Quiz

1. A request body does not match the DTO class of its `@Body` parameter. What happens?
   - A. The method runs with the raw body.
   - B. n8n answers 400 with the first validation error, and the method does not run.
   - C. n8n answers 500, and reports the error.
   - D. n8n drops the fields that do not match, and runs the method.
2. Your service throws a `UserError` in a REST route. Which status code does the caller get?
   - A. 403.
   - B. 404.
   - C. 400.
   - D. 500.
3. You add a REST route and add no auth option. Who can call it?
   - A. Anyone.
   - B. Only a signed-in user. A route must set `skipAuth` to allow other callers.
   - C. Only the owner.
   - D. Only API keys.
4. In multi-main, the backend sends a push message to all tabs of one user. Which tabs get it?
   - A. All tabs of the user, on every main.
   - B. Only the most recent tab.
   - C. Only the tabs on the current main.
   - D. None, because user messages need SSE.

<details>
<summary>Answers</summary>

1. B. n8n parses the request with the Zod schema of the DTO class before the method runs.
2. C. A `UserError` means that the caller caused the error. An error that is not a `UserError` or a `ResponseError` gives 500.
3. B. Authentication is the first check, and every route runs it unless it sets `skipAuth`.
4. C. A message to the tabs of a user goes only to tabs on the current main, so it can miss some tabs.

</details>
