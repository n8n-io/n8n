# Software factory template pack

This pack expresses a software factory as n8n workflows and agents. One run takes
one Linear ticket to a draft pull request:

ticket → plan → approval → (failing test ∥ workspace) → implement → verify →
fresh critic → minimise → draft PR → Linear comment

The factory uses n8n to build n8n. When you improve the factory, you use the
product.

This pack is a template. A test validates it, but nobody has run it end to end.
The coding steps need capabilities that n8n does not have yet. Read
[What is missing for a live run](#what-is-missing-for-a-live-run) before you
import it.

## Files

| File                                                             | What it is                                                                                                  |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| [software-factory.workflow.json](software-factory.workflow.json) | The factory workflow. Import it into n8n.                                                                   |
| [agents/planner.agent.json](agents/planner.agent.json)           | The planner. It reads the repository, writes the plan and drafts a failing test. It cannot change anything. |
| [agents/implementer.agent.json](agents/implementer.agent.json)   | The implementer. It changes code in a coding session on the n8n repository.                                 |
| [agents/critic.agent.json](agents/critic.agent.json)             | The fresh critic. It reviews the change with read-only tools and a new session.                             |

## How a run works

```mermaid
flowchart LR
    T["Linear Trigger<br/>label: factory"] --> AC{"Acceptance<br/>criteria?"}
    AC -- no --> O["Outcome"]
    AC -- yes --> P["Plan<br/>planner, read-only"]
    P --> H{"Person<br/>approves?"}
    H -- change the plan --> P
    H -- reject or no answer --> O
    H -- approve --> R["Draft failing test<br/>planner"]
    H -- approve --> W["Prepare workspace<br/>coding_prepare"]
    R --> M(("Merge"))
    W --> M
    M --> I["Implement<br/>implementer"]
    I --> V{"Verify<br/>coding_check"}
    V -- "failed, at most 3 retries" --> I
    V -- stop --> O
    V -- passed --> C["Fresh critic<br/>other agent, new session"]
    C -- "request changes, at most 2 rounds" --> I
    C -- "block, error or no verdict" --> O
    C -- approve --> MI["Minimise<br/>implementer"]
    MI --> RV{"Re-verify and<br/>diff budget"}
    RV -- fails --> O
    RV -- passes --> PR["Push branch and<br/>open draft PR"]
    PR --> O
    O --> L["Linear comment and<br/>factory_runs row"]
```

## The steps

| #   | Step         | Nodes                                                                              | What the step does                                                                                                                                                                                                                                                                                                                              |
| --- | ------------ | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Intake       | Linear Trigger, Factory settings, Read factory ticket, Has acceptance criteria?    | Starts a run when an issue is created with the `factory` label or gets the label later. Reads the acceptance criteria and the diff budget. Stops when the ticket has no acceptance criteria.                                                                                                                                                    |
| 2   | Plan         | Plan                                                                               | The planner reads the code with read-only GitHub tools and returns a structured plan: summary, steps, files, tests, risks and an estimate of changed lines.                                                                                                                                                                                     |
| 3   | Approval     | Ask for plan approval, Plan decision, Revise plan                                  | Slack sends the plan to a person and waits up to 3 days. The person approves the plan, asks for changes or rejects the ticket. "Change the plan" sends the feedback back to the planner in the same session.                                                                                                                                    |
| 4   | Prep         | Draft failing test, Prepare workspace, Repro and workspace done, Prep ready?       | Two independent branches prepare the work. The planner drafts one failing test. The coding workspace clones the repository and runs the setup command. The run continues only when both are ready. n8n runs the two branches one after the other. With a background setup job (item 4 below), the setup runs while the planner writes the test. |
| 5   | Implement    | Implementation request, Implement                                                  | The implementer adds the failing test, confirms that it fails and makes the smallest change that makes it pass.                                                                                                                                                                                                                                 |
| 6   | Verify       | Verify, Check result, Fix the failing check                                        | A deterministic check runs the check command of the coding config. When the check fails, the implementer gets the end of the check log. The loop stops after 3 retries.                                                                                                                                                                         |
| 7   | Fresh critic | Get diff, Critic input, Fresh critic, Critic verdict, Address critic findings      | A different agent reviews the diff in a new session. Its input is only the ticket, the acceptance criteria, the plan, the diff and the check result. It returns `{ verdict, findings[{ path, line, severity, body }], scopeCreep[] }`. "request_changes" goes back to the implementer, at most 2 times.                                         |
| 8   | Minimise     | Minimise, Re-verify, Ready for PR?                                                 | The implementer removes scope creep and changes that the criteria do not need. The check runs again. The change must pass, must not be empty and must stay inside the diff budget.                                                                                                                                                              |
| 9   | Pull request | Push branch, Open draft PR                                                         | The branch is pushed and the GitHub node opens a **draft** pull request. A person reviews and merges it. CI runs on the pull request.                                                                                                                                                                                                           |
| 10  | Report       | Outcome nodes, Run record, Report on ticket, Ensure factory_runs table, Record run | Every run ends in one outcome. The outcome goes to the ticket as a Linear comment and to one row in the `factory_runs` data table.                                                                                                                                                                                                              |

The critic findings use the same `path:line (new version)` format as the review
comments of the coding view, so the implementer reads them the same way.

## Hard gates

- **Missing acceptance criteria.** The run stops and the ticket gets a comment.
- **Plan approval.** A person approves each plan. No answer in 3 days stops
  the run.
- **Diff budget.** The default is 400 changed lines. A `budget:<lines>` label on
  the ticket replaces it. A change outside the budget gets no pull request.
- **Tests must run.** Only a `passed` result of the deterministic check
  continues. An agent cannot report its own check result.
- **Critic fails closed.** Only an explicit `approve` with no blocker or major
  findings and a diff that is not empty opens a pull request. A critic error, a
  missing verdict, `block` or a third request for changes stops the run.
- **Author and critic are separate.** The critic is a different agent. It gets
  a new session for each review, it cannot read the data of other nodes and its
  input holds no output of the implementer.
- **Repair caps.** At most 3 check retries and 2 critic repair rounds.
- **A person merges.** The factory opens draft pull requests only.

Each gate checks for positive evidence. When a step fails or returns nothing,
the gate sends the run to an outcome, never to the next step.

## Import the pack

### 1. Import the agents

Do these steps for each file in [agents/](agents/):

1. In n8n, create an agent in the project that will hold the workflow.
2. Open the agent menu (**⋯**) and choose **Import JSON**.
3. Choose the agent file, then choose **Import JSON** again.
4. Choose a credential for the model. The files hold no credentials.
5. For the planner and the critic, open the `github` MCP server and choose a
   Bearer Auth credential. Use a GitHub token that can only read the
   repository.
6. For the implementer, open the coding settings and choose the GitHub access
   token credential. The coding defaults for the n8n repository are already
   set.
7. Publish the agent. Production executions run the published version of an
   agent, not the draft.

An MCP client can also create the agents. Call `create_agent` with the project
id, the name and the rest of the file as `config`.

### 2. Import the workflow

1. Create a workflow. Open the workflow menu (**⋯**), choose **Import**, then
   **From file**, and choose
   [software-factory.workflow.json](software-factory.workflow.json). The file is
   also a valid request body for `POST /api/v1/workflows` of the public API.
2. Open **Factory settings** and set the values:

   | Field                               | Meaning                                                                    |
   | ----------------------------------- | -------------------------------------------------------------------------- |
   | `repositoryOwner`, `repositoryName` | The GitHub repository of the pull request.                                 |
   | `baseBranch`                        | The branch that the pull request targets.                                  |
   | `approvalChannel`                   | The Slack channel for plan approvals.                                      |
   | `n8nMcpUrl`                         | The MCP server URL of your n8n instance: `<your n8n URL>/mcp-server/http`. |
   | `defaultDiffBudget`                 | Changed lines when the ticket has no `budget:<lines>` label.               |

3. On each Message an Agent node, choose the agent:
   - **Plan** and **Draft failing test**: Factory planner.
   - **Implement** and **Minimise**: Factory implementer.
   - **Fresh critic**: Factory critic. Never choose the implementer here.

   The coding nodes (Prepare workspace, Verify, Get diff, Re-verify, Push
   branch) use the agent of the **Implement** node.

4. Choose the credentials. Each node names the credential that it needs:
   - `Linear account`: Linear Trigger and Report on ticket. The trigger needs
     the Admin scope to create the webhook.
   - `Slack account`: Ask for plan approval.
   - `GitHub account`: Open draft PR.
   - `n8n MCP access token`: a Bearer Auth credential with the access token from
     the MCP settings of your instance. The coding nodes use it.
5. In Linear, create the `factory` label. In the Linear Trigger, choose the
   team.
6. Publish the workflow.

The workflow creates the `factory_runs` data table on its first run. It has
these columns: `ticket`, `ticketUrl`, `status`, `summary`, `criticVerdict`,
`linesChanged` (number), `prUrl`, `executionId` and `finishedAt` (date).

## Write a factory ticket

Put the acceptance criteria below a heading or a bold line named "Acceptance
criteria". Each criterion is one list item.

```markdown
Show the number of runs on the workflow card.

## Acceptance criteria

- The workflow card shows the number of runs in the last 7 days.
- The number is 0 for a workflow without runs.
- A unit test covers both cases.
```

Add the `factory` label to start a run. Add `budget:200` to set a diff budget
of 200 changed lines.

## What is missing for a live run

The template calls four MCP tools that n8n does not have yet:

| Tool             | Input                                        | Result                                                                                                                                                                                                                                                                  |
| ---------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `coding_prepare` | `agentId`, `session`, `branch`, `baseBranch` | Clones the repository of the coding config into the sandbox of the session, creates the branch, runs the setup command. Returns `phase` (`ready` on success).                                                                                                           |
| `coding_check`   | `agentId`, `session`                         | Runs the check command. Returns `check`, `checkExitCode`, `changes[{ path, status, additions, deletions }]` and `logTail`, with the field names of `AgentCodingStatus` in [agent-coding.schema.ts](../../../packages/@n8n/api-types/src/agents/agent-coding.schema.ts). |
| `coding_diff`    | `agentId`, `session`                         | Returns the unified `diff` of the branch against its base and `changes`.                                                                                                                                                                                                |
| `coding_push`    | `agentId`, `session`, `branch`, `message`    | Commits all changes with the bot identity and pushes the branch.                                                                                                                                                                                                        |

Until these tools exist, the MCP Client nodes fail. The run then ends with the
outcome `step_failed` before any pull request. These items are missing:

1. **Coding operations that a workflow can call.** The coding service
   ([agent-coding.service.ts](../../../packages/cli/src/modules/agents/agent-coding.service.ts))
   binds every call to the `n8n-user` sandbox principal of the person in the
   coding view. Only session-authenticated internal REST routes expose it
   (`/rest/projects/:projectId/agents/v2/:agentId/coding/*`, see
   [agent-coding.controller.ts](../../../packages/cli/src/modules/agents/agent-coding.controller.ts)).
   There is no public API route and no MCP tool. The operations already exist
   as REST actions (`prepare`, `check`, `commit`, `push`, the status route and
   the per-file diff route). Each one must become an MCP capability that takes
   the sandbox of a workflow session, with the project scopes `agent:read` and
   `agent:execute`.
2. **A sandbox identity for each workflow execution.** This exists in part. A
   Message an Agent node without a session key runs in the sandbox of the
   `workflow-execution` principal, one sandbox per execution. A custom session
   key switches to the `project-session` principal (see
   [agent-sandbox-principal.ts](../../../packages/cli/src/modules/agents/agent-sandbox-principal.ts)
   and [workflow-execute-additional-data.ts](../../../packages/cli/src/workflow-execute-additional-data.ts)).
   So the session key controls both the conversation and the sandbox. The
   template uses the session key `factory-<execution id>-implement` for
   **Implement**, **Minimise** and all coding tools, so that they share one
   sandbox. In the workflow path the implementer works in the default checkout
   of that sandbox, and nothing can create that checkout yet: without it the
   agent stops with "Prepare the repository in the coding view before sending a
   coding task" (see
   [agent-runtime-reconstruction.service.ts](../../../packages/cli/src/modules/agents/agent-runtime-reconstruction.service.ts)).
   A live factory needs a sandbox scope that the workflow sets on its own, for
   example one sandbox for each factory run, apart from the conversation.
3. **A bot git identity.** The commit action uses a fixed identity:
   `n8n coding demo` with the email `coding-demo@example.com`. A live factory
   needs a configured bot name and email for each agent or instance, and a push
   credential that belongs to the bot, not to a person.
4. **Long-running checks with background and poll.** The coding service already
   runs setup and checks in the background, and the coding view polls the
   status. Setup and the check of the n8n monorepo can take up to 30 minutes. A
   workflow cannot hold one MCP call open that long: the MCP request timeout,
   the execution timeout and process restarts end it. The template waits up to
   30 minutes for each coding call so that the shape stays simple. A live
   factory needs durable jobs: a start call returns a job id, a Wait node and a
   status call poll it, and the result survives a restart.

## MCP & up

Every factory step should become one MCP capability, defined once with
`defineCapability` ([capability.ts](../../../packages/cli/src/services/capabilities/capability.ts))
and offered on both surfaces: external MCP clients and the n8n Assistant. Then
Claude Code, Codex, an agent or this workflow can run the same step with the
same permission checks.

| Step                                    | Today in this template                                       | Capability to build                                 |
| --------------------------------------- | ------------------------------------------------------------ | --------------------------------------------------- |
| Accept the ticket and read the criteria | Code node "Read factory ticket"                              | `factory_read_ticket`                               |
| Plan                                    | Message an Agent with the planner                            | `factory_plan` (returns the plan schema)            |
| Prepare the workspace                   | MCP Client: `coding_prepare`                                 | `coding_prepare`                                    |
| Verify                                  | MCP Client: `coding_check`                                   | `coding_check` as a durable job                     |
| Fresh critic                            | Set node "Critic input" and Message an Agent with the critic | `factory_review` (builds the isolated input itself) |
| Minimise                                | Message an Agent with the implementer                        | `factory_minimise`                                  |
| Diff and budget                         | MCP Client: `coding_diff` and an If node                     | `coding_diff`                                       |
| Open the pull request                   | MCP Client: `coding_push` and the GitHub node                | `coding_open_pull_request` (draft only)             |
| Record the run                          | Code node and Data table nodes                               | `factory_record_run`                                |

## Validation

[software-factory-template-pack.test.ts](../../../packages/cli/test/unit/software-factory/software-factory-template-pack.test.ts)
validates the pack. Run it from `packages/cli`:

```bash
pnpm test test/unit/software-factory
```

The test checks that:

- the workflow is a valid body for the public API, and each node type and
  version exists in this repository, with valid parameters;
- each connection names nodes that exist, and the trigger reaches each node;
- each loop has a person or a retry limit of 3 or less;
- a pull request needs the acceptance criteria, the plan approval, the final
  check and an explicit approval of the fresh critic;
- the critic input holds only the ticket, the plan, the diff and the check
  result;
- each credential is a placeholder with a name and no id;
- the code of the Code nodes reads tickets and builds run records correctly;
- each agent file passes the agent JSON config schema with no unknown keys,
  and the checks that run when an agent is saved;
- the critic and the planner have no write tools, and the implementer uses the
  n8n coding defaults.
