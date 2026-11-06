---
title: Sandboxing
audience: Backend engineers new to n8n
tier: 3
last_reviewed: 2026-11-06
contact: despairblue
---

# Sandboxing

Users write JavaScript in two places: expressions in node parameters, such as `{{ 'Hello, ' + $json.body.name }}` on [Start here](README.md), and the code of a Code node. This page explains how n8n runs both, how it keeps that code apart from its own process, and how it limits the URLs that user input can reach.

## Expressions

> **Expression helpers exist in two copies.** A helper such as `.toDateTime()` has one copy for the old engine, and one in the code that the isolate loads. A change to one copy needs the same change in the other.

`n8n-workflow` evaluates expressions. It evaluates an expression only when a node reads the parameter, and then once for each item. That is why one parameter can give a different value for each item.

Each output item remembers the input item that it came from. n8n calls this link a **paired item**. An expression such as `$('Webhook').item` follows the links back to the matching item of an earlier node. A node that breaks the links makes expressions in later nodes fail.

The default engine runs each expression in a V8 isolate, a separate JavaScript heap with its own memory limit and timeout.

The isolate needs a native module. If that module fails to load, the process stops at startup with a message. It does not fall back to a weaker engine. `N8N_EXPRESSION_ENGINE=legacy` selects the old engine, which runs expressions inside the n8n process. The old engine will go away.

The editor cannot load the native module, so it previews expressions with the old engine. A preview in the editor can therefore differ from a run on the backend.

## Code node

A Code node runs JavaScript or Python in a **task runner**, a separate process. A runner sits next to the process that runs workflows: the main on your laptop, the worker in queue mode. When the code calls a helper, such as an HTTP request, n8n runs the helper, not the runner.

In `internal` mode, n8n starts the runners as child processes. In `external` mode, a launcher in its own container starts them. n8n recommends `external` mode for production. A task that runs longer than the timeout fails, and in `internal` mode n8n also restarts the runner.

Agents do not use task runners. An agent runs its custom tool code in its own isolate.

## Outbound requests

Many outbound requests go to a URL that a user entered, for example in an HTTP Request node or a credential. Backend code sends outbound HTTP requests through `OutboundHttp` in `@n8n/backend-network`, and the request helpers of nodes use it too.

`OutboundHttp` can refuse requests to internal addresses, such as `localhost` or private IP ranges. An operator turns this check on with `N8N_SSRF_PROTECTION_ENABLED=true`. A request skips the check only with `useDefaultSsrfPolicy: 'unsafe'`, which is for fixed hosts that no user controls. `packages/@n8n/backend-network/README.md` explains how to choose.

## Quiz

1. You change the helper `.toDateTime()`. What else must you change?
   - A. Nothing. One file holds all helpers.
   - B. The second copy of the helper, so that both engines agree.
   - C. The task runner, because it runs all helpers.
   - D. The migration that stores the helpers.
2. In queue mode, where does a Code node run?
   - A. In a task runner next to the main that received the request.
   - B. In the isolate pool of the main.
   - C. In a task runner next to the worker that runs the workflow.
   - D. Inside the worker process.
3. A node gives output items without links to its input items. What fails?
   - A. Nothing. The links are only for the editor.
   - B. The node itself, at once.
   - C. The save of the run data.
   - D. Expressions in later nodes that use links, such as `$('Webhook').item`.

<details>
<summary>Answers</summary>

1. B. The helpers exist in two copies: one for the old engine, and one in the code that the isolate loads.
2. C. A runner sits next to the process that runs workflows. In queue mode, that process is a worker.
3. D. Each output item remembers its input item. A node that breaks these paired items makes those expressions fail.

</details>
