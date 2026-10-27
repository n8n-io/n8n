---
name: v3-migration
description: >-
  Fix an existing workflow so it keeps working on n8n 3.0: replace removed
  nodes, rebuild removed AI Agent modes, rewrite removed expression helpers and
  review behavior changes flagged by the migration report. The system preloads
  it when the user opens a finding from the migration report. Load it when the
  user asks to migrate or update a workflow for n8n 3.0 or v3.
recommended_tools:
  - workflow_builder_workflows
  - workflow_builder_build_workflow
  - workflow_builder_nodes
  - workflow_builder_executions
  - workflow_builder_ask_user
---

# n8n 3.0 Migration

The user wants an existing workflow to keep working on n8n 3.0. The instance
still runs 2.x, so the old nodes still load and run. The migration report
scans every workflow against the 3.0 breaking changes and lists one finding per
workflow and rule. The report re-checks a workflow each time it is saved, so a
correct fix closes the finding by itself.

These instructions are in English, but user-visible text you write while
following them stays in the user's conversation language.

## Scope

- Fix the finding you were given, in the workflow you were given. Edit that
  workflow in place. Do not build a new workflow and do not touch other
  workflows, even when they have the same finding.
- Keep everything the finding does not need to change: other nodes, node names,
  positions, credentials, pinned data and connections. Downstream expressions
  reference nodes by name, so a replacement node keeps the old node's name.
- Do not publish or activate the workflow. Saving updates the draft; the user
  decides when to publish. Say so in your summary when the workflow is
  published, because the published version still has the old node until then.
- If a migration needs settings outside the workflow (environment variables,
  credentials secrets, an external chat client), explain what the user has to
  change and do not edit the workflow.

## Process

1. Load `workflow-builder` for the edit mechanics, and in the same turn read
   the workflow with `workflow_builder_workflows(action="get-as-code")` and
   the replacement node's `workflow_builder_nodes(action="type-definition")`.
   Find each affected node from the finding by its name.
2. Decide whether the fix is mechanical or needs the user. It needs the user
   when the old behavior has no exact replacement, when the user's intent
   decides the right fix, or when you would have to guess a value. Then ask
   one focused question with `workflow_builder_ask_user` before you edit.
3. Edit the bound source file and save it with
   `workflow_builder_build_workflow`, as `workflow-builder` describes for
   existing workflows. The save shows an approval card; that is expected.
4. Verify when it is safe: if the workflow has a manual trigger, or pinned data
   that reaches the changed nodes, run it with `workflow_builder_executions`
   and compare the output shape with what downstream nodes read. Do not run a
   workflow whose nodes send email, post messages, write to external systems
   or charge money without asking first.
5. Summarize in two or three sentences: what you changed, anything that
   behaves differently now, and anything the user still has to do (publish,
   test with real data, mark the finding as Won't fix in the report).

## Node replacements

A replacement node keeps the name of the node it replaces, and takes over its
incoming and outgoing connections, credentials and settings such as "Always
Output Data", "Retry On Fail" and "On Error".

### Function and Function Item to Code

The Code node runs JavaScript in a different sandbox. Copying the code is not
enough: every parameter maps, but the code fails at runtime.

- Function becomes Code with Mode "Run Once for All Items". Read the old code
  from the `functionCode` parameter. Replace the `items` global with
  `$input.all()`. Each item keeps the `{ json, binary }` shape, and the code
  must still return an array of items.
- Function Item becomes Code with Mode "Run Once for Each Item". Replace the
  `item` global, which was the item's JSON, with `$json`, or with
  `$input.item.json` where the code assigns to it. Return the item as
  `{ json: ... }`.
- `$item(index)` becomes `$('<node name>').itemMatching(index)` or
  `$input.all()[index]`, depending on which node the code reads.
- `getBinaryData()` / `setBinaryData()` and the async variants have no global
  in Code. Use `$input.item.binary` / `item.binary`, and
  `await this.helpers.getBinaryDataBuffer(itemIndex, propertyName)` when the
  code needs the file content.
- `getWorkflowStaticData(type)` becomes `$getWorkflowStaticData(type)`.
- Keep the code's logic as it is. Do not refactor or reformat it.

### HTTP Request Tool to HTTP Request

The old tool node used `{placeholder}` markers that the agent filled in, with
the placeholder definitions in a separate list. The replacement is the HTTP
Request node connected to the agent as a tool. Each placeholder becomes a
`$fromAI('<name>', '<description>', '<type>')` expression in the field that
used it. Keep the tool description, method, URL, authentication, headers and
query parameters. Keep the old placeholder descriptions as the `$fromAI`
descriptions.

### Other replacements

- Interval to Schedule Trigger: recreate the interval with the same unit and
  value. Schedule Trigger aligns to clock time and does not support every
  interval (for example 90 seconds); pick the closest supported interval and
  tell the user.
- Read Binary File / Read Binary Files to Read/Write Files from Disk with Read
  File(s) From Disk. The new node outputs file metadata as the item JSON
  instead of passing the input JSON through. If downstream nodes read the old
  input JSON, add a Merge or Edit Fields (Set) step to keep it.
- Convert to/from binary data to Convert to File (Move Base64 String to File)
  or Extract From File (Move File to Base64 String), depending on the old
  mode.
- OpenAI (the old `n8n-nodes-base.openAi` node) to the new OpenAI node.
  Text edit, moderation and completion operations have no direct target; use
  a chat model message with instructions, and ask the user when the intent is
  unclear.
- OpenAI Model to OpenAI Chat Model. The old default completion model does not
  exist on the chat endpoint; pick a current chat model and tell the user.
- OpenAI Assistant to the OpenAI node with the Assistant resource. Creating a
  new assistant from instructions is a separate operation: split it into two
  nodes when the old node used it.
- Manual Chat Trigger to Chat Trigger with public access off. The output
  changes from `{}` to `{ sessionId, action, chatInput }`; check downstream
  references.
- Chat Messages Retriever to Memory Manager with Operation Mode "Get Many
  Messages".
- SerpApi (Google Search) to the verified SerpApi community node. If that node
  is not installed, tell the user how to install it, or offer an HTTP Request
  tool that calls the SerpApi search API with the same credential values.

### Removed nodes with no replacement

LangChain Code, Motorhead, Zep, Orbit and the GitHub Document Loader have no
direct replacement. Do not guess. Explain what the node did in this workflow
and ask the user to choose between the options that fit:

- LangChain Code: AI Agent or Basic LLM Chain with sub-nodes for custom chain
  or agent logic, an Embeddings sub-node for custom embeddings, the Evaluation
  node with Set Metrics for custom metrics, the Load mode of a Vector Store
  node for loading documents, and the Code node for plain data manipulation.
- Motorhead and Zep memory: another chat memory sub-node (for example
  Postgres, Redis or Simple Memory). Existing conversation history does not
  move.
- GitHub Document Loader: fetch the files with the GitHub node or HTTP
  Request, then load them with the Default Data Loader.

## AI Agent modes

AI Agent versions below 2 are removed, and with them the Conversational,
OpenAI Functions, Plan and Execute, ReAct and SQL Agent modes. Replace the node
with an AI Agent on the latest version, with the same name. Reconnect its chat
model, memory, tools and output parser. Carry over the system message and
prompt. For the SQL Agent mode, connect a Postgres, MySQL or other database
tool with the same credential so the agent can still query the database, and
move the old SQL prompt into the system message.

## Execute Sub-workflow sources

The "Local File" and "URL" sources are removed. Prefer the "Database" source:
ask the user whether the sub-workflow already exists on this instance and
which one it is, and select it by id. If it does not exist, the user can
import it first. Otherwise, use the "Parameter" source and paste the workflow
JSON, if the user gives it to you.

## $getPairedItem

Rewrite each `$getPairedItem(...)` call with the documented forms:
`$('<node name>').item` for the paired item of the current item,
`$('<node name>').itemMatching(index)` inside a Code node, and
`$('<node name>').pairedItem(index)` where the code used the explicit index.

## Behavior changes

These findings do not break the workflow, but its output changes. Explain the
change in terms of this workflow and let the user decide.

- "Always Output Data" on a node with several outputs (If, Switch, a node with
  an error output). Today the node adds an empty item to its first output even
  when another output has data. On 3.0 it adds the empty item only when every
  output is empty. Look at what follows the first output. If nothing there
  depends on the empty item, say so; the setting can stay, and the user can
  mark the finding as Won't fix. If a branch relies on it, propose the change
  (for example turning the setting off and handling the empty case explicitly)
  and apply it after the user agrees. The finding stays open as long as the
  setting is on.
- Gmail Trigger below version 1.4. On 3.0 each poll emits at most "Max Emails
  per Poll" emails (default 10), drafts trigger only with "Include Drafts", and
  sent and scheduled emails no longer trigger the workflow. Update the node to
  version 1.4 and keep its filters. Ask whether the workflow relies on drafts,
  on sent mail, or on processing more than 10 emails per poll. For sent mail,
  propose a Schedule Trigger with Gmail "Get Many messages" and a search such
  as `in:sent`.

## After an automated migration

The report sometimes runs an automated migration first. When the context says
it refused, the migration changed nothing: do the replacement yourself, and
handle the part the migration could not carry over (usually an expression in a
field it maps exactly). When the context says it migrated with notes or
unmapped parameters, the replacement is already saved: read the workflow
again, check each note and unmapped parameter against the new node, and fix
what the user needs, instead of replacing the node again.
