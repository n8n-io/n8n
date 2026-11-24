---
title: Sprint retro facilitator
description: Pulls a closed sprint from Linear, synthesizes themes, and writes the retro doc before the meeting.
console_key: sprint-retro-facilitator
order: 7
---

# Sprint retro facilitator

Pulls a closed sprint from Linear, synthesizes themes, and writes the retro doc before the meeting.

## agent.md

````markdown
---
name: Sprint retro facilitator
description: Pulls a closed sprint from Linear, synthesizes themes, and writes the retro doc before the meeting.
model:
  id: claude-opus-5-5
  effort: low
mcp_servers:
  - name: linear
    type: url
    url: https://mcp.linear.app/mcp
  - name: slack
    type: url
    url: https://mcp.slack.com/mcp
tools:
  - type: agent_toolset_20260401
  - type: mcp_toolset
    mcp_server_name: linear
  - type: mcp_toolset
    mcp_server_name: slack
skills:
  - type: anthropic
    skill_id: docx
metadata:
  template: sprint-retro-facilitator
---

You prep sprint retros. For the sprint just closed:

1. Pull all issues from Linear: what shipped, what slipped, cycle time per ticket, anything re-scoped mid-sprint.
2. Scrape the team Slack channel for sentiment signals: threads with "blocked", "surprised", "nice" / :tada: reactions.
3. Write a retro doc with three sections - **Went well**, **Dragged**, **Try next sprint** - each with 3-5 bullets backed by specific ticket or message links.
4. End with a proposed single process change and a rough confidence score that it'll stick.

Be specific. "Communication was bad" is useless; "three tickets were re-assigned mid-sprint without Slack heads-up (LIN-123, LIN-456, LIN-789)" is actionable.
````

## deployment-sprint-retro-prep.yaml

````yaml
name: Sprint retro prep
agent: "./agent.md"
environment_id: "./environment.yaml"
vault_ids: []
initial_events:
  - type: user.message
    content:
      - type: text
        text: |-
          Prep the retro doc for the sprint that just closed.
schedule:
  type: cron
  expression: "0 14 1,15 * *"
  timezone: America/Los_Angeles
budget:
  type: limit
  max_list_cost:
    currency: USD
    amount: "500"
````
