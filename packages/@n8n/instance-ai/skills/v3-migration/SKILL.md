---
name: v3-migration
description: >-
  Fix an existing workflow so it keeps working on n8n 3.0: replace removed
  nodes, rebuild removed AI Agent modes, rewrite removed expression helpers and
  review behavior changes flagged by the migration report. Load it when the
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
still runs 2.x, so the old nodes still load and run. The migration report lists
one finding per workflow and rule, and re-checks a workflow each time it is
saved, so a correct fix closes the finding by itself.

## Scope

- Fix the finding you were given, in the workflow you were given. Edit that
  workflow in place. Do not build a new workflow and do not touch other
  workflows, even when they have the same finding.
- Keep everything the finding does not need to change: other nodes,
  credentials, pinned data and connections.
- Do not publish on your own. If the workflow is published, the report marks
  the finding fixed as soon as the draft is saved, but the published version,
  which is the one that runs, does not have the fix yet. Say so, and offer to
  publish the fixed version, following the publish rules in `workflow-builder`.

## Process

1. Load `workflow-builder` for the edit mechanics, and in the same turn read
   the workflow with `workflow_builder_workflows(action="get-as-code")` and
   the replacement node's `workflow_builder_nodes(action="type-definition")`.
   Find each affected node from the finding by its name.
2. Decide whether the fix is mechanical or needs the user. It needs the user
   when the old behavior has no exact replacement, when the user's intent
   decides the right fix, or when you would have to guess a value. Then ask
   one focused question with `workflow_builder_ask_user` before you edit.
3. Summarize in two or three sentences: what you changed, anything that
   behaves differently now, and anything the user still has to do (publish,
   test with real data, mark the finding as Won't fix in the report).

## Node replacements

A replacement node keeps the old node's name, because downstream expressions
reference nodes by name. It also takes over the old node's connections,
credentials and settings such as "Always Output Data", "Retry On Fail" and
"On Error".

### Function and Function Item to Code

Most Function code runs unchanged in the Code node. Change only what Code does
not provide, and keep the code's logic as it is: do not refactor or reformat
it.

- Function becomes Code with Mode "Run Once for All Items". Copy the code from
  the `functionCode` parameter. `items` and `$item()` still work in Code.
- Function Item becomes Code with Mode "Run Once for Each Item". In Code,
  `item` is the whole item `{ json, binary }`; in Function Item it was only the
  JSON. Replace each use of `item` with `item.json`, and return
  `{ json: <result>, binary: item.binary }`, because Function Item kept the
  input item's binary data.
- `getBinaryData()` / `setBinaryData()` and their async variants do not exist
  in Code. Read the item's `binary` property instead, and use
  `await this.helpers.getBinaryDataBuffer(itemIndex, propertyName)` when the
  code needs the file content.
- `getWorkflowStaticData(type)` becomes `$getWorkflowStaticData(type)`.

### HTTP Request Tool to HTTP Request

The old tool node used `{placeholder}` markers that the agent filled in, with
the placeholder definitions in a separate list. The replacement is the HTTP
Request node connected to the agent as a tool. Each placeholder becomes a
`$fromAI('<name>', '<description>', '<type>')` expression in the field that
used it. Keep the tool description, method, URL, authentication, headers and
query parameters, and use the old placeholder descriptions as the `$fromAI`
descriptions.

### Other replacements

- Interval to Schedule Trigger: recreate the interval with the same unit and
  value. Schedule Trigger does not support every interval (for example 90
  seconds); pick the closest supported one and tell the user.
- Read Binary File / Read Binary Files to Read/Write Files from Disk. The new
  node outputs file metadata as the item JSON instead of passing the input
  JSON through. If downstream nodes read the old input JSON, add a Merge or
  Edit Fields (Set) step to keep it.
- The old OpenAI node (`n8n-nodes-base.openAi`) to the new OpenAI node.
  Moderation maps to "Classify Text for Violations". Text edit and completion
  have no direct target: use a chat message with instructions, and ask the
  user when the intent is unclear.
- OpenAI Model to OpenAI Chat Model. The old default completion model does not
  exist on the chat endpoint; pick a current chat model and tell the user.
- Manual Chat Trigger to Chat Trigger with public access off. Below version
  1.1, chat runs passed the message as `input`; Chat Trigger passes
  `chatInput` and `sessionId`. Update downstream references such as
  `$json.input`.

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

Replace the node with an AI Agent on the latest version. Reconnect its chat
model, memory, tools and output parser, and carry over the system message and
prompt. For the SQL Agent mode, connect a database tool with the same
credential and move the old SQL prompt into the system message.

## $getPairedItem

Rewrite each `$getPairedItem(...)` call as `$('<node name>').item` for the
paired item of the current item, as `$('<node name>').itemMatching(index)`
inside a Code node, or as `$('<node name>').pairedItem(index)` where the call
passed an index.

## Behavior changes

These findings do not break the workflow, but its output changes. Explain the
change for this workflow and let the user decide. Do not change the workflow
only to clear the finding.

- "Always Output Data" on a node with several outputs: look at what follows
  the first output. If nothing there depends on the empty item, say so; the
  setting can stay, and the user can mark the finding as Won't fix. If a
  branch relies on it, propose turning the setting off and handling the empty
  case explicitly, and apply it after the user agrees. The finding stays open
  while the setting is on.
- Gmail Trigger below version 1.4: first ask whether the workflow relies on
  drafts, on sent mail, or on more than 10 emails per poll. Then update the
  node to version 1.4 and keep its filters. For sent mail, propose a Schedule
  Trigger with Gmail "Get Many messages" and a search such as `in:sent`.
