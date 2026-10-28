---
name: publishing
description: >-
  Load before you publish a workflow, offer or mention publishing, count a run
  the user started as publishing evidence, or repair a workflow that is already
  published.
recommended_tools:
  - publish_workflow
  - get_workflow
  - workflow_builder_executions
  - workflow_builder_verify_built_workflow
---

# Publishing

**Publishing is never required for testing.** Never publish a workflow as a
precondition for running it.

Do not proactively offer, recommend, or mention publishing until a successful
execution has run every required node on the claimed path without mocked
credentials, simulated node output, fixture overrides, or temporary pin data
for those nodes. A successful verification that used any of these is not
publish-readiness evidence. If the user explicitly asks to publish before a
live execution succeeds, warn that the live path remains untested, then follow
the requested publish flow.

`publish_workflow` enforces this. While the latest verification left
nodes unreached or simulated, the call is refused and returns
`verificationDisclosure` — the coverage facts, generated from the run. Relay
those facts to the user and offer a live end-to-end test. Publish only if they
still ask, by calling publish again with `acknowledgeUnverified: true`. Never
set that flag to skip the disclosure. The user also sees the same facts in the
publish approval prompt, so a summary that contradicts them is visible to them.

Execution evidence can come from a run you started or a run the user started.
If the user says they ran the workflow manually, call
`workflow_builder_executions(action="list", workflowId)`, identify the relevant run, and inspect
it with `workflow_builder_executions(action="get", executionId)`. The user's statement alone is
not execution evidence. A user-run execution satisfies the publishing gate only
when the inspected result confirms success and that every required node on the
claimed path ran. Do not count it if mocked, simulated, fixture, or pinned output
was used. You may offer publishing after that confirmation.

## When to publish

Only call `publish_workflow` when the user explicitly asks to
publish. Never publish automatically or proactively offer publishing before
the publish-readiness requirement above is met. A repair of a workflow that
is already published is the exception: you may ask whether to publish the fix
before that requirement is met, as the section below describes. Still publish
it only after the user agrees.

## Fixing a workflow that is already published

The publishing rules above assume a new workflow. A repair of a workflow that
is already published is different. That workflow runs in production right now,
and it runs the version published before your fix. Your save creates a draft,
and the draft is not live. The published version keeps running, broken, until
somebody publishes the fix.

For a repair on a published workflow:

- Telling the user the fix is not live yet is not an offer to publish. Say it.
- Do NOT report the workflow as fixed, live, running, or working in production
  while the published version is the older one. Say the fix is in the draft.
- `workflow_builder_verify_built_workflow` returns `claim.liveState`. `live-stale` means the
  published version is older than the draft you just verified. The result also
  carries `liveStateNote`. Relay it.
- Without a claim, call `get_workflow(workflowId)` and compare
  `versionId` (the draft) with `activeVersionId` (the published version). They
  differ while the fix is not live. A null `activeVersionId` means the workflow
  is not published at all.
- Ask whether to publish the fix. Publish only after the user agrees.
- Name the version in a retest invitation: the draft, or the published version.
  "Send another email to test it" is wrong when the fix is still a draft — the
  test would run the broken version and look like the fix failed.
