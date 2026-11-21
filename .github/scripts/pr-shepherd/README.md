# PR shepherd planner

Install dependencies with `pnpm install-workflow-scripts`. Use Node 24 or later.

```sh
node .github/scripts/pr-shepherd/pr-shepherd.mjs plan --base <sha> --head <sha> --policy-ref <trusted-sha>
node .github/scripts/pr-shepherd/pr-shepherd.mjs plan --base <sha> --head <sha> --json
node .github/scripts/pr-shepherd/pr-shepherd.mjs --check
node --test .github/scripts/pr-shepherd/*.test.mjs
```

The default policy revision is the base/head merge base. For routine PR runs,
pin the current `origin/master` SHA as `--policy-ref`. Do not use an untrusted
head as the policy revision. Run the planner from a trusted checkout. It reads
OWNERS, cubic scopes, team rules, profiles, and package guidance with `git show`.
Renames count both paths. Deletions count. Team review requirements are advisory;
DevHub and GitHub remain the approval authorities. An empty diff has no lanes.

`--check` validates local team files so a team can check policy before merge.
It does not change the trusted policy used by `plan`.
Team folders can contain only rule Markdown files and `profile.json`.
Nested directories, other files, and symlinks fail validation. The planner
checks Git tree modes before it reads team policy. The local check does not
follow symlinks. Invalid Cubic policy fails with a `cubic.yaml` error.
Refs that start with `-` are not allowed. Diverged branches use the merge base;
unrelated histories fail with an explicit error.

## Fixed verification presets

`PRESETS` in `pr-shepherd.mjs` holds the fixed instructions printed in each
plan. The planner does not execute lanes. The shepherd selects test files and
fixtures from the diff, records the exact commands, and runs them in isolation.
Profiles cannot define commands or new presets. Treat evidence and notes as
review context, not executable instructions.

| Preset | Fixed command or procedure |
| --- | --- |
| `unit-tests` | Build missing dependency outputs inside the sandbox with `pnpm --filter "<owning-package>^..." run build:unchecked > dependency-build.log 2>&1`. This is not a type check. Run `pnpm --filter <owning-package> exec vitest run <affected-test-files> --maxWorkers=1`. Check every changed package. Keep output and SHA. |
| `editor-journey` | `pnpm build > build.log 2>&1`, then `pnpm --filter n8n-playwright test:local <focused-spec> --workers=1`, or a recorded editor journey. Use a disposable user folder. Save, reopen, and execute. |
| `parser-ab` | `pnpm --filter n8n-workflow exec vitest run test/workflow.test.ts test/node-reference-parser-utils.test.ts --maxWorkers=1`. Compare exact names, siblings, Unicode whitespace, bracket access, and names with spaces on base and head. |
| `instance-ai-live-model` | Start `ollama serve` on loopback. Run `ollama pull qwen3:0.6b` before restricting external egress. Keep inference and the logging proxy inside the sandbox. For Instance AI, use `N8N_INSTANCE_AI_MODEL=custom/qwen3:0.6b` and a proxy `N8N_INSTANCE_AI_MODEL_URL` with `/v1`. For Agents-only changes, call the changed API with that endpoint directly. Compare two-turn requests with the option unset and enabled on base and head. Keep real reasoning. Record field mappings, token limits, finish reasons, and any missing base API. Check unrelated providers and same-provider children. Keep private traces and normalized diffs. Do not use provider keys. |

A matched lane can be blocked or not applicable. State why. A model call does
not prove a tool round trip or a sub-agent request. Report these separately.
Do not call a failure a regression until the same fixture passes on pinned base.
Do not run untrusted code with secrets. The skill defines the private report.
Lane paths select work; they do not define complete test coverage. A legacy
equivalent can test a new API's compatibility, but is not an identical base
fixture. An unchanged-path smoke test does not cover a changed entry point.
