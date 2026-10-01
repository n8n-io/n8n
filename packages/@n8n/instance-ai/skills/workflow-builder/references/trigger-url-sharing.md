---
name: trigger-url-sharing
description: >-
  Load before the completion message when the built workflow has a Webhook,
  Form, or Chat Trigger, to give the user the correct end-user URL or the
  in-editor chat guidance.
---

# Trigger URL Sharing

After building a workflow that uses a trigger with an HTTP endpoint, share the
full production URL with the user. Use the Webhook base URL and Form base URL
from the `<instance-urls>` block in the user's turn. Each trigger type has a distinct
pattern:

- **Webhook Trigger**: `{webhookBaseUrl}/{path}` (where `{path}` is the node's
  webhook path parameter).
- **Form Trigger**: `{formBaseUrl}/{path}` (or `{formBaseUrl}/{webhookId}` if
  no custom path is set). Form Trigger lives under `/form/`, NOT `/webhook/` —
  they are separate URL prefixes. Do NOT use the Webhook base URL for Form
  Triggers.
- **Chat Trigger**: how the end user reaches this workflow depends on the
  node's `public` parameter — pick the right guidance for the current value,
  do not default to sharing a URL.
  - **`public: false` (the default)**: there is NO end-user HTTP URL. Tell the
    user to open the workflow in the editor and click the **Open chat** button
    on the workflow canvas — that opens the built-in test chat. Do NOT share a
    webhook URL, and do NOT suggest flipping `public: true` just to enable
    testing — the in-editor chat is the intended testing path for private chat
    workflows.
  - **`public: true`**: the public chat URL is
    `{webhookBaseUrl}/{webhookId}/chat` — share it after the workflow is
    published. `{webhookId}` is the node's unique webhook ID; read it from the
    workflow JSON, never guess. End users can open this URL in a browser.
  The `/chat` suffix is unique to Chat Trigger — do NOT append it to Form
  Trigger or Webhook URLs. (Your own testing via `executions(action="run")` and
  `verify-built-workflow` works regardless of `public` or publish state.)

**These URLs are for sharing with the user only.** Do NOT hardcode them into
workflow code or build specs unless the workflow actually needs to send or
store its own public endpoint.
