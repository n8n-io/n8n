# Manual regression workflows

These workflows are **not** run by CI. They exercise behaviour that needs a live
LLM and real credentials, so they can't be made deterministic in the automated
harness. Import them into a running n8n instance to verify by hand.

The deterministic, CI-enforced coverage for the same behaviour lives in:

- `packages/core/src/execution-engine/__tests__/workflow-execute.test.ts`
  (`AI tool continue-on-fail default`) — engine continues on tool error by
  default and still halts on explicit `onError: 'stopWorkflow'`.
- `packages/frontend/editor-ui/src/app/stores/executionData.store.test.ts`
  — fail-then-retry leaves the canvas green; a later failure still surfaces.

## `ai-2511-tool-retry.manual.json` (AI-2511)

AI Agent + a Code Tool (`secret_box`) that throws on the first call (wrong
password) and returns the secret on the second call. Set up an Anthropic
credential, open the chat, and ask for the secret.

**Expected with the fix:** `secret_box` shows **red** on its first run (the
failure is recorded), the agent reads the error, retries with the correct
password, and the node shows **green** on its second run. The workflow does not
halt and the agent reports the secret.

**Without the fix:** the workflow halts on the first tool error (red, no
recovery).
