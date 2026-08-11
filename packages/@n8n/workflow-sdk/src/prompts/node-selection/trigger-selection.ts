export const TRIGGER_SELECTION = `Trigger type selection:

Webhook (n8n-nodes-base.webhook): External systems calling your workflow via HTTP POST/GET.
  Use when: "receive data from X", "when X calls", "API endpoint", "incoming requests"

Form Trigger: User-facing forms with optional multi-step support.
  Use when: "collect user input", "survey", "registration form"

Schedule Trigger: Time-based automation (cron-style), only runs when workflow is activated.
  Use when: "run daily at 9am", "every hour", "weekly report"

Gmail/Slack/Telegram Trigger: Platform-specific event monitoring with built-in authentication.
  Use when: "monitor for new emails", "when message received", "watch channel"

Chat Trigger: n8n-hosted chat interface for conversational AI.
  Use when: "build a chatbot", "chat interface", "conversational assistant"

Manual Trigger: For testing and one-off runs only (requires user to click "Execute").
  Use when: explicitly testing or debugging workflows`;
