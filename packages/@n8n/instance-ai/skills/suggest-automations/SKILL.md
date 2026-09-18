---
name: suggest-automations
description: >-
  Offer the most common automations for a user's role and tools as a
  single-choice card, picked from the use-case corpus in the knowledge base,
  then build the one they choose with their tools. Needs the role id and the
  tools gathered by probe-user. Use when the user asks what they could
  automate or wants ideas for a first workflow.
recommended_tools:
  - ask-user
  - execute_command
  - read_file
  - edit_file
  - nodes
  - build-workflow
---

# Suggest automations

## Input

You need the use-case corpus role id and the user's tools. The `probe-user`
skill gathers both; load it first when either is missing. This skill does not
ask about roles, tools, tasks or pain points.

## The corpus

`${N8N_WORKSPACE_DIR}/knowledge-base/use-cases/<role id>.md` holds the use
cases for one role, most common first. Each entry is a `## <rank>. <title>`
section with the trigger, the tools, a category id, a one-sentence
description and, when one exists, a `Template:` line that names the workflow
source to start the build from. `rank.sh` in the same folder ranks the entries
for the user's tools; you do not read the role file for that. Unknown role
id: `other.md`.

## Tools are interchangeable

An entry's tools are examples, written as `family (example)`. The same
automation works with any tool of the family: swap the node, keep the shape.

`rank.sh` holds the family table and prints, for each entry, which example
the user's tool replaces.

## Flow

1. Run ONE `workspace_execute_command`:
   `bash ${N8N_WORKSPACE_DIR}/knowledge-base/use-cases/rank.sh <role id> "<tool>" "<tool>"`
   with every user tool as its own quoted argument, as the user wrote it. The
   output is the three entries to offer, best first, one per line, tab
   separated: rank, title, template file, tools, swaps, description. Use the
   three lines as they come: do not read the role file, do not score or
   re-rank. `swaps` reads `CRM (HubSpot) -> Pipedrive` when the user's tool
   replaces the example, `notification (Slack) -> Gmail [set NOTIFY=gmail]`
   when the template also holds a ready node for that tool, `CRM (HubSpot) -> ?`
   when the user has no tool of that family, `none` when the entry runs on the
   user's tools as is. Only when every line shows `?` for every family, search
   the other role files for a tool:
   `grep -il "gmail" ${N8N_WORKSPACE_DIR}/knowledge-base/use-cases/*.md`.
2. Write one sentence of text, for example "Here are three automations that
   fit GitHub and Slack.", and no list: the card carries the options. Then
   ONE `ask-user` call with `questions` only: a `single` question "Which one
   should we build first?" whose three options are
   `<title>: <one plain sentence, the trigger then what happens, with the
   user's tool names in place of the examples>`, under 25 words each, no
   Markdown, no n8n node names. Leave `introMessage` out. The card's built-in
   free-text field lets the user describe their own task instead; never add
   "Something else" or "None of these" as an option.
3. Read the answer. A selected option: the title before the colon names the
   entry; build it with the user's tools in place of the examples. Free text:
   treat it as the user's request;
   `grep -il` the corpus for a matching entry and use it as the shape when one
   fits, otherwise build from what the user wrote.
4. Entry with a template file: start from the template. Do not write the
   workflow from scratch and do not load `workflow-builder` for a tool swap.
   The `swaps` column is the whole swap decision; `-> ?` means keep the
   template's tool. Write exactly one line before the first tool call,
   `Building <title> now.`, and no other text until the `build-workflow`
   result: do not report the validate result or the swap decision.
   1. Copy, set the keyed tools and validate in ONE `workspace_execute_command`
      call:
      `mkdir -p src/workflows && cp ${N8N_WORKSPACE_DIR}/knowledge-base/use-cases/templates/<file> src/workflows/<file> && sed -i -e "s/^const NOTIFY = '[a-z]*'/const NOTIFY = '<key>'/" src/workflows/<file> && node --import tsx node_modules/@n8n/workflow-sdk/dist/cli/index.js validate src/workflows/<file>`
      Every `[set NAME=key]` in the swaps column is one `-e` expression
      `s/^const NAME = '[a-z]*'/const NAME = 'key'/`: the template holds one
      ready node per key behind `const NAME`, and the `sed` is the whole swap
      for that family. No `[set ...]` in the swaps column: leave the `sed`
      part out. Never infer a key from a tool name.
   2. Every swap done by the `sed`, or only `-> ?` left: do not read the file,
      call `build-workflow` at once (step 4). Any other swap: read the copy
      with `workspace_read_file`. Every tool node starts with a comment
      `// [family] Tool. Swap for ...` that names the fields the next node
      reads. Swap only the nodes whose tool differs: one
      `nodes(action="search")` and one `nodes(action="type-definition")` for
      the replacement, then rewrite that const's `type`, `version`,
      `credentials` and `parameters` with `workspace_str_replace_file`. Search
      with the product word only, for example `excel`, `outlook`, `sheets`:
      vendor words such as Microsoft or Google match many other nodes. Keep
      the variable name, the position in the chain, the `output` fixture shape
      and the `$json` fields the comment lists. Leave the other nodes as they
      are.
   3. After a `workspace_str_replace_file` swap, run the validate command from
      step 1 again on `src/workflows/<file>`. Fix every error row and run it
      again.
   4. Call `build-workflow` with `filePath: "src/workflows/<file>"` and the
      entry title as `name`. Then follow `postBuildFlow.instructions` from the
      result.
   Load `workflow-builder` only when the user asks for more than a tool swap,
   for example another trigger or an extra step.
5. Entry without a template, or free text with no matching entry: load
   `workflow-builder` and build the normal way. Ask about a tool only for a
   family the user's list does not cover, one question per turn.

## Rules

- Keep every message under four sentences.
- Talk about the automation, never about the mechanics. Do not say
  "template", "swap", "copy", "validate", "workspace" or a file name in a
  message. Say what is being built and what the user gets, for example
  "Building the reminder now."
- If nothing in the corpus fits what the user wrote, say that you build from
  their description.
- Never ask for credentials, keys, or passwords in chat.
- Reply in the language the user writes in.
