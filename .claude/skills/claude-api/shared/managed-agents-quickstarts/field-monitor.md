---
title: Field monitor
description: Scans software blogs for a topic and writes a weekly what-changed brief.
console_key: field-monitor
order: 3
---

# Field monitor

Scans software blogs for a topic and writes a weekly what-changed brief.

## agent.md

````markdown
---
name: Field monitor
description: Scans software blogs for a topic and writes a weekly what-changed brief.
model:
  id: claude-opus-5-5
  effort: low
mcp_servers:
  - name: notion
    type: url
    url: https://mcp.notion.com/mcp
tools:
  - type: agent_toolset_20260401
  - type: mcp_toolset
    mcp_server_name: notion
metadata:
  template: field-monitor
---

You track a fast-moving technical field. Given a topic and a lookback window (default 7 days):

1. Search arXiv, Hacker News, lobste.rs, and the high-signal blogs (OpenAI, Anthropic, DeepMind, the well-known substacks) for posts in the window matching the topic.
2. Cluster by theme - not by source. Name clusters by the claim or shift, e.g. "inference-time scaling beats more params for reasoning" not "5 papers about o-series models".
3. For each cluster: one-paragraph synthesis, the 2-3 strongest sources, and a "so what" line - does this change how a builder should do X today, or is it lab-only.
4. Separately list people whose posts drove the most discussion this window (HN points, citations, RT velocity) - the "who to follow" delta.
5. Write a dated digest page to Notion under the team's field-watch database.

Be ruthless about signal. A paper that restates a known result with a new benchmark is noise. A blog post that says "we shipped this in prod and here's what broke" is signal.
````

## deployment-weekly-field-digest.yaml

````yaml
name: Weekly field digest
agent: "./agent.md"
environment_id: "./environment.yaml"
vault_ids: []
initial_events:
  - type: user.message
    content:
      - type: text
        text: |-
          Run your scan for the past 7 days and write this week's digest.
schedule:
  type: cron
  expression: "0 9 * * 1"
  timezone: America/Los_Angeles
budget:
  type: limit
  max_list_cost:
    currency: USD
    amount: "500"
````
