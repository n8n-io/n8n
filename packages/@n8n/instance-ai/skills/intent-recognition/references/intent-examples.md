---
name: intent-examples
description: >-
  Load when a request is hard to classify and worked anchor and embeds_other
  examples would help.
---

# Intent examples

- "Every day at 6pm, pull today's Shopify order count and post it to a
  Discord channel." -> **workflow-anchored**, `embeds_other: false`: fixed
  schedule, source, and destination.
- "When a new Jira issue is created, classify it as bug/feature/question and
  route it to the matching Discord channel." -> **workflow-anchored**,
  `embeds_other: false`: bounded classification feeding fixed routing.
- "Every night, gather the day's failed background jobs, dig into the logs
  and recent deploys to work out why each one failed, and post a write-up to
  a Notion page." -> **workflow-anchored**, `embeds_other: true`: schedule
  and destination are fixed; "work out why" is open-ended investigation, best
  run as an embedded agent step.
- "Give me a chat window where I can ask about our expense-reporting rules
  and get answers pulled from the finance handbook." -> **agent-anchored**,
  `embeds_other: false`: chat interaction, the LLM decides what to look up
  each turn.
- "Build an ops agent that can check server health, restart services via our
  runbook, and file a Jira ticket if it can't resolve things — the restart
  and ticket-filing should also be triggerable manually elsewhere." ->
  **agent-anchored**, `embeds_other: true`: explicitly reusable actions are
  workflows the agent calls as tools.
- "Have an agent keep an eye on our AWS spend throughout the day and flag me
  before we blow through budget, without me asking it to check." ->
  **agent-anchored**, `embeds_other: false`: proactive, heartbeat-driven,
  no fixed check schedule.
- "Build an agent that drafts replies to Notion comment threads and sharpens
  its sense of our tone the more we correct it." -> **agent-anchored**,
  `embeds_other: false`: skill accretion from feedback is first-class.
- "Put an agent in charge of coordinating our office relocation — track
  vendors, follow up with each team lead, and send reminders through our
  existing reminder workflow when a task stalls." -> **agent-anchored**,
  `embeds_other: true`: long-running coordination invoking a workflow tool.
- "Every night, fetch the day's new GitHub stars and send me a digest." ->
  **workflow-anchored**, `embeds_other: false`: fixed schedule, source,
  transform, and delivery.
- "Build me an agent that fetches new GitHub stars each night and sends me a
  digest." -> **agent-anchored**, `embeds_other: false`: the user selected an
  Agent, and the recurring duty is a scheduled task on it.
- "Set up a daily market analyst. It should research market changes, decide
  which developments matter, and send me a briefing each morning." ->
  **agent-anchored**, `embeds_other: false`: a persistent, judgment-driven
  role; the morning cadence is a task on that Agent.
- "Spin up a lightweight workflow that talks to shoppers on our storefront
  and handles their product questions." -> **needs-clarification**: it fits
  the first Close pairs row. Ask that row's question before you build either.
- "Build me an agent that answers customer questions from our docs." ->
  **agent-anchored**, `embeds_other: false`: an n8n Agent, not a workflow with
  a Chat Trigger and an AI Agent node.
- "Give me a chat box where I paste a company name and it runs our
  enrichment steps and replies with the result." -> **workflow-anchored**,
  `embeds_other: false`: chat only triggers a fixed graph.
- "Post every new Airtable record to a Discord channel, and separately set up
  an agent that handles customer refund requests end-to-end." -> two parts:
  **workflow-anchored** posting and an **agent-anchored** refund agent
  (`embeds_other: true`).
- "Transcribe my sales calls and chase the deals that go quiet." -> two parts
  in one sentence: a bounded per-call pipeline (**workflow-anchored**) and an
  ongoing judgment-driven duty (**agent-anchored**).
- "Set up a research helper capable of searching the web, querying our
  internal wiki, pulling numbers from Google Analytics, and drafting a slide
  deck that summarizes the findings." -> one part, **agent-anchored**,
  `embeds_other: true`: many tools but one lifecycle.
- "Tell me how the platform team is progressing against their cycle goals —
  current status is in our issue tracker, the goals are on our internal
  wiki." -> **agent-anchored**, `embeds_other: false`: an on-demand judgment
  report over systems you cannot query. If the user later wants it every
  Friday, it becomes a task on the same agent.
- "Tell me when something important happens with our shipments." ->
  **needs-clarification**: ask whether concrete rules exist or this needs
  judgment-based triage.
- "Ingest each cybersecurity alert, analyze it, and take actions depending on
  the finding." -> **needs-clarification**: ask whether fixed rules select the
  actions or an investigator must choose them.
- "Build me an agent that triages our customers' Instagram messages." ->
  **agent-anchored**; check `agent-context` capabilities first. Instagram is
  absent, so offer an `agent-entrypoint` bridge workflow or a supported
  channel.
- (An existing agent is open in the editor.) "Make it also file a Linear
  ticket when it can't resolve an issue." -> **agent-anchored**: change that
  agent with `agent-builder`.
- (Both an agent and a workflow are open.) "Add a daily summary of new
  signups to the data warehouse." -> **needs-clarification**: ask whether it
  belongs to the agent (a task) or the workflow (a new branch).
