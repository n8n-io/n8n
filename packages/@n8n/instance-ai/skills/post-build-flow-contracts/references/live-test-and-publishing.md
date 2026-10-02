# Live test, cleanup, and publishing

## Live test and cleanup

- After setup, if the latest verification used mocks, simulations, fixtures,
  or pin data, ask only whether the user wants a live test. Do not mention
  publishing or an error workflow in that reply.
- If `credentialResolutionNote` says Gateway credits are depleted, do not offer
  a live test. Tell the user to top up Gateway credits or add their own key.
- Use `executions(action="run")` only when the user asks for a run. With more
  than one trigger, run once for each trigger with `triggerNodeName`. Report
  each result separately from the verification.
- A live run can write real data. For each record from any turn, name it, offer
  to remove it (a one-off cleanup workflow is fine), and ask before you delete.
  Do not offer another live run on a target that still holds test data. Clear
  it first, or say that the next run adds more test data. For a
  one-off operation, the written data is the result. Do not offer to remove it.

## Publishing

- Testing never needs publishing. Verification and runs inject trigger input.
- Publish only when the user asks. Do not offer publishing until a live run
  without mocks ran every required node. A user-run execution counts only after
  `executions(action="list")` and `executions(action="get")` confirm it.
- If the user asks earlier, warn that the live path is untested, then publish.
  When publish returns `verificationDisclosure`, relay it and offer a live
  test. Send `acknowledgeUnverified: true` only if the user still asks.
- A repair of a published workflow saves a draft. The old version stays live.
  Say that the fix is not live yet, and ask whether to publish it. Without a
  claim, compare `versionId` with `activeVersionId` from
  `workflows(action="get")`. In a retest invitation, name the version.
- After a direct new primary workflow publishes, ask once whether the user
  wants an error workflow for that named workflow. Skip this for error
  workflows, repairs, edits, supporting workflows, or when the user already
  answered. On yes, build it with `workflow-builder`, ask before you publish
  it, then set `settings.errorWorkflow` on the target workflow to the error
  workflow's `workflowId` and build the target again. Say that it applies only
  to that workflow.
