# Evidence Capture Subagent Prompt Template

Fill the {placeholders} and dispatch as a general-purpose subagent.

---

You are capturing evidence for a change story. Return ONLY a list of
`file-path-or-label: one-line factual note` entries plus a `FAILED:` list.
No narrative, no analysis, no opinions. Your final message is parsed, not
read by a human.

Repo: {repo_path}
Base branch: {base_branch}  PR/feature branch: {head_branch}
Change types: {types}
Assets directory (create it; every run gets its own fresh timestamped
directory, never write outside it): {assets_dir}

## Prerequisite (every change type)

Get {head_branch} into a working tree: if it is not already checked out, use a temporary worktree
(git worktree add), never switch the user's checkout. Run every section below from that tree.
When a section needs the app, use an instance that serves that tree: check that the process
listening on the port has that tree as its working directory (`lsof -a -p <pid> -d cwd -Fn`). If it
does not, or nothing is running, launch your own on a free port (project's launch skill if one
exists, otherwise the `run` skill's approach). Never stop a server you did not start.

## UI changes ({ui_flows})

1. Use the working tree and the app instance from the prerequisite.
2. Drive each listed flow with browser MCP. Screenshot each key state to
   {assets_dir}/after-<flow>-<n>.png.
3. Before/after: if the change modifies an existing screen, use a temporary
   worktree of {base_branch} (git worktree add), launch there, screenshot the
   same states to {assets_dir}/before-<flow>-<n>.png, then remove the
   worktree. Base and head cannot share a port: stop the head app first if
   you started it, or launch base on a different port. Never stop a server
   you did not start; if it blocks the port, record the before shots under
   FAILED. If the flow is new (additive) or the base launch fails, skip
   the before shots and record why in FAILED.

## API changes ({endpoints})

With the app from the prerequisite running on {head_branch}, issue one real request per listed
endpoint (curl). Save the request and response to
{assets_dir}/api-<name>.txt with Authorization, Cookie and Set-Cookie headers, tokens, keys and any
real customer data replaced by `<redacted>`. Use synthetic data in the request. If a response is
mostly real customer data, do not save it: record it under FAILED. Note the status code in your entry.

## Logic changes ({test_targets})

Run the listed test files/patterns with the project's test runner, in the head working tree from the
prerequisite. Save the
output to {assets_dir}/tests-<name>.txt. Note pass/fail counts in your entry.

## n8n demo workflow ({n8n_demo}, n8n repo only)

Build a minimal workflow JSON that exercises the changed node/trigger/
execution behavior. Import it only into an instance you started for this capture (an isolated throwaway instance, for
example the one `/n8n:browse` starts), never into a long-running dev instance. Execute it, confirm it
demonstrates the change, and delete the imported workflow afterwards. Save the JSON to
{assets_dir}/demo-workflow.json and screenshot the executed workflow to
{assets_dir}/demo-workflow.png. If it will not import or execute, put it
under FAILED instead of shipping a broken demo.

## Rules

- Never fabricate: anything you could not capture goes under FAILED with the
  reason, one line each
- Kill any servers you started (never ones already running), remove any
  worktrees you added, and leave the user's checkout on its original branch
- Keep screenshots minimal: key states only, not every click
