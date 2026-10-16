# Local self-healing demo

Open [the demo controls](http://127.0.0.1:5824). The n8n editor runs at
[localhost:5820](http://127.0.0.1:5820).

This worktree combines the repair backend and the Inbox UI. It uses the local
branch `demo/self-healing-inbox-refresh-20261016`. The source PR branches remain unchanged.

| PR | Included head |
| --- | --- |
| [#41020: Investigations](https://github.com/n8n-io/n8n/pull/41020) | `6b95b0985c` |
| [#40739: Inbox foundation](https://github.com/n8n-io/n8n/pull/40739) | `a91c151d97` |
| [#40741: Result list](https://github.com/n8n-io/n8n/pull/40741) | `2caf6f9945` |
| [#40750: Result review](https://github.com/n8n-io/n8n/pull/40750) | `bc2423cf3d` |

## Present the demo

1. Click **New demo** if you need a fresh workflow.
2. Click **Open workflow** to show the published order workflow.
3. Return to the controls and click **Send order**.
4. Click **See failure** to show the failed execution.
5. Return to the controls and click **Start investigation**.
6. Wait for **Fix ready**, then click **Review fix**.
7. Read the report in Inbox and open **Changes**. The change list identifies `Calculate Total`.
8. Click **Apply and publish** in Inbox.
9. Return to the controls and click **Replay original order**. The total must be `148.5`.
10. Click **Send different order**. The total must be `34.5`.

The controls open n8n with the local demo session. **New demo** creates a new
workflow. It preserves previous workflows, executions, and reports.

The model, sandbox, executions, report, review, and publication are real.
Investigation startup uses a local developer bridge. The controls show observed
tool activity. The Inbox shows the completed result. The model can take longer
on another run.

## Start and stop

Run these commands from this worktree:

```sh
node .agent-setup/self-healing-demo/start.cjs
node .agent-setup/self-healing-demo/stop.cjs
```

The runtime and database are in `.agent-setup/self-healing-demo/`. This directory
is ignored by Git. It contains private model and sandbox settings. The stop
script stops only the demo processes. It keeps the database and the shared Docker
sandbox. Start requires the sandbox and this worktree's built packages.

To reset the running demo to one broken workflow and an empty Inbox:

```sh
node .agent-setup/self-healing-demo/reset.cjs
```

Reset saves the old database and session in a private `archives/` directory.
It creates a fresh demo account and clears the execution and investigation history.
Refresh the presenter page after reset.

To rebuild after code changes:

```sh
pnpm exec turbo run build --filter=n8n... --filter=n8n-editor-ui... --concurrency=2 > .agent-setup/self-healing-demo/build.log 2>&1
```

## Refreshed demo verification

The latest PR heads use the new review actions and short, two-section reports.
The local button spacing is preserved. The action is now **Apply and publish**.

- All 65 backend and editor build tasks passed.
- All 184 focused tests passed: 56 review UI tests, 99 self-healing integration tests, and 29 workflow credential tests.
- Changed-file formatting, lint, and whitespace checks passed.
- A real Claude Opus 4.8 run produced a verified repair in 42.861 seconds.
- The source workflow stayed unchanged until approval. The browser showed the report and one proposed change.
- **Apply and publish** opened the published workflow. Real HTTP replays returned 148.5 and 34.5 for the two orders.
- The reset script archives the rehearsal and prepares one broken workflow with no executions or results.

Full-repository checks remain in CI.

## Earlier demo verification on October 16, 2026

- All 65 packages in the backend and editor build passed.
- All 419 focused tests passed. These cover the API schema, backend services, and SQLite integration.
- Changed-file formatting, lint, and whitespace checks passed.
- A real model run produced a verified repair in 41.267 seconds.
- The browser rehearsal covered the failed execution, Inbox report, graph comparison, approval, and both HTTP replays.
- An independent audit passed 38 checks. The source stayed unchanged until approval. Publication changed only the broken expression. Temporary verification resources were removed.
- The local UI update adds space around the action buttons. A fresh model run produced a short title and a 79-word report in 33 seconds. All 20 result-content tests passed.

Evidence and the browser recording are saved in the runtime directory. This demo
uses SQLite and direct model credentials. It does not test production billing or
distributed deployments. Full-repository checks remain in CI.

## Hosted demo

The hosted branch is `demo/self-healing-hosted-20261016`.
It adds a standalone page at `/static/self-healing-demo/index.html`.
Sign in to n8n, then open that page. Each browser can create a fresh demo workflow.
The page saves its current demo reference for the signed-in user in browser storage.
Previous workflows and reports remain in n8n.

Deploy the pushed branch through Nathan:

```text
/nathan deploy demo/self-healing-hosted-20261016 test-self-healing-predrag --ai -e N8N_INSTANCE_AI_WORKFLOW_SUGGESTIONS_ENABLED=true -e N8N_SELF_HEALING_DEMO_ENABLED=true
```

The second flag registers the demo investigation start and status routes. Both routes
require login and project workflow-update permission. The producer checks access to
the workflow and failed execution. Status reads recheck current workflow ownership.
The page uses normal workflow creation, publication, execution, and review APIs.
It does not use the local developer bridge or copy the local model credentials.

Nathan configures the hosted model and Daytona sandbox. Its current AI profile selects
Claude Opus 5.5. The local hosted-page rehearsal used Claude Opus 4.8 and the local
sandbox. Verify the hosted model and Daytona path after deployment.

Hosted controls checks: 14 controller/module tests, 65 build tasks, backend lint,
formatting, and JavaScript syntax checks. The browser rehearsal covered workflow
creation and publication, a real failed webhook, a real model investigation, the
Inbox report, Apply and publish, and two successful HTTP replays with totals 148.5 and 34.5. The source PR branches remain unchanged.
