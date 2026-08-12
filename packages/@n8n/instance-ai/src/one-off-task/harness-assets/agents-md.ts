import { REPORT_PATH, SECRETS_MANIFEST_PATH, TASK_DIR } from '../contracts';

/**
 * Workspace conventions context file. Pi loads `AGENTS.md` from the working
 * directory on every launch (pi docs/usage.md, "Context Files"), so these
 * conventions survive relaunches without being repeated in the prompt.
 */
export const AGENTS_MD = `# One-off task workspace conventions

This workspace exists for a single task. Task plumbing lives in \`${TASK_DIR}/\`.

## Credentials

- The secrets manifest at \`${SECRETS_MANIFEST_PATH}\` lists the injected
  credentials: environment variable names and human-readable labels. Names
  only — the values exist solely in the process environment.
- To check what is available, call the **list_credentials** tool. Never run
  \`env\`, \`printenv\`, or similar (they are blocked), and never look for
  values in the manifest — it contains none.
- Read a credential in code via \`process.env.NAME\` at the point of use.
- Multi-field credentials appear as several \`N8N_TASK_<CREDENTIAL>_<FIELD>\`
  variables. OAuth credentials are injected as ready-to-use access tokens —
  pass them as plain Bearer tokens and never try to refresh them.

## Requesting a credential you do not have

Call **report_result** with \`status: "needs_credential"\`, then stop:

- \`progressSummary\`: what you accomplished so far — it seeds your relaunch.
- For a credential listed in the task contract's catalog:
  \`request: { kind: "existing", credentialName: "<name from the catalog>" }\`
- For a credential that does not exist yet:
  \`request: { kind: "new", recipe: { serviceName, placeholders: [{ name, title, info? }], docsUrl?, testUrl? } }\`
  Placeholder names become environment variable names, so pick clear
  snake_case names (for example \`api_key\`). \`docsUrl\` should point at the
  exact page where the user creates the key; \`testUrl\` lets n8n verify the
  pasted value before you are relaunched.

The n8n host pauses the task, asks the user, injects the credential, and
relaunches you in the same session with the environment extended.

## The final report

**report_result** validates the report against a fixed schema and writes
\`${REPORT_PATH}\`. Expectations:

- \`status: "completed"\` — \`summary\` (user-facing, plain language),
  \`actions\` (every external call you made: description plus service),
  \`verification\` (each read-back check: what was checked, what was
  observed, passed true/false), and \`artifacts\` (label plus URL for
  everything you created, so the user can open it).
- \`status: "failed"\` — \`reason\`, plus \`actions\` covering what already
  ran, so the user knows what external state exists.
- Evidence over prose: verification entries must describe observed state
  ("read the sheet back: header row is Name, Email, Status"), never bare API
  status codes.

## Progress updates

Call **report_progress** with \`{ message }\` — one short, user-facing line —
when starting and when finishing each meaningful step. The user watches these
milestones live while you work. Messages must never contain credential
values. This does not replace the final **report_result** call.

## SDK documentation

Call **lookup_docs** with the library name (and optionally a topic) to fetch
current SDK documentation. Use it before coding against an unfamiliar API.
`;
