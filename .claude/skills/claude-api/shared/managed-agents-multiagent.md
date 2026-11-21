# Managed Agents - Multiagent Sessions

A coordinator agent can delegate to other agents within one session. All agents **share the container and filesystem**; each runs in its own **thread** - a context-isolated event stream with its own conversation history, model, system prompt, tools, MCP servers, and skills (from that agent's own config). Threads are persistent: the coordinator can send a follow-up to a subagent it called earlier and that subagent retains its prior turns.

The SDK sets the `managed-agents-2026-04-01` beta header automatically on all `client.beta.{agents,sessions}.*` calls; no additional header is required for multiagent.

---

## When to use it - start with `self`, then add cheaper workers

**If the agent's work splits into independent pieces** - several sources to research, many files or records to process, anything shaped like "look into N things, then summarize" - or one piece would fill its context with reading, **use a multiagent session instead of one long single-threaded loop.** Each delegated piece runs in its own thread with a fresh context window, threads run in parallel in the same container, and only each subagent's report comes back, so the coordinator's context stays small. There is no orchestration code to write: the coordinator is given delegation tools automatically and decides when to use them, and your client still creates one session and reads one stream. For work too big to hand out one task at a time (reviewing hundreds of documents, cross-checking many sources), dynamic workflows fit better than a roster - see § Dynamic workflows below.

**Not for one question at a time.** An agent that answers questions or solves problems one at a time (Q&A over documents, a tutoring solver, a support agent) works out each answer itself: no roster of extra solvers, checkers, voters or auditors that redo or grade the same answer, and no client-side second pass - a re-check loop, another session or another model call - that checks it, votes on it or asks for another answer. This holds however strongly the request stresses accuracy; each extra pass multiplies the cost of every answer. A check in your own code that calls no model - such as confirming each cited quote appears word for word in the source - is fine, and so is sending an answer that fails it back to the same session a few times at most. For accuracy, give the agent the documents and tools it needs, tell it in its `system` prompt to check its own work before it replies, and raise its effort above the model's default (`model: {"id": ..., "effort": ...}` - `shared/managed-agents-core.md` § Effort on the agent model). An advisor the agent consults mid-turn (§ Advisor) is a separate choice, not an extra pass. If the user explicitly asks for a checker, build it and say what it adds to the cost of every answer. A roster or a workflow run is for a question whose work splits into independent pieces: if one question needs many sources or files read, delegating that reading is still fine (Step 1), and a question that spans hundreds of documents can use dynamic workflows.

**Step 1 - the smallest useful roster is the agent itself.** Add a `multiagent` block whose only entry is `{"type": "self"}`. The coordinator can then hand self-contained sub-tasks to copies of itself - same model, system prompt, and tools, minus the ability to delegate further - and combine what they report. Nothing else changes.

```python
agent = client.beta.agents.create(
    name="Research assistant",
    description="Researches a question end to end. A copy can be spawned to own one well-scoped sub-question.",
    model="claude-opus-5-5",
    system="You are a research assistant. When a request splits into independent sub-questions, delegate each to a copy of yourself, one self-contained task per copy, then verify and combine their reports.",
    tools=[{"type": "agent_toolset_20260401",
            "default_config": {"permission_policy": {"type": "auto"}},
            "configs": [{"name": n, "enabled": True} for n in ("web_fetch", "web_search")]}],  # research needs the web
    multiagent={"type": "coordinator", "agents": [{"type": "self"}]},  # the only change vs. a single agent
)

session = client.beta.sessions.create(agent=agent.id, environment_id=env.id)  # unchanged
```

**Step 2 - move the reading-heavy work to a cheaper model.** Delegated research work is mostly searching, reading, and extracting: many input tokens, little hard reasoning. Create a second agent on a smaller current-generation model (Claude Haiku 5.5, or Claude Sonnet 5.5 when the worker needs more judgment) with a narrow `system` prompt and only the tools it needs, and list it next to `self`. A roster entry is only a reference: the worker runs on its own `model`, `system`, and `tools`, and its tokens are billed at its own model's rates. The large model spends its tokens on planning, checking, and synthesis; the small model does the bulk reading.

```python
worker = client.beta.agents.create(
    name="Web researcher",
    description="Fast, low-cost, read-only researcher. Give it one well-scoped question; it searches, reads, and reports findings with sources.",
    model="claude-haiku-5-5",
    system="Answer exactly the question you are given. Search and read as much as you need, then report concise findings with a source URL or file path for every claim.",
    tools=[{
        "type": "agent_toolset_20260401",
        "default_config": {"enabled": False, "permission_policy": {"type": "auto"}},
        "configs": [{"name": n, "enabled": True} for n in ("read", "glob", "grep", "web_fetch", "web_search")],
    }],
)

lead = client.beta.agents.create(
    name="Research lead",
    description="Plans and synthesizes research. A copy can be spawned to own one large sub-analysis.",
    model="claude-opus-5-5",
    system="Plan the work. Delegate each independent, reading-heavy question to Web researcher, one self-contained task per spawn, several in parallel. Keep verification and the final synthesis for yourself; spawn a copy of yourself only for a sub-analysis that needs your full capability.",
    tools=[{"type": "agent_toolset_20260401",
            "default_config": {"permission_policy": {"type": "auto"}},
            "configs": [{"name": n, "enabled": True} for n in ("web_fetch", "web_search")]}],  # the lead verifies sources itself
    multiagent={"type": "coordinator", "agents": [worker.id, {"type": "self"}]},
)
```

**Step 3 - add dedicated specialists.** When the sub-tasks call for different skills, give each its own agent - its own model, a narrow `system` prompt, and only the tools it needs - and roster them by ID next to `self`. Here the lead makes a change itself, sends the same review brief to several read-only reviewer threads for independent passes (one rostered agent can be spawned many times), and hands a test writer a self-contained brief; it then de-duplicates the findings, checks each against the code, and keeps the fix and the summary for itself.

```python
reviewer = client.beta.agents.create(
    name="Concurrency reviewer",
    description="Read-only reviewer for race conditions, deadlocks, lost updates, and retry/idempotency bugs. Give it the changed file paths and the invariants that must hold; it reports findings with file:line evidence. Spawn several on the same change for independent reviews.",
    model="claude-sonnet-5-5",
    system="Review only the files you are pointed at. Look for concurrency bugs: unsynchronized shared state, lock ordering, non-atomic read-modify-write, retries without idempotency. Report each finding as file:line, the interleaving that triggers it, and a suggested fix; say plainly if you found none.",
    tools=[{"type": "agent_toolset_20260401", "default_config": {"enabled": False, "permission_policy": {"type": "auto"}},
            "configs": [{"name": n, "enabled": True} for n in ("read", "glob", "grep")]}],
)
test_writer = client.beta.agents.create(
    name="Test writer",
    description="Writes and runs tests. Give it the module path, the behavior to pin down, and the test command; it adds test files, runs them, and reports results with output.",
    model="claude-sonnet-5-5",
    system="Write focused tests for the behavior you are given, run them with the command you are given, and report pass/fail, the relevant output, and the paths of files you added. Do not edit non-test code; if the code under test looks wrong, report that instead.",
    tools=[{"type": "agent_toolset_20260401", "default_config": {"enabled": True, "permission_policy": {"type": "auto"}},
            "configs": [{"name": n, "enabled": False} for n in ("web_fetch", "web_search")]}],
)
lead = client.beta.agents.create(
    name="Engineering lead",
    description="Plans and makes code changes and integrates specialist reports. A copy can be spawned to own one independent change.",
    model="claude-opus-5-5",
    system="Make the change yourself. Then, in parallel, send the changed paths and invariants to three Concurrency reviewers and the module path and test command to Test writer. Merge and de-duplicate the reviewers' findings, check each against the code before acting on it, fix, and have Test writer re-run. Keep design decisions and the final summary for yourself.",
    tools=[{"type": "agent_toolset_20260401",
            "default_config": {"permission_policy": {"type": "auto"}},
            "configs": [{"name": n, "enabled": False} for n in ("web_fetch", "web_search")]}],
    multiagent={"type": "coordinator", "agents": [reviewer.id, test_writer.id, {"type": "self"}]},
)
```

The same shape fits a pipeline of different specialists: a fast document extractor (for example on Claude Haiku 5.5) that writes one JSON file per input document, a verifier that checks each file against its source, and a lead that applies the corrections and writes the final table to `/mnt/session/outputs/`. Put the input and output paths in every task: threads share the container's filesystem, not each other's conversation.

- **Good fits:** parallel research across sources; reading large amounts of material without filling the coordinator's context; specialists with narrow prompts and tool sets rather than one agent carrying every tool. **Poor fit:** a small single-step task - every delegation costs a round-trip and a re-briefing.
- **Write `name` and `description` for the coordinator to read.** The coordinator chooses whom to spawn from each roster entry's name and description (the `self` entry is listed under the coordinator's own name), so say what each agent is good at and what to hand it. Names must be unique across the roster; don't name an agent `self`.
- **Say how to delegate in the coordinator's `system` prompt** - what to hand off and to whom, how many at once, what to keep for itself, and what is too small to be worth delegating (the *Delegating to subagents* sample prompt in `shared/model-migration.md` is a starting point). Subagents see none of the coordinator's conversation, so each task must carry the paths, constraints, and report format it needs. Spawning returns immediately; the subagent's report arrives in a later coordinator turn.
- **Web tool domain lists layer, never widen.** A roster agent's `web_search` / `web_fetch` calls are bound by its own `allowed_domains` / `blocked_domains`, by those of every agent that called it, and by the coordinator's current lists (allow-lists intersect, block-lists union). Keep each roster agent's allow-list inside the coordinator's - disjoint lists leave the tool present but every call fails `url_not_allowed`. See `shared/managed-agents-tools.md` § Web search & web fetch settings.
- **Too big to hand out one task at a time?** For work like reviewing hundreds of documents, cross-checking many sources, or repeating the same step across many items, turn on dynamic workflows (with or without a roster) - see § Dynamic workflows below.
- **Limits:** 1-20 roster entries (at most one `self`; each rostered agent can be spawned many times), one level of delegation (a roster member must not have its own `multiagent`), and at most 25 child threads per session, idle ones included - archive finished threads if a long session needs more (see *Interrupting and archiving threads* below).

The sections below are the reference for rosters, threads, events, and client-side handling; the platform guide is `https://platform.claude.com/docs/en/managed-agents/multiagent-orchestration.md`.

---

## Declare the roster on the coordinator

`multiagent` is a **top-level field** on `agents.create()` / `agents.update()` - **not** a `tools[]` entry. `agents` lists 1-20 roster entries. (The other variant, `{"type": "multiagent_20261001"}`, puts the roster under `subagents.predefined_agents`, turns dynamic workflows on unless `workflows` is `{"type": "disabled"}`, and turns delegating on unless `subagents` is - for a roster only, use `coordinator`. See § Dynamic workflows.) Nothing changes on `sessions.create()` - the roster is resolved from the coordinator's config.

```python
orchestrator = client.beta.agents.create(
    name="Engineering lead",
    model="claude-opus-5-5",
    system="You coordinate engineering work. Delegate code review to the reviewer and test writing to the test agent.",
    tools=[{"type": "agent_toolset_20260401",
            "default_config": {"permission_policy": {"type": "auto"}},
            "configs": [{"name": n, "enabled": False} for n in ("web_fetch", "web_search")]}],
    multiagent={
        "type": "coordinator",
        "agents": [
            reviewer.id,                                            # bare string - latest version
            {"type": "agent", "id": test_writer.id, "version": 4},  # pinned version
            {"type": "self"},                                       # the coordinator itself
        ],
    },
)

session = client.beta.sessions.create(agent=orchestrator.id, environment_id=env.id)
```

| Roster entry | Shape | Notes |
|---|---|---|
| String shorthand | `"agent_abc123"` | References the latest version of a stored agent. |
| Agent reference | `{type: "agent", id, version?}` | Omit `version` to pin the latest at coordinator save time. |
| Self | `{type: "self"}` | The coordinator can spawn copies of itself. |
| Advisor | `{type: "advisor", model}` | A model the session's primary thread can consult mid-turn. At most one per roster. See § Advisor below. |

If the session was created with `agent_with_overrides` (see `shared/managed-agents-core.md` -> Override agent configuration for a session), those overrides apply to the **coordinator and its `self` copies**. Roster agents referenced by ID always use their own as-created configuration - overrides do not propagate to them.

The coordinator's thread receives delegation tools for working the roster: `list_agents` (see the roster) and `send_to_agent` (task or message a member). Up to **20 unique agents** in the roster; the coordinator may spawn **multiple copies** of each. **One level of delegation only** - and it is enforced rather than silently flattened: rostering an agent that itself has `multiagent` set (either type) fails the create or update with a validation error.

**Inference geo pins must be roster-uniform.** When agents pin an inference geography (`model.inference_geo` - see `shared/managed-agents-core.md` § Pinning inference geography), the coordinator's pin and every roster member's must all be the same value or all be unset. A mismatched roster is a 400 validation error, both when the agent is saved and when a session-create `model` override changes any of the pins.

---

## Dynamic workflows - for work too big to hand out one task at a time

When the agent's job is too big to hand out one task at a time - reviewing hundreds of documents, cross-checking many sources, repeating the same step across many items - turn on **dynamic workflows**. The agent can then write a plan that runs many agents in phases and combines what they return; the server carries out the plan in the background as a **workflow run**, so the agent can keep working or end its turn while the run goes on. This is `multiagent: {"type": "multiagent_20261001", "workflows": {"type": "enabled"}}` on the Managed Agents agent you are writing code for - not Claude Code's own dynamic workflows (its `Workflow` tool).

**If the user has said they do not want dynamic workflows** - in the request, or at any point while you build - leave them off, and say in your closing reply that they are off. For a roster only, use the `coordinator` type; if you use the `multiagent_20261001` type, write `workflows: {"type": "disabled"}`, because workflows are on by default on that type. A user who has said nothing about dynamic workflows has not said no: when the work is too big to hand out one task at a time, turn them on.

**What to tell the user.** When you turn dynamic workflows on, say in your closing reply that they are on, what they do for this job (many agents work through its pieces in phases, in the background, where a roster would have to run them in batches), that every agent in a run uses tokens, so the session needs a budget, and how to turn them off (`workflows: {"type": "disabled"}`, or the `coordinator` type for a roster only).

**An agent can run dynamic workflows with or without a roster and an advisor.** A run's plan can use the agents you list in `workflows.predefined_agents` and define agents of its own; it doesn't use the roster.
- **Roster** (`{"type": "coordinator", "agents": [...]}`, above): the work has several well-scoped tasks, or needs cheaper workers or specialists with their own system prompts and tools. Each agent works in its own session thread, which you can list and stream, and the roster can include an advisor.
- **Dynamic workflows** (`{"type": "multiagent_20261001", "workflows": {"type": "enabled"}}`): the work is too big to hand out one task at a time, with more pieces than a session's 25 child threads can hold at once. Count the pieces in the whole job: if a roster would have to run them in batches to stay under the 25-child-thread limit, use dynamic workflows. The plan can run the agents listed in `workflows.predefined_agents` and agents it defines (see "What a run's agents get", below). You follow the run by its phases and can read each of its threads. The same agent can also have a roster (`subagents`) and an advisor (`advisor`).
- **Neither:** simple or single-step agents, and agents that answer one question at a time when answering needs no fan-out. Every agent in a run uses tokens, so set a session budget when they are on (below).

**To turn it on,** set `multiagent` to the `multiagent_20261001` type with `workflows` enabled. Workflows default to enabled on that type, but write it out. To let a run's plan use agents you've already created, list them: `workflows: {"type": "enabled", "predefined_agents": [...]}` (up to 20, same entry forms as a roster minus the advisor). `workflows.inline_agents` (default `{"type": "enabled"}`) set to `{"type": "disabled"}` stops the plan from defining its own agents; the list then needs at least one agent, or the request is a 400. `subagents` works the same way: `subagents: {"type": "enabled", "predefined_agents": [...]}` is the roster (optional, up to 20), and `subagents.inline_agents` (default `{"type": "enabled"}`) lets the agent also delegate to agents it defines itself; set to `{"type": "disabled"}`, the roster needs at least one agent, or the request is a 400. For an advisor, add `advisor: {"type": "enabled", "model": ...}` to the same block. On this type the advisor is only the `advisor` member - never a `{"type": "advisor"}` entry in `subagents.predefined_agents`. On create, a member you omit takes its default (`workflows` and `subagents` enabled, `advisor` disabled):

```python
agent = client.beta.agents.create(
    name="Contract Reviewer",
    model="claude-opus-5-5",
    system="You review contracts. When you're asked to review more than a few contracts, start a workflow run that reads them in parallel and combines the findings. Review one or two contracts yourself, without a run.",
    tools=[{"type": "agent_toolset_20260401"}],
    multiagent={"type": "multiagent_20261001", "workflows": {"type": "enabled"}},
)
```

In TypeScript:

```typescript
const agent = await client.beta.agents.create({
  name: "Contract Reviewer",
  model: "claude-opus-5-5",
  system: "You review contracts. When you're asked to review more than a few contracts, start a workflow run that reads them in parallel and combines the findings. Review one or two contracts yourself, without a run.",
  tools: [{ type: "agent_toolset_20260401" }],
  multiagent: { type: "multiagent_20261001", workflows: { type: "enabled" } },
});
```

In an `ant apply` agent file, the same `multiagent` block goes in the YAML frontmatter.

**Use the SDK's own types.** The SDK release that adds dynamic workflows has types for the `multiagent_20261001` block (`BetaManagedAgentsMultiagent20261001Params` in Python and TypeScript) and for every `workflow_run.*` event. On an older release, ask the user to upgrade the SDK (Python 0.x to 1.x: `python/claude-api/sdk-upgrade.md`); if they decline, or no release has the types yet, build the request via cURL / `ant` and leave a note to upgrade. Don't cast the block or the events, or silence the type checker, to make an older SDK accept them.

**With workflows on, always add a system-prompt line that says when to start a run.** You describe the work in a `user.message`; the agent writes the plan and decides whether to start a run, so there is no API call that starts one. Turning workflows on gives the agent the ability to start runs, but it should also be prompted to use it. The contract-review agent above uses this system prompt:

```text
You review contracts. When you're asked to review more than a few contracts, start a workflow run that reads them in parallel and combines the findings. Review one or two contracts yourself, without a run.
```

To adapt it, name the kinds of tasks in the agent's domain that call for a run, such as scanning a whole repository or checking many sources, and the small tasks the agent should do itself. Keep runs to the tasks that need them - never "always use a workflow run" - because every agent in a run uses tokens. A user can also ask for a run in a `user.message`.

**The system prompt can also shape how a run does the work.** The agent writes the plan from what its prompt says, so add lines like these when the job calls for them, worded for the agent's domain:
- **A second look, when a miss is costly** (the user stresses accuracy or completeness, or the job is a review, an audit or research): "In a run, use one agent per contract. Then have a second agent review every contract, not only the flagged ones, and look for what the first one missed. Anything that fails review is redone and reviewed again." Reading in parallel and combining gives speed and coverage; the review of every item is what raises quality. It also adds about one more agent per item: say so in your closing reply, and past about 500 items have each agent take several, so that the run stays under its limit of 1,000 (§ Limits). Leave it out when the user wants the job cheap or fast. This is about the items of a run: it doesn't change "Not for one question at a time" (above).
- **When an agent fails:** "One agent failing must not fail the run. List a contract whose agent failed as not covered."
- **The date and time:** a run's agents don't know them. "Take the current time inside the workflow and give the date and time to every agent." Today the plan can read the clock (in UTC; the API doesn't promise it), so this works for an agent that has no `bash`.
- **A time limit:** "Give the run a one-hour time limit." Only the agent can set a run's lifetime (§ Limits), and the default is 24 hours, so ask for a few times what the work should take.

**Tell the user what you built on.** In your closing reply, say that the agent is built on Claude Managed Agents, and, if you turned dynamic workflows on, say so. If you chose Managed Agents because the project already uses it, or because the user's CLAUDE.md or your memory files say they use it, say so in one sentence.

**What a run's agents get.** Each of a run's threads runs an agent listed in `workflows.predefined_agents` or an agent the plan defines. A listed agent runs with its own configuration, as a roster agent does when the coordinator delegates to it. An agent the plan defines gets its system prompt from the plan and runs on the session agent's model. It gets the session agent's `tools`, `mcp_servers`, and skills (all of them today; the API doesn't promise that), and its tools keep their permission policies. With no list, the plan defines every agent it runs. The server creates session threads for the run as its plan needs them (§ Following a run, below).

**Rules:**
- **Updating:** an `agents.update()` that sends the `multiagent_20261001` type to an agent that already has it is merged into the stored block, level by level. Every object you send needs its `type`. A key you omit keeps its stored value. A key you send as `null` goes back to its default, and so does every key inside it. A `predefined_agents` list you send replaces the stored list. A member you send with a `type` other than the stored one (`disabled` to `enabled`, say) is replaced whole, so send its `inline_agents` and `predefined_agents` with it. An update that leaves `multiagent` out keeps it all. Sent to an agent that has the `coordinator` type, the update replaces the whole block, so send the roster again as `subagents.predefined_agents` and the advisor as `advisor`.
- **Turning it off:** send `workflows: {"type": "disabled"}` in an `agents.update()`; it stays off until an update turns it on again. Don't send `workflows: null`: `null` puts a member back to its default, and the default for `workflows` is enabled. For a roster only, switch to the `coordinator` type: a change of type replaces the whole block, so send the roster as `agents`, with any advisor as an entry in it.
- **Existing sessions** copy the setting at create; changing the agent later doesn't change them.
- **An agent with `multiagent` set (either type) can't be rostered** by another agent, or listed in another agent's `workflows.predefined_agents`.
- **An agent with a custom tool named `ant__...` accepts only an update that sends `tools` with no `ant__` name** - rename or remove the tool in the update that turns workflows on. A new session whose agent (after any overrides), or an agent in its roster or in `workflows.predefined_agents`, has such a tool is refused with a 400; existing sessions go on.
- **Budget:** set a session budget when you create the session to cap its spend, runs included - you can't add one to an existing session (`shared/managed-agents-core.md` § Session budgets). Runs pause when the session reaches the budget, and runs the budget paused resume when you raise or remove it.

**Following a run.** You follow a run through its events; you don't see the plan itself or the agent's calls that start and manage runs. These events appear on the primary thread's stream, and listing the session's events returns them too. They have no webhooks.

| Event | Payload highlights |
|---|---|
| `workflow_run.created` | `workflow_run_id` (starts with `wrun_`), the run's `name` (written by the model, or assigned by the server) and `description` (`null` when the plan gives none), `phases` (the plan's declared phases, each with an `id`, a `name` and a `description`); a status event follows |
| `workflow_run.status_running` | `workflow_run_id` - the run is running; sent when the run starts to execute, which can be a while after `created`, and again on each resume after a pause at the budget (a resume after an interrupt might not send it; a run that is idle from the start might get `workflow_run.status_idle` first) |
| `workflow_run.status_idle` | `workflow_run_id` - the run was paused, for example at the session budget (the state's name is `idle`); the event doesn't say why, and a pause after an interrupt might not send it |
| `workflow_run.status_ended` | `workflow_run_id`, `result` (a union on `type`: `{"type": "completed"}`, `{"type": "error", "error": {"type": ..., "message": ...}}`, or `{"type": "stopped"}`) - always the run's last status event |
| `workflow_run.error` | `workflow_run_id` (`null` when no run was created), `error` (`type` and `message`, the same fields as `result.error`) - reports a run's error, or a start the server refused. A start at the limit of open runs (10 by default) is refused with `error.type` `max_workflow_runs_error`, which appears only on this event, with `workflow_run_id` `null`. A run that ends with `result.type: "error"` sends this event first, with the same error, and then `workflow_run.status_ended`; keep tracking the run until `status_ended` arrives |
| `workflow_run.phase_started` | `workflow_run_id`, `workflow_run_phase_id` (today always a phase's `id` in `phases`; the event has no name, so look it up there, and fall back to the id) |
| `workflow_run.phase_ended` | `workflow_run_id`, `workflow_run_phase_id`, `phase_started_id` |

- **Switch on `result.type` first:** `result.type` is `completed` when the plan finished (not a sign the work passed), `stopped` when the agent stopped the run or the session was archived (the event doesn't say which), and `error` when the run couldn't finish. The set of `result.type` values can grow, so treat an unknown one as a run that ended some other way. Only an `error` result has `result.error`, with a `type` and a `message` (a short server-written sentence with no content from the run, safe to log); `status_ended` has no top-level `error` field. `result.error.type` is `timeout_error` when the run's lifetime passed, `program_error` when the plan failed (its code failed, it let a failure on one of its threads (or in creating one) end the run, or it broke a rule for plans other than a limit), `thread_limit_error` when the run went over its thread limit (§ Limits), and `unknown_error` when the server couldn't continue the run, the run went over one of the server's further limits on a plan, or the session terminated on an unrecoverable error; it can gain new values, so treat an unrecognized one as a generic failure (`result.type` is still `"error"`). A failure of something the session depends on (the model, an MCP server, credentials) comes as `session.error` on the failing thread's stream and doesn't end a run by itself; but if it makes one of the run's threads fail and the plan lets that end the run, the run ends with `program_error`, so `program_error` doesn't say whether the plan's own code or a dependency failed.
- **Phases:** `phases` lists the phases the plan declares, and is empty when it declares none. Today the list has all of a run's phases and they run one at a time, in the list's order, each at most once - but the API doesn't promise that, so match a phase's end to its start by `phase_started_id`, not by position, and accept more than one open phase, a started phase that isn't in the list, and listed phases that never start, even in a run that completes (nothing is sent for those). What is promised: every phase that starts also ends, and a phase still open when the run ends gets its `phase_ended` before the run's `workflow_run.status_ended` (after an archive, both are on the event list only). Tell phases apart by `id`, not `name` - names aren't guaranteed unique. Phase events say which phase is open, not whether its work finished; the run's end event says how the run ended.
- **The run's end reaches the agent off the stream.** After `workflow_run.status_ended`, the server sends the agent an *ending notice* and the agent takes a turn on it; that notice is not an event on any stream, so don't wait for an `agent.thread_message_received` from the run.
- **A run's threads:** the server creates session threads for the run as its plan needs them; you can list, read, and stream each one like any child thread (§ Threads) but can't send input to it or interrupt it by its ID (to stop a run's threads, ask the agent to stop the run - § Interrupting with runs open). Its `type` is the ordinary `session_thread`. It carries the run's `workflow_run_id`, as does the `session.thread_created` that announces it, so you can group a run's threads. On every other thread, and on the `session.thread_created` that announces it, `workflow_run_id` is `null`. For an agent listed in `workflows.predefined_agents`, its `agent` is that agent's snapshot, as on a roster agent's thread, so only `workflow_run_id` tells it from a delegated thread. For an agent the plan defines (an inline agent), its `agent` has `type: "inline"` and shows the `name`, `description`, and `system` the plan gave it; its other fields are what that agent runs with (see "What a run's agents get", above); it has no `id`, `version`, or `multiagent`. No event records the thread's result to the plan; its `session.thread_status_terminated`, on the primary stream, tells you the thread is done (not whether it returned a result; a run's thread whose status is `idle` can still continue). Its lifecycle events (`session.thread_created` and the `session.thread_status_*` events, but not the message events) are cross-posted to the primary thread and its thread webhooks are sent, as for any child thread - so tell a run thread's status events from the primary thread's by `session_thread_id` - but a run's threads don't count toward the 25-child-thread limit. The server archives each thread no later than the end of its run, and can archive it as soon as it returns its result or the run finishes with it; if a thread is still running or waiting on your client when the server archives it (at the run's end or earlier), the server first stops it, and a call of that thread that still waits on you is void (§ While a run is open). An archived thread has status `terminated`; no need to archive a run's threads yourself, and while its run is open you can't (400 with `error.details.error_code: "workflow_run_open"`, unless the server has already archived the thread).
- **No endpoint lists runs.** After a reconnect, list the session's events with `types[]` set to `workflow_run.created` and `workflow_run.status_ended` to find the open ones; add `workflow_run.status_running` and `workflow_run.status_idle` to see which are idle (an open run's newest status event, once it has one, says running or idle; `status_running` doesn't mean a thread is at work, and a run paused after an interrupt might still show as running).

**When the work is done.** While a run is running the session stays `running` (no `session.status_idle` except one with `requires_action` when no thread is working and one waits on your client), but a paused run doesn't keep the session `running`, so the idle break gate in `shared/managed-agents-client-patterns.md` Pattern 5 can still fire with paused runs open - and a `retries_exhausted` idle (the agent gave up on an error) can come before or after it read a run's notice, and the idle itself doesn't say which: don't count it as done; if the session goes `running` again on its own, the agent is taking its turn on a notice, so wait for the next idle; otherwise treat it as a failed agent turn - send a `user.message` to let the agent go on, or read each run's result from its `workflow_run.status_ended`. After each run's `workflow_run.status_ended`, the agent takes a turn on the run's ending notice (the notice isn't an event, but the turn's events are; a run ended by the session being archived or terminated gets no notice and no turn - `session.status_terminated` follows instead). The session emits no `session.status_idle` with `stop_reason` `end_turn` until the agent has read the notice, so the work is done at the first such idle with no run open. `requires_action`, `budget_reached`, or `retries_exhausted` idles say nothing about the notice, and an idle your own request causes (an interrupt, for example) doesn't count: if a run ended since the last idle that counted, wait for the next one - after an interrupt, count only an idle that comes after your next `user.message` or `user.define_outcome`; otherwise treat it like any other idle. The agent can start another run in its turn, so check again. With an outcome defined, no evaluation starts while a run is running; the agent's turn on the run's ending notice can start one. A run your interrupt paused is still open, so the work isn't done while it's paused. A run that ends while the session is paused at its budget gets the agent's turn only after you raise or remove the budget.

**A loop that follows runs.** Open the stream, then send the message (`task`: the text of the request). Track each run from `workflow_run.created` to `workflow_run.status_ended`; a `workflow_run.error` is not the end of a run. Answer a custom tool call when it arrives; if the server refuses the answer (a 400), log it and go on. Stop at an idle with `end_turn` when no run is open, or when the session terminates. The loop keeps waiting at every other idle, so handle `budget_reached` and `retries_exhausted` in your own code (see "When the work is done").

```python
open_runs: set[str] = set()
with client.beta.sessions.events.stream(session.id) as stream:
    client.beta.sessions.events.send(
        session.id,
        events=[{"type": "user.message", "content": [{"type": "text", "text": task}]}],
    )
    for event in stream:
        match event.type:
            case "workflow_run.created":
                open_runs.add(event.workflow_run_id)
            case "workflow_run.status_ended":
                open_runs.discard(event.workflow_run_id)
                print(f"Run {event.workflow_run_id} ended: {event.result.type}")
            case "agent.custom_tool_use":
                # you write call_tool(): run the tool and return its result as text
                result = call_tool(event.name, event.input)
                try:
                    client.beta.sessions.events.send(
                        session.id,
                        events=[{
                            "type": "user.custom_tool_result",
                            "custom_tool_use_id": event.id,
                            "content": [{"type": "text", "text": result}],
                        }],
                    )
                except anthropic.BadRequestError as error:
                    # The server can refuse an answer that comes after it archived the call's thread.
                    print(f"Answer to {event.name} refused: {error.message}")
            case "session.status_idle":
                if not open_runs and event.stop_reason.type == "end_turn":
                    break
                # Any other idle: still waiting. Handle budget_reached and retries_exhausted here.
            case "session.status_terminated":
                break
```

```typescript
const openRuns = new Set<string>();
const stream = await client.beta.sessions.events.stream(session.id);
await client.beta.sessions.events.send(session.id, {
  events: [{ type: "user.message", content: [{ type: "text", text: task }] }],
});
loop: for await (const event of stream) {
  switch (event.type) {
    case "workflow_run.created":
      openRuns.add(event.workflow_run_id);
      break;
    case "workflow_run.status_ended":
      openRuns.delete(event.workflow_run_id);
      console.log(`Run ${event.workflow_run_id} ended: ${event.result.type}`);
      break;
    case "agent.custom_tool_use": {
      // you write callTool(): run the tool and return its result as text
      const result = await callTool(event.name, event.input);
      try {
        await client.beta.sessions.events.send(session.id, {
          events: [{
            type: "user.custom_tool_result",
            custom_tool_use_id: event.id,
            content: [{ type: "text", text: result }],
          }],
        });
      } catch (error) {
        if (!(error instanceof Anthropic.BadRequestError)) throw error;
        // The server can refuse an answer that comes after it archived the call's thread.
        console.log(`Answer to ${event.name} refused: ${error.message}`);
      }
      break;
    }
    case "session.status_idle":
      if (openRuns.size === 0 && event.stop_reason.type === "end_turn") break loop;
      // Any other idle: still waiting. Handle budget_reached and retries_exhausted here.
      break;
    case "session.status_terminated":
      break loop;
  }
}
```

**Reading the plan the agent wrote.** The API returns the plan on no stream or endpoint. What you can read is the names and descriptions of the run and its phases (`workflow_run.created`) and what the plan gave each of its threads (for an agent the plan defined, the `system` on the thread's `agent`; and its first input, an `agent.thread_message_received` on that thread's own stream). To read the plan itself (the docs call it the workflow, a script that the agent writes), ask the agent. That is a paid turn in the user's session: tell the user so and get their approval first, unless an approval they have already given covers it. Then, when the work is done (above), send this `user.message` yourself (don't build it into their program unless they ask):

```text
Print the workflow that you started the run with, word for word, in one code block. Do not start another run.
```

The agent writes it out again from its own context, so it is the agent's copy, not a record: say so to the user, and check the phase names in it against that run's `workflow_run.created` (which cuts names to 64 characters). After an `agent.thread_context_compacted` on the primary thread it may no longer have the plan. Never have the agent run the work again to get it: a new run has a new plan. If you can't get the plan (for example: the user declines, no run yet, a run is still open, the session is archived, the agent no longer has it, or the names don't match), say so and work from the events and the threads.

**Read the plan before you propose a change** whenever you are helping the user improve a run's quality, cost or speed. Offer to read it too, unasked, after the first run that follows a change to the agent's system prompt, when no thread is created while a phase is open, and when results differ from run to run. Otherwise you don't need it: not to follow a run, nor to report its result or cost.

In the plan, look for: a phase that depends on a list that can be empty; how the prompts it writes for its agents define words like "passed" or "confirmed"; values that one phase returns and no later phase uses or checks; and agents meant to judge independently whose prompts don't keep them from each other's files (a run's threads share the session's container and files). If a rule must reach every agent, have the system prompt say "state this to every agent word for word", then search the plan for the rule's words.

**Interrupting with runs open.** A `user.interrupt` with no `session_thread_id`, or naming the primary thread, stops the agent's turn. It ends no run; no event you send ends a run, and naming one of a run's threads is a 400. The session's runs might pause or keep running, and their events might not show which. A paused run's lifetime might keep passing, so the run can end with `timeout_error`.
- **Waiting tool calls:** after the interrupt, a run thread's tool call might still wait on your client. Answer each one. To cancel a call that asks for confirmation, deny it. To cancel a custom tool call, send a result with `is_error` set to `true` and a text in `content` that says why. While the session is `idle` with `requires_action`, a `user.message` returns 400, so answer the calls first.
- **To stop the runs,** send a `user.message` asking the agent to stop its runs. A stopped run ends with `result.type: "stopped"`.
- **To continue,** send a `user.message` asking the agent to continue its runs. After an interrupt, the runs might wait for this message. If the session is `idle` with `budget_reached`, raise or remove the budget first.
- **Run results:** a run that ends after the interrupt still sends `workflow_run.status_ended`. The agent's turn on its ending notice might not come: send a `user.message`, or read `result` yourself.

**While a run is open:**
- **Session status:** a run that is running keeps the session `running`, even while none of its threads is working, and no `session.status_idle` arrives except one with `requires_action` (no thread working, one waiting on your client); after a run ends it usually stays `running` through the agent's turn on the notice (a `requires_action` or `retries_exhausted` idle can come first, and an interrupt or the budget can hold the notice). An idle run doesn't keep the session `running`, so with every open run idle the session can report `idle` - at the budget (`budget_reached`) or after an interrupt.
- **Archive and delete** might end the work of a run that is still open. While a run is open, the server might refuse either with a 400 (its `error.details.error_code` can be `"workflow_run_open"`), whatever status the session reports, or might accept it and end the run. So don't send either while you still want a run's work. To archive or delete, first ask the agent to stop its runs, or wait for each run's `workflow_run.status_ended` (a paused run might not end by itself - § Interrupting with runs open); then send the request when the session is `idle`. If the server still refuses, a run is still open or the session is not yet `idle`: check both before you retry. An archive that is accepted ends each run still open with `result.type: "stopped"`; after an archive, a run's `workflow_run.status_ended`, and the `phase_ended` of a phase still open, are on the event list only. After a delete that is accepted, no `workflow_run` event reports the end of the session's runs.
- **Updating the session's `agent`** (`sessions.update()`) returns 400 with `workflow_run_open` while any run is open, paused or not; an interrupt doesn't clear this (it ends no run), so ask the agent to stop its runs, or wait for every run's `workflow_run.status_ended` (a paused run might not end by itself).
- **Tool calls from a run's threads** (a custom tool, a tool confirmation, or a sandbox tool on a self-hosted sandbox) appear on the primary thread's stream. Answer with the `tool_use_id` or `custom_tool_use_id` alone. The event's `session_thread_id` names the run's thread. While the run's other threads are working, the session stays `running` and sends no `session.status_idle`, so don't wait for a `requires_action` idle: act on the tool-use event itself (`agent.tool_use`, `agent.mcp_tool_use`, or `agent.custom_tool_use`) as it arrives. When the run finishes with a thread or ends, a call of that thread that still waits on you is void: the server writes no result for it and can refuse a later tool result with a 400. A tool confirmation that comes too late returns 200, which doesn't mean that the tool ran. After an interrupt the call might still wait on you (§ Interrupting with runs open).
- **Budget:** a run's model requests count toward the session's usage and budget; run events carry no usage figures, but each of the run's threads reports its own `usage`. At the budget every open run pauses and stays open, and each one not already idle gets a `workflow_run.status_idle` (a run that an in-flight model request starts during the pause might get `workflow_run.status_idle` as its first status event, with no `status_running` before it; a run can pause and resume more than once, its `status_running` and `workflow_run.status_idle` events alternating). Raise or remove the budget to resume the runs the budget paused (don't count on that resuming a run your interrupt paused; for those, send a `user.message` asking the agent to resume); each then gets a `workflow_run.status_running`, even one that had no thread at work, and the session reports `running` again unless a call waits on your client. If the session reports `budget_reached` and nothing paused at the budget is still waiting (no run or thread, and no unread ending notice; a notice your interrupt holds doesn't count), the update starts nothing: the session sends a new `session.status_idle` without `budget_reached`. `workflow_run.status_idle` doesn't say why the run is idle (the budget, or your interrupt): to tell whether the budget paused it, check the session's `stop_reason` for `budget_reached`; while it reports `requires_action` instead, look for a `session.thread_status_idle` with `stop_reason` `budget_reached` from one of the session's threads, or compare the session's `usage.list_cost` with its budget. A run that ends while paused gets `status_ended` with no `status_running` before it, so treat its end as the end of the pause too. An interrupt during the pause ends no run - the runs are already paused, so no second `workflow_run.status_idle` follows. A pause might not stop a run's lifetime from passing, so a run that stays paused can end with `timeout_error`.

**Limits** (server-set, not configurable): 64 threads working at once in one run today (the run creates no more until one finishes; the API doesn't promise this number); 1,000 threads over a run's life (a run that goes over the server's limit ends with `result.error.type: "thread_limit_error"`; the number of a run's threads might still pass 1,000, so don't treat 1,000 as a hard ceiling); a run lifetime of 24 hours by default, which a pause might not stop from passing (the agent can give a run a shorter lifetime; your code can't set it; a run that outlives it ends with `result.error.type: "timeout_error"`); 10 runs open at once per session by default, counting idle runs (a start at the limit is refused: the agent's tool call gets an error, no run is created, and a `workflow_run.error` with `workflow_run_id: null` and `error.type: "max_workflow_runs_error"` reports it; no limit on runs over a session's life). Run and phase names are cut to 64 characters and descriptions to 256. The server also limits plans in other ways. A plan the server refuses at the start gets a `workflow_run.error` and no run. After the start, going over one of these other limits ends the run with `result.error.type: "unknown_error"`, and a plan found to break a rule for plans other than a limit ends it with `result.error.type: "program_error"`, each after a `workflow_run.error`.

---

## Threads

The session-level event stream is the **primary thread** - it shows the coordinator's trace plus a condensed view of subagent activity (thread status transitions and cross-thread messages, not every subagent tool call). Drill into a specific subagent via the per-thread endpoints:

| Operation | HTTP | SDK (`client.beta.sessions.threads.*`) |
|---|---|---|
| List threads | `GET /v1/sessions/{sid}/threads` | `.list(session_id)` |
| Retrieve one | `GET /v1/sessions/{sid}/threads/{tid}` | `.retrieve(thread_id, session_id=...)` |
| Archive | `POST /v1/sessions/{sid}/threads/{tid}/archive` | `.archive(thread_id, session_id=...)` |
| List thread events | `GET /v1/sessions/{sid}/threads/{tid}/events` | `.events.list(thread_id, session_id=...)` |
| Stream thread events | `GET /v1/sessions/{sid}/threads/{tid}/stream` | `.events.stream(thread_id, session_id=...)` |

Each `SessionThread` carries `id`, `status` (`running` | `idle` | `rescheduling` | `terminated`), `agent` (a resolved snapshot of the agent config - `id`, `name`, `model`, `system`, `tools`, `skills`, `mcp_servers`, `version` - except advisor threads, whose `agent` is the two-field advisor form `{"type": "advisor", "model": ...}` - see § Advisor - and the threads of agents that a workflow run's plan or the coordinator defines, whose `agent` has the `inline` form: the session agent's config without `id`, `version`, or `multiagent`, and with its own `name`, `description`, and `system`), `parent_thread_id` (null for the primary thread, which is included in the list), `workflow_run_id` (null except on a workflow run's threads - see § Dynamic workflows), `archived_at`, and optional `stats`/`usage`. Per-thread `usage.list_cost` figures do **not** sum to the session total - the session figure additionally includes session running time and each figure is rounded independently; the session-level `usage.list_cost` is authoritative. **Session status aggregates thread statuses** - if any thread is `running`, `session.status` is `running`. Max **25 child threads** per session, idle ones included until archived (advisor threads are exempt - see § Advisor - and so are a workflow run's threads - see § Dynamic workflows). When draining a per-thread stream, break on `session.thread_status_idle` (and check its `stop_reason` as you would for the session-level idle).

**A session budget is one shared cap across all threads** - no per-thread caps. Each thread's consumption is priced at its own served model, and threads pause independently (`stop_reason: budget_reached`) as the shared cap is reached; one thread can pause while another finishes its in-flight request. A thread waiting on `requires_action` outranks the cap at the session level. See `shared/managed-agents-core.md` § Session budgets.

---

## Multiagent events (on the session stream)

| Event | Payload highlights | Meaning |
|---|---|---|
| `session.thread_created` | `session_thread_id`, `agent_name` | A new thread was created. Carries `workflow_run_id`: the run's id for a workflow run's thread, `null` otherwise (§ Dynamic workflows). |
| `session.thread_status_running` | `session_thread_id`, `agent_name` | Thread started activity. |
| `session.thread_status_idle` | `session_thread_id`, `agent_name`, **`stop_reason`** | Thread is awaiting input - or paused at the session's shared budget (`stop_reason: budget_reached`). Inspect `stop_reason` (same shape as `session.status_idle.stop_reason`). |
| `session.thread_status_rescheduled` | `session_thread_id`, `agent_name` | Thread is rescheduling after a retryable error. |
| `session.thread_status_terminated` | `session_thread_id`, `agent_name` | Thread terminated, for example because it was archived or hit an unrecoverable error, or because it was an advisor consultation thread whose consultation ended (see § Advisor). |
| `agent.thread_message_sent` | `to_session_thread_id`, `to_agent_name`, `content` | *This* thread sent a message to another thread. On the primary stream: the coordinator sent a task or follow-up to an agent. |
| `agent.thread_message_received` | `from_session_thread_id`, `from_agent_name`, `content` | A message arrived on *this* thread from another. On the primary stream: an agent sent a report or question to the coordinator. |

> **Direction is relative to the thread whose stream carries the event**, not to the coordinator. The same delegated task is an `agent.thread_message_sent` on the primary stream and an `agent.thread_message_received` on the child's own stream. Reading `_received` as "a subagent finished" is wrong once you're reading a child stream.

---

## Previewing a subagent's text

Each thread's stream accepts the same `event_deltas[]` parameter as the session-level stream, so you can watch a subagent's text as the model generates it:

```
GET /v1/sessions/{sid}/threads/{tid}/stream?event_deltas%5B%5D=agent.message
```

**Previews are thread-scoped.** A child's previews are delivered only on that child's stream and never cross-posted to the session-level stream, whose previews stay scoped to the primary thread. So watching a subagent live means opening its thread stream - the session stream will not show it, no matter what you pass.

> Warning: **Only plain assistant text previews.** A subagent's *reply to its coordinator* rides `agent.thread_message_sent` and is never previewed. A worker that does nothing but report back therefore streams no deltas at all, even with a correct opt-in on the right thread. To get a live preview out of a subagent, its prompt has to make it write the answer as a plain assistant message in its own thread first, and only then report to the coordinator. Run one accumulator per connection, and exit the read loop on `session.thread_status_idle`. Opt-in, accumulate, and reconcile details: `shared/managed-agents-events.md` -> Live previews.

---

## Advisor

An `{"type": "advisor", "model": "<model id>"}` roster entry gives the session's **primary thread** an advisor: a model it can consult mid-turn for strategic guidance (planning an approach, getting unstuck, reviewing work before finishing). The entry has exactly two fields - `type` and `model` - and can sit alongside any other roster forms; a roster with no other entries works too. On the `{"type": "multiagent_20261001"}` variant the advisor is the `advisor` member (`{"type": "enabled", "model": ...}`) instead, never a roster entry. The advisor is also available as a server tool on the Messages API (`advisor_20260301` - see `shared/tool-use-concepts.md` -> Advisor); the Managed Agents surface differs in configuration and delivery: the roster entry has **no `max_uses`, `max_tokens`, or `caching` fields**, and advice arrives through thread events rather than `advisor_tool_result` blocks.

```python
agent = client.beta.agents.create(
    name="Backend engineer",
    model="claude-sonnet-5-5",
    system="You implement backend features end to end.",
    multiagent={
        "type": "coordinator",
        "agents": [{"type": "advisor", "model": "claude-opus-5-5"}],
    },
)
```

(Claude Opus 5.5 is the default advisor choice. It is a redacted advisor - the agent reads its advice server-side, but the client sees `[{"type": "redacted"}]`; see *Plaintext vs redacted delivery* below. For client-readable advice, a plaintext advisor such as `claude-opus-4-8` is valid only when the agent's own model is `claude-opus-4-8` or below - agents on Claude Opus 5.5, Claude Opus 5, Claude Sonnet 5.5, Claude Fable 5.1, or Claude Mythos 5.1 can only pair with redacted advisors, so client-readable advice is not available for them (pairing table: `shared/tool-use-concepts.md`).)

**Rules:**
- **At most one advisor entry per roster.** The entry occupies the reserved roster name `anthropic.advisor` - a roster that also lists a member literally named `anthropic.advisor` is a 400. In responses, the advisor entry is echoed **last** in the roster regardless of submitted position.
- **Pairing is validated at agent save:** the advisor model must meet a minimum capability bar, and the agent's own model must not be more capable than its advisor (equals can pair). Invalid pairing -> 400. The valid pairs mirror the Messages advisor tool's executor<->advisor table (`shared/tool-use-concepts.md`).
- **Only the primary thread consults it.** The advisor is not a roster agent: invisible to the coordinator's `list_agents` tool, unreachable via `send_to_agent`, and roster agents cannot consult it.

**How consultations work.** Each consultation runs as a platform-spawned thread named `anthropic.advisor` that terminates itself when done; the advice is delivered to the primary thread as an `agent.thread_message_received` event. Typical event order (the reserved name rides `agent_name` on lifecycle events and `from_agent_name` on the delivery):

1. `session.thread_created`
2. `session.thread_status_running`
3. `agent.thread_message_received` - the advice
4. `session.thread_status_idle` (`stop_reason: end_turn`)
5. `session.thread_status_terminated`

No `agent.tool_use` and no `agent.thread_message_sent` are emitted for a consultation, and **the advice delivery is not guaranteed to precede the advisor thread's idle/terminated events** - don't treat those as "advice already delivered."

**Plaintext vs redacted delivery.** Whether your client can read the advice is the advisor model's policy, mirroring the Messages advisor tool's result variants: models that return plaintext there deliver readable text content here; models that return redacted results deliver `[{"type": "redacted"}]` as the message content on every client surface, while the agent still reads the full advice server-side. Advisor thinking is never surfaced. Clients cannot send `redacted` blocks themselves - an event containing one is a 400.

**Failure and interruption.** A failed consultation - or one abandoned via a `user.interrupt` carrying the advisor thread's `session_thread_id` - never fails the agent's turn: the agent continues after a generic notice. A session-level `user.interrupt` during a consultation halts the whole session as usual (every thread, primary included), terminating the advisor thread with no advice delivered.

**Threads, billing, caching.** Advisor threads are **exempt from the 25-child-thread limit**. They appear in the session's thread list with `agent` set to the advisor form as configured (`{"type": "advisor", "model": ...}`) and `parent_thread_id` set to the primary thread. Consultations are billed at the advisor model's rates; their tokens appear in the advisor thread's usage and the session's totals. Advisor-side prompt caching is automatic - nothing to configure.

**Removing the advisor:** update the agent with a roster that omits the entry; if the advisor is the roster's only entry, clear the roster with `"multiagent": null`. On the `multiagent_20261001` type, set `advisor: {"type": "disabled"}`; an update that leaves `advisor` out keeps the advisor.

---

## Tool permissions and custom tools from subagent threads

When a subagent needs your client (a tool call that paused for approval - `always_ask`, or `auto` with no determination - or a custom tool result), the request is **cross-posted to the primary thread** with `session_thread_id` identifying the originating thread - so you only need to watch the session stream. Reply with `user.tool_confirmation` (`tool_use_id`) or `user.custom_tool_result` (`custom_tool_use_id`); the server routes by that id, so you do not send `session_thread_id` back.

```python
for event_id in stop.event_ids:
    pending = events_by_id[event_id]
    confirmation = {
        "type": "user.tool_confirmation",
        "tool_use_id": event_id,
        # you write approve(): ask a person or apply your own rule; deny when unattended
        "result": "allow" if approve(pending) else "deny",
    }
    client.beta.sessions.events.send(session.id, events=[confirmation])
```

The same pattern applies to `user.custom_tool_result`. A workflow run's threads cross-post their calls too; answer those as each event arrives, without waiting for a `requires_action` idle (§ Dynamic workflows -> While a run is open).

**`auto` in multiagent sessions.** Only your `user.message` events on the primary thread can lead the server to allow a call it would otherwise deny under `auto`; nothing in a subagent's thread carries that weight (your client posts no messages there, and the coordinator's messages to the subagent carry none). A call the server denies under `auto` is **not** cross-posted - its event and the error tool result appear only on the subagent's own thread stream, and the subagent keeps running.

---

## Interrupting and archiving threads

- **`user.interrupt` without `session_thread_id` interrupts every non-archived thread in the session, including the primary** - it is not a primary-only stop (with dynamic workflows on, § Dynamic workflows -> Interrupting with runs open says what it does to open runs and their threads; an interrupt naming the primary thread does the same). Pass `session_thread_id` to target one thread.
- **Against a child thread blocked on `requires_action`** (for a workflow run's thread, see § Dynamic workflows -> Interrupting with runs open), the interrupt closes each pending tool call with an *error* tool result (`"Tool execution was interrupted before completion. Please retry."`) and re-emits `session.thread_status_idle` with `stop_reason: end_turn` directly - the model is not sampled. Against a thread idle with `end_turn` or `budget_reached`, the interrupt is a no-op; naming a terminated thread is a 400. One more exception: a session on a self-hosted environment whose worker failed the claimed work item (e.g. a memory-store mount error) sits `idle`, and a `user.interrupt` re-queues that work so the next worker claim retries (`shared/managed-agents-self-hosted-sandboxes.md` § Memory stores -> Troubleshooting).
- **Archive requires the thread to be idle, and `requires_action` counts as idle** - a thread parked on a pending tool call can be archived directly. Only a *running* thread must be interrupted first. A workflow run's thread is the exception: it can't be archived while its run is open.

---

## Pitfalls

- **Don't put the roster on `sessions.create()` or in `tools[]`.** `multiagent` is a top-level agent field; update the coordinator, then start a session that references it.
- **Don't assume shared context.** Threads share the filesystem but not conversation history or tools. If the coordinator needs a subagent to act on something, it must say so in the delegated message (or write it to disk).
- **Depth > 1 is a validation error.** Rostering an agent that itself has `multiagent` set (either type, even with workflows disabled) fails the create or update - only the session's coordinator delegates.
- **Don't turn workflows on by accident.** On the `multiagent_20261001` type, `workflows` is enabled by default: when you create the agent or switch it to this type without `workflows` or with `workflows: null`, and when an update sends `workflows: null`. `subagents` is enabled by default too, with its `inline_agents` enabled, so the agent can delegate to agents it defines itself; to keep a roster and stop that, set `subagents.inline_agents` to `{"type": "disabled"}` (`subagents: {"type": "disabled"}` turns the roster off as well). For a roster-only agent use the `coordinator` type, or set `workflows: {"type": "disabled"}`; later updates that leave `workflows` out keep it off.
- **Don't turn on dynamic workflows without a system-prompt line saying when to start a run, and don't make that line unconditional.** The setting gives the agent the ability; the line tells it when to use it. Keep runs to the tasks that need them, because every agent in a run uses tokens. Leave workflows off for simple agents.

For per-language bindings beyond Python, WebFetch `https://platform.claude.com/docs/en/managed-agents/multiagent-orchestration.md` (see `shared/live-sources.md`).
