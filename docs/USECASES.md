# n8n Use Cases

A collection of real-world automation use cases with workflow patterns, node recommendations, and implementation tips.

---

## 🗂️ Categories

1. [DevOps & Engineering](#-devops--engineering)
2. [Data & Analytics](#-data--analytics)
3. [Communication & Notifications](#-communication--notifications)
4. [HR & People Ops](#-hr--people-ops)
5. [Sales & CRM](#-sales--crm)
6. [AI & LangChain Workflows](#-ai--langchain-workflows)
7. [Security & Compliance](#-security--compliance)
8. [Customer Support](#-customer-support)

---

## 🛠️ DevOps & Engineering

### 1. GitHub PR Review Notifier
**Trigger:** GitHub webhook (PR opened/reviewed)  
**Nodes:** GitHub Trigger → IF (draft?) → Slack  
**Description:** Sends a Slack message to the team channel when a non-draft PR is opened, tagging the assignees.

```
GitHub Trigger
  └─ IF: draft == false
       └─ Slack: Post message to #eng-reviews
```

**Key nodes:** `GitHub Trigger`, `IF`, `Slack`

---

### 2. Automated Deployment Pipeline Monitor
**Trigger:** Schedule (every 5 minutes)  
**Nodes:** HTTP Request → IF (status != success) → PagerDuty + Slack  
**Description:** Polls a deployment status API and pages on-call if any environment shows a failure.

---

### 3. Jira → GitHub Issue Sync
**Trigger:** Jira webhook (issue created)  
**Nodes:** Jira Trigger → Code (transform) → GitHub (create issue)  
**Description:** Mirrors customer-facing Jira tickets as GitHub issues for engineering teams that work exclusively in GitHub.

---

### 4. Automated Code Metrics Report
**Trigger:** Schedule (Monday 9am)  
**Nodes:** HTTP Request (SonarQube API) → Merge → Google Sheets → Slack  
**Description:** Pulls weekly code quality metrics from SonarQube and posts a summary to the engineering Slack channel.

---

## 📊 Data & Analytics

### 5. CRM → Data Warehouse ETL
**Trigger:** Schedule (nightly)  
**Nodes:** HubSpot (contacts) → Code (transform/clean) → Google BigQuery (upsert)  
**Description:** Extracts HubSpot contact updates and loads them into BigQuery for business intelligence queries.

---

### 6. CSV File Processor
**Trigger:** Manual or Webhook  
**Nodes:** Read Binary File → Spreadsheet File → Code (validate) → Postgres  
**Description:** Accepts CSV uploads via a webhook, validates each row with a Code node, and inserts clean rows into PostgreSQL.

---

### 7. Google Analytics Daily Digest
**Trigger:** Schedule (8am daily)  
**Nodes:** HTTP Request (GA4 API) → Code (format) → Email  
**Description:** Fetches yesterday's website metrics and emails a formatted digest to stakeholders.

---

## 📣 Communication & Notifications

### 8. Multi-Channel Alert Router
**Trigger:** Webhook  
**Nodes:** Webhook → Switch (severity) → Slack / PagerDuty / Email  
**Description:** Routes incoming alert payloads to the right channel based on severity: `info` → Slack, `warning` → email, `critical` → PagerDuty.

---

### 9. Scheduled Newsletter Sender
**Trigger:** Schedule (first Monday of month)  
**Nodes:** Airtable (get records) → Split In Batches → Mailchimp  
**Description:** Pulls the curated content list from Airtable and sends personalised newsletter batches via Mailchimp.

---

### 10. Slack Status Updater
**Trigger:** Google Calendar event start  
**Nodes:** Google Calendar Trigger → Code (compute status) → Slack (update status)  
**Description:** Automatically sets your Slack status to "In a meeting 🗓️" when a calendar event starts and clears it when it ends.

---

## 👥 HR & People Ops

### 11. New Employee Onboarding Workflow
**Trigger:** BambooHR (new hire)  
**Nodes:** BambooHR Trigger → Google Workspace (create account) → Slack (welcome) → Jira (create onboarding tasks)  
**Description:** Provisions a Google account, sends a Slack welcome, and creates a standard onboarding task board on first-day hire.

---

### 12. PTO Request Approver
**Trigger:** Google Forms / Typeform submission  
**Nodes:** Form Trigger → IF (manager approval?) → Slack (DM manager) → Wait (approval) → BambooHR + Slack (confirm)  
**Description:** Collects leave requests via a form, asks the manager for approval via Slack interactive message, then updates HR system.

---

### 13. Org Chart Sync
**Trigger:** Schedule (weekly)  
**Nodes:** BambooHR → Code (build hierarchy) → Notion / Confluence (update page)  
**Description:** Rebuilds the org-chart page in Confluence every week from BambooHR data.

---

## 💼 Sales & CRM

### 14. Lead Scoring & Routing
**Trigger:** HubSpot (new contact)  
**Nodes:** HubSpot Trigger → Code (score) → IF (score > threshold) → Salesforce (create lead) + Slack  
**Description:** Scores incoming HubSpot contacts based on firmographic data, then routes high-value leads to Salesforce and notifies the sales rep.

---

### 15. Contract Expiry Reminder
**Trigger:** Schedule (daily)  
**Nodes:** Salesforce (query expiring contracts) → IF (within 30 days) → Email + Slack  
**Description:** Queries Salesforce for contracts expiring in the next 30 days and sends a reminder to the account owner.

---

## 🤖 AI & LangChain Workflows

### 16. AI Customer Support Triage
**Trigger:** Webhook (incoming support ticket)  
**Nodes:** Webhook → LangChain Agent (classify + draft reply) → Zendesk (add comment) → Slack (notify if escalation)  
**Description:** Uses an LLM to classify the ticket severity and draft a reply, auto-posting it as an internal note with human review before sending.

```
Webhook
  └─ LangChain Agent
       ├─ Tool: Knowledge Base RAG (company FAQ)
       └─ Tool: Zendesk API
            └─ IF: severity == high
                 └─ Slack: Notify support manager
```

---

### 17. Document Summariser
**Trigger:** Manual / Webhook (file upload)  
**Nodes:** HTTP Request (download PDF) → Extract From File → LangChain LLM (summarise) → Notion (save summary)  
**Description:** Takes a PDF URL, extracts its text, summarises it with Claude/GPT, and saves the summary to Notion.

---

### 18. AI-Powered Changelog Generator
**Trigger:** GitHub webhook (release published)  
**Nodes:** GitHub Trigger → HTTP Request (fetch commit diff) → LangChain LLM → Slack + Notion  
**Description:** When a new GitHub release is published, fetches all commit messages since the last release and uses an LLM to generate a structured, human-readable changelog.

---

### 19. Semantic Search over Internal Knowledge Base
**Trigger:** Webhook (user query)  
**Nodes:** Webhook → Embeddings (OpenAI) → Pinecone (vector search) → LangChain LLM (RAG answer) → HTTP Response  
**Description:** Embeds a user's question, retrieves relevant document chunks from Pinecone, and generates a grounded answer using LangChain's RAG pattern.

---

## 🔒 Security & Compliance

### 20. GitHub Secret Scanning Alert Handler
**Trigger:** GitHub webhook (secret alert)  
**Nodes:** GitHub Trigger → Code (parse) → PagerDuty (create incident) + Slack (notify security channel) + Jira (create ticket)  
**Description:** Responds immediately to GitHub secret scanning alerts by creating a P1 incident, notifying the security team, and creating a tracking ticket.

---

### 21. SOC 2 Evidence Collector
**Trigger:** Schedule (first of month)  
**Nodes:** Multiple HTTP Requests (AWS, GitHub, Okta APIs) → Merge → Google Sheets (append evidence) → Slack (notify compliance)  
**Description:** Automatically collects monthly evidence artefacts from cloud providers and security tools for SOC 2 audit purposes.

---

## 🎧 Customer Support

### 22. Zendesk → Jira Bug Bridge
**Trigger:** Zendesk webhook (ticket tagged as `bug`)  
**Nodes:** Zendesk Trigger → Code (extract details) → IF (Jira ticket exists?) → Jira (create or update) → Zendesk (add link)  
**Description:** When a support agent tags a ticket as a bug, it auto-creates or links the corresponding Jira issue and posts the Jira link back to the ticket.

---

## 🧩 Workflow Template Resources

| Resource | URL |
|---|---|
| Official Templates Library | https://n8n.io/workflows |
| AI & LangChain Examples | https://docs.n8n.io/advanced-ai/ |
| Community Workflows | https://community.n8n.io/c/n8n-training/6 |
| Video Tutorials | https://www.youtube.com/@n8n-io |

---

## 💡 Building Your Own Use Case

1. **Start with the trigger** — what event should start the workflow?
2. **Map the happy path** — what nodes does data flow through?
3. **Add error handling** — use the `Error Trigger` node or `Try / Catch` pattern.
4. **Test with real data** — pin test data to each node to iterate safely.
5. **Activate and monitor** — enable the workflow and watch the Executions view.

See [Prompts](./PROMPTS.md) for AI-assisted prompt templates to design these workflows faster.
