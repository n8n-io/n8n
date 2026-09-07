# Routing examples

- "Every day at 6pm, pull today's Shopify order count and post it to a
  Discord channel." -> **workflow-anchored**, `embeds_other: false`: fixed
  schedule, source, and destination.
- "When a new Jira issue is created, classify it as bug/feature/question and
  route it to the matching Discord channel." -> **workflow-anchored**,
  `embeds_other: false`: bounded classification feeding fixed routing (would
  have been **hybrid** under the old taxonomy).
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
- "Configure an AI agent to send me a nightly digest of new GitHub stars."
  -> **workflow-anchored**, `embeds_other: false`: fixed schedule and action
  despite the word "agent" — a false friend. When the user instead
  explicitly asks to *build an agent* around a fixed pipeline like this,
  propose a workflow and obtain agreement before changing the requested
  artifact (step 1).
- "Spin up a lightweight workflow that talks to shoppers on our storefront
  and handles their product questions." -> **agent-anchored**: chat-based
  Q&A means the LLM owns turn-by-turn control despite the word "workflow" —
  propose the agent alternative and obtain agreement before changing the
  requested artifact.
- "Build me an agent that answers customer questions from our docs." ->
  **agent-anchored**, `embeds_other: false`: explicit agent artifact
  request plus chat-shaped open-ended Q&A. The deliverable is an n8n Agent
  — not a workflow with a Chat Trigger and an AI Agent node.
- "Give me a chat box where I paste a company name and it runs our
  enrichment steps and replies with the result." -> **workflow-anchored**,
  `embeds_other: false`: chat is merely the manual trigger for a fixed
  graph — the one case where a Chat Trigger workflow is the right build.
- "Post every new Airtable record to a Discord channel, and separately set up
  an agent that handles customer refund requests end-to-end." -> two parts,
  joined only by topic, not data or trigger: "Airtable-to-Discord posting"
  (**workflow-anchored**, `embeds_other: false`) and "refund-handling agent"
  (**agent-anchored**, `embeds_other: true`).
- "Transcribe my sales calls and chase the deals that go quiet." -> two
  parts despite the plain single sentence: transcription is a bounded
  per-call pipeline (**workflow-anchored**, `embeds_other: false`), while
  chasing stalled deals is an ongoing judgment-driven automation with its
  own lifecycle (**agent-anchored**).
- "Set up a research helper capable of searching the web, querying our
  internal wiki, pulling numbers from Google Analytics, and drafting a slide
  deck that summarizes the findings." -> one part, **agent-anchored**,
  `embeds_other: false`: use independent direct tools within one agent
  lifecycle. No single tool call requires an ordered multi-node procedure.
  Do not split on tool count.
- "Tell me how the platform team is progressing against their cycle goals —
  current status is in our issue tracker, the goals are on our internal
  wiki." -> **agent-anchored**, `embeds_other: false`: an on-demand judgment
  report when no suitable direct tools are available and the user wants a
  reusable capability. The artifact is an
  agent with tracker and wiki tools the user can ask again anytime — not a
  manual-trigger workflow whose only real step is an embedded agent with
  those same tools. If the user later wants it every Friday, that becomes a
  scheduled task on the same agent, not a conversion to a workflow.
- "Tell me when something important happens with our shipments." ->
  **needs-clarification**: "important" is undefined; ask whether concrete
  rules exist or this needs judgment-based triage.
- "Build me an agent my team can @mention on WhatsApp to triage customer
  messages." -> **agent-anchored** (explicit agent artifact + chat
  interaction), but call `list-agent-capabilities` first: WhatsApp is absent,
  so do not build. Explain WhatsApp is unsupported for agents, offer the
  supported chat channels the tool returned, with their
  `capabilities`, and ask which to use — or whether the user wants a
  workflow path instead. Do not improvise a workflow with a WhatsApp node
  and do not claim the channel is configured.
- (An existing agent is open in the editor.) "Make it also file a Linear
  ticket when it can't resolve an issue." -> **agent-anchored**: the open
  agent is the target; route to `build-agent` targeting that agent to add the
  capability. Do not start a workflow build, even though a workflow could
  also file a ticket — the user asked to change the agent.
- (Both an agent and a workflow are open.) "Add a daily summary of new
  signups to the data warehouse." -> **needs-clarification**: ask whether
  the summary belongs to the agent (a scheduled task on it) or the workflow
  (a new branch in the graph); do not assume the workflow.
