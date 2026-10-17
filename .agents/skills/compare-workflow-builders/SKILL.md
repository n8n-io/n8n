---
name: n8n:compare-workflow-builders
description: >-
  Runs one workflow prompt through Instance AI, Claude Code with the n8n MCP
  server, and Codex with the n8n MCP server on a local n8n instance. Collects
  the traces, per-call tokens, cost, and canvas screenshots, judges each run
  against the expected outcome, and builds one HTML comparison page. Claude
  Code and Codex run in a sandbox that sees only the n8n MCP server. Use when
  the user wants to compare builders, test a prompt across Instance AI and
  MCP, or says /compare-workflow-builders.
---

# Compare workflow builders

This skill sends the same prompt to up to three builders on the local n8n
instance. The builders run at the same time, and a local page shows them
live. It then builds one page that shows, for each run:

- the result against the expected outcome (pass, partial or fail, with reasons)
- the canvas of the workflow that the builder made
- a replay of the run: the exact terminal screen, or a video of the n8n UI
- the cost
- the LLM steps: one entry for each LLM call, with its tokens (cache read,
  cache write, uncached input, output) and the agent text, reasoning and tool
  calls (with input and output) that the call made

The page uses the light mode of the
[n8n brand guidelines](https://guidelines.n8n.design/).

All scripts are in `scripts/` next to this file. They use only the Python
standard library and the Playwright copy in the repository.

```bash
S="$(git rev-parse --show-toplevel)/.agents/skills/compare-workflow-builders/scripts"
```

## Settings

All settings are in `.env.ai-surfaces` in the repository root. Git ignores
this file. The template is `.env.ai-surfaces.example`, also in the
repository root. The scripts read,
from low to high priority: `.env.local`, `.env.ai-surfaces`, the shell
environment. Empty values are ignored. Thus keys that are already in
`.env.local` work without a change.

If `.env.ai-surfaces` does not exist, copy `.env.ai-surfaces.example` to it. Tell the user
which values to fill in. Never read the values back to the user, never print
them, and never put a secret on a command line.

The most important settings:

| Setting | Use |
|---|---|
| `COMPARE_BUILDERS` | Default builders, for example `iai,claude,codex` |
| `COMPARE_PARALLEL` | `1` (default) runs the builders at the same time. `0` runs them one at a time |
| `COMPARE_LIVE` | `1` (default) opens a live page of the runs. `0` turns it off |
| `COMPARE_LIVE_WINDOWS` | `1` also opens the Instance AI thread and a terminal window for each CLI. Default `0` |
| `COMPARE_RECORD` | `1` (default) records the Instance AI video for the replay. `0` turns it off |
| `COMPARE_CLI_MODE` | `interactive` (default) records the real CLI screen. `headless` uses the JSON event stream |
| `CLAUDE_MODEL`, `CODEX_MODEL` | Model ids. Empty uses the CLI default. A prefix such as `anthropic/` is removed |
| `CLAUDE_API_KEY` | Anthropic key for Claude Code. Falls back to `ANTHROPIC_API_KEY` |
| `CODEX_API_KEY` | OpenAI key for Codex. Falls back to `OPENAI_API_KEY` |
| `N8N_MCP_TOKEN` | MCP key of the n8n user. Optional |
| `LANGSMITH_*` | Instance AI cost and tokens |

## 1. Ask the user

Ask for these two items. If the harness has a structured question tool, use
it. If not, ask in chat. Do not guess them.

1. **Prompt.** The exact text to send to each builder.
2. **Expected outcome.** What a correct result does. Ask for concrete checks,
   for example "WhatsApp trigger", "Gemini compares the question to the FAQ
   sheet", "the false branch makes a Notion ticket and a Slack message".

Use the builders and models from the settings. Ask about them only if the
user wants a change for this run.

## 2. Run the builders

```bash
python3 $S/compare.py --title "<short title>" \
  --prompt-file <file with the prompt> --expected-file <file with the outcome>
```

Write the prompt and the expected outcome to two files with the file tool
first. Do not put them on the command line, because they can contain quotes.
Use `--builders iai,claude` to change the builders for one run. Use
`--rerun <old run dir>` to run the same case again.

The command takes 5 to 30 minutes. Start it in the background if the harness
supports it, and read its output until it ends. It prints one line for each
tool call, with the builder name in front, so the user can follow the run.
It does these steps:

1. Checks the setup and skips a builder that cannot run. It prints the
   reason.
2. Starts the live page (see below).
3. Runs the builders at the same time. `--sequential` or
   `COMPARE_PARALLEL=0` runs them one at a time.
4. Fetches the Instance AI cost from LangSmith.
5. Takes a screenshot of each canvas.
6. Writes `summary.txt` for the judge step.
7. Builds the page without verdicts.

The last output is JSON with `runDir`, `report`, `live`, `parallel`,
`summary`, `models` and `skipped`.

Parallel runs share one n8n instance and one machine. Thus the times of the
builders include the shared load. The page says so in its notes. Use
`--sequential` when the user wants to compare times exactly.

### Watch the runs

`compare.py` starts `live_server.py` and opens its page in the default
browser. It prints `live page: <url>`. Give the user this URL. The page
shows each builder while it runs, and updates every 2 seconds without a
reload:

- the table: status, time, LLM calls, tool calls and tokens of each builder
- **Live:** the real terminal screen of Claude Code and Codex, streamed from
  the tmux recording, and a screenshot of the Instance AI thread every
  2.5 seconds
- the LLM steps of each builder. Claude Code and Codex steps come from the
  session files of the CLIs, with tokens. Instance AI steps come from its
  event stream, without tokens until the run ends

The cost, the canvases and the Instance AI tokens come after the run. When
the report is ready, the page changes to it. The server listens on
`127.0.0.1` only. It stops 30 minutes after the last request, when the run
is done. After you write `verdicts.json` and build the page again, the user
can reload the page to see the verdicts.

Headless mode and clean isolation have no terminal screen. For them, the
page shows only the table and the LLM steps. `COMPARE_RECORD=0` removes the
Instance AI screenshot.

`COMPARE_LIVE_WINDOWS=1` also opens the old live views:

- **Instance AI:** the thread opens in the default browser. The browser must
  be logged in as `N8N_EVAL_EMAIL`, because a thread is visible only to its
  owner. The script answers the confirmation cards, so the user must not
  click them.
- **Claude Code and Codex:** a terminal window shows the real screen of the
  CLI, read-only (`docker exec … tmux attach -r`). In headless mode, the
  window follows `<builder>/live.log` instead. On macOS the window opens in
  Terminal. The first time, macOS asks if the agent's app can control
  Terminal.

Use `--no-live` or `COMPARE_LIVE=0` for runs without a display, for example
in CI.

### Replay on the page

The Replay section shows the last screen of each builder. The play button
on a screen plays that run in place on the page. **Expand** opens a
full-screen player. In that player, the user sees all builders side by
side, or picks one builder, and plays the runs at 1× to 8×:

- **Claude Code and Codex:** `<builder>/screen.cast` is an asciinema
  recording of the exact terminal screen. The page plays it with the
  asciinema player.
- **Instance AI:** `iai/screen.webm` is a video of the thread in the n8n UI.
  A headless browser records it while the run continues.

`COMPARE_RECORD=0` skips the Instance AI video. The terminal recordings come
with interactive mode. `COMPARE_CLI_MODE=headless` has no terminal
recording.

### Canvas on the page

`capture_canvas.mjs` expands the node groups, zooms to fit, and crops the
screenshot to the nodes, their labels and their subtitles. Empty click areas
and hidden hover toolbars do not change the crop. The page shows the canvas
next to the expected outcome, at its real size and at most 360 px high. A
click opens the full image.

### LLM steps on the page

Each run has a list of LLM steps, like the LLM steps view in the Instance AI
debug panel. The list shows the tools or text of each call, its time and a
token bar. Select a step, or use the arrow keys, to see the token counts and
what the call did. Step 1 starts with the user message. Tool output is
collapsed, except when the tool failed.

- **Claude Code:** the session file links each event to its LLM call.
- **Codex:** text goes to the response that wrote it. A tool call goes to the
  response that asked for it. Codex calls the n8n tools from scripts that it
  runs with its `exec` tool. The page shows these scripts too, but does not
  count them as tool calls.
- **Instance AI:** the LangSmith call times place each event. Text times are
  approximate (see the asterisk note on the page).

### When a check fails

- Cannot log in: n8n is not running, or `N8N_BASE_URL`, `N8N_EVAL_EMAIL` or
  `N8N_EVAL_PASSWORD` is wrong.
- The MCP token does not work: n8n shows the full MCP key only once. Ask the
  user to put the key in `N8N_MCP_TOKEN`, or ask before you run
  `python3 $S/prepare.py --rotate`. Rotation makes the old key stop working
  in every other MCP client of this user.
- Docker is not running: Codex is skipped, and Claude runs as a clean
  process.

## 3. Find the prices

Codex reports no cost, and the estimate of Claude Code can be out of date
for new models. Thus, find the published price of each model that a CLI
builder used. The models are in `models` in the output of `compare.py`, and
in `<runDir>/models.json`. Instance AI cost comes from LangSmith, so do not
look up its model.

Do not skip this step. In interactive mode neither CLI reports a cost, so
without prices the page shows "not reported" for both. `build_report.py`
prints `models without a published price in case.json: …` while a model has
no price.

For each model:

1. Search the web for the official price page of the provider, for example
   the Anthropic pricing page or the OpenAI pricing page. Do not use
   third-party price lists if the provider page has the model.
2. Read four prices in USD per million tokens: input, cache read, cache
   write, output. If the provider has no cache-write price, use the input
   price. Anthropic has two cache-write prices. Use the 5-minute price, and
   tell the user that the 1-hour price is higher.
3. If you cannot find the model, write no price for it. The page then shows
   the estimate of Claude Code, or "not reported" for Codex. Tell the user.

Add the prices to `<runDir>/case.json`, with the URL that you used:

```json
"prices": {
  "<model id as in models.json>": {
    "input": 5, "cached": 0.5, "cacheWrite": 6.25, "output": 25,
    "source": "https://..."
  }
}
```

The page calculates the cost of each call from its tokens and shows the
prices and the source links below the runs table.

## 4. Judge each run

Read `<runDir>/summary.txt`. For each run it has the final agent message, the
nodes, the main parameters and the connections. Compare each run with the
expected outcome. Make one check for each item of the expected outcome. Also
check for these common problems:

- a node or branch that is missing or connected in the wrong place
- an expression that points to a field that does not exist
- a workflow that the builder said it made, but that does not exist

Write `<runDir>/verdicts.json`. Use the run folder names as keys (`iai`,
`claude`, `codex`):

```json
{
  "iai": {
    "verdict": "pass",
    "summary": "One sentence about the result.",
    "checks": [
      { "ok": true, "text": "WhatsApp trigger starts the workflow" },
      { "ok": false, "text": "No Slack alert on the false branch" },
      { "ok": null, "text": "Could not confirm the sheet columns" }
    ]
  }
}
```

Use `pass` when all checks pass, `fail` when the main goal is not met, and
`partial` for all other results. Be strict and factual. The page shows these
results to people who did not see the runs.

## 5. Build the page again

```bash
python3 $S/build_report.py <runDir>
```

If the command prints `models without a published price`, do step 3 for
those models and build the page again.

The page is `<runDir>/report/index.html`. It works offline. Give the user the
path, and the `live` URL from the output of `compare.py` while the server
runs. Then, in a few sentences, report:

- the verdict of each builder, with the most important reason
- the cost, time and number of LLM calls of each builder
- builders that were skipped, and data that is missing

## How the builders run

**Instance AI** runs through the REST API of the instance, with its model.
The runner answers every confirmation card with one fixed policy, so runs
can be compared. It approves actions and plans, picks the first option of a
question, allows a domain once, defers workflow and credential setup cards,
and denies access to local files and MCP connections. `iai/run.json` lists
each decision.

**Claude Code and Codex** run in a Docker container (`COMPARE_ISOLATION=container`):

- The container mounts only the run folder of the builder. The builder
  cannot see host files, skills, memory, `CLAUDE.md`, `AGENTS.md` or user
  settings.
- The container has no Linux capabilities and a read-only root file system.
- Claude starts with `--bare`, no built-in tools, and only the `n8n` MCP
  server. Codex gets a new `CODEX_HOME` that holds only the n8n MCP server.
  Its plugins, apps, browser use, computer use and image generation are off.
- The container can still reach the internet and the host network. It needs
  them for the model API and for n8n.

By default the CLIs run in interactive mode (`COMPARE_CLI_MODE=interactive`):

- The normal terminal screen of the CLI runs in tmux, at 120 × 36
  characters. tmux answers the terminal queries of the CLI, and its output
  goes to `screen.cast`.
- The CLIs connect MCP servers in the background. Thus the script pastes the
  prompt when the input box shows, plus a short wait, not as an argument.
- Claude uses `--permission-mode dontAsk`: the n8n tools are pre-approved,
  and all other tools are denied without a question.
- The model key reaches the CLI through a variable that only the CLI reads
  (`apiKeyHelper` for Claude, a provider `env_key` for Codex). Thus no screen
  asks to confirm the key or shows part of it, and no key is in a file.
- The script reads the session file of the CLI for the progress lines, the
  end of the turn, the trace and the tokens. Claude Code then shows no cost
  estimate, so the cost needs the published prices.
- After each run, the script searches the run folder for the model key and
  the MCP token. It prints a warning with the file name if it finds one.

`COMPARE_CLI_MODE=headless` uses `claude -p` and `codex exec` with a JSON
event stream instead.

The first run builds the image `n8n-builder-sandbox` from
`sandbox/Dockerfile`. To get new CLI versions, run
`docker rmi n8n-builder-sandbox`.

`COMPARE_ISOLATION=clean` runs Claude as a clean process on the host: an
empty environment, a new config folder, no built-in tools, and only the n8n
MCP server. It needs an API key, because `--bare` does not read the
subscription login. Codex has no clean mode, because its shell tool can read
the host disk.

## Single steps

`compare.py` calls these scripts. Use them to repeat one step.

| Script | Step |
|---|---|
| `prepare.py` | Check the setup. `--rotate` makes a new MCP key |
| `run_instance_ai.py --out <dir>/iai --prompt-file <file>` | Run Instance AI |
| `run_cli_builder.py --builder claude\|codex --out <dir>/<name> --prompt-file <file>` | Run a CLI builder. `--mode headless` skips the screen |
| `node record_iai.mjs <dir>/iai` | Record the Instance AI video. `run_instance_ai.py` starts it |
| `live_server.py --run-dir <dir>` | Serve the live page and the report of a run folder. Prints nothing. The URL is in `<dir>/live-url.txt` |
| `langsmith_usage.py --run-dir <dir>/iai` | Fetch Instance AI usage |
| `node capture_canvas.mjs <dir>` | Save `workflow.json` and `canvas.png` for each run |
| `summarize_runs.py <dir>` | Print the judge summary |
| `build_report.py <dir>` | Build the page |

If a runner did not find a workflow id, read its trace for the id. Set
`workflowId` in that `run.json`, then run `capture_canvas.mjs` and
`summarize_runs.py` again.

## Notes

- Cost sources: Instance AI cost comes from LangSmith. For Claude Code and
  Codex, the cost is tokens × the published prices in `case.json`. Without a
  price, Claude Code in headless mode shows its own estimate. All other runs
  show "not reported".
  The page lists the source of each cost.
- The workflows stay in the n8n instance. Archive them in n8n when they are
  no longer necessary.
