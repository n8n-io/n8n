---
name: credential-setup-with-computer-use
description: >-
  Guides n8n credential setup through Computer Use browser tools. Use when a
  user needs OAuth apps, API keys, client IDs, client secrets, or other
  credential values from an external service console.
recommended_tools:
  - research
  - ask-user
  - browser_connect
  - browser_tab_open
  - browser_navigate
  - browser_snapshot
  - browser_content
  - browser_act
  - browser_click
  - browser_type
  - browser_capture_secret
  - browser_create_credential
---

# Credential Setup With Computer Use

Use this skill only when Computer Use browser tools are available. Handle
credential setup directly with the browser tools — do not use any other browser
bridge.

**Load the `browser-use` skill alongside this one.** It covers how to drive the
browser at all: how to phrase a goal, how to read a `stopReason`, and the
untrusted-page rules. This skill covers only what is specific to getting
credential values out of a provider console and into n8n.

Work the console with `browser_act`, not with individual clicks. Provider
consoles are multi-step by nature — open a dialog, name the thing, set an
expiry, submit — and that is one `browser_act` call with the remaining goal,
not a click-by-click sequence.

## Default Procedure

1. Read n8n credential docs with `research(action="fetch-url")` when a docs URL
   is available. Use `research(action="web-search")` only when docs are missing
   or clearly outdated. Do not navigate the browser to docs.
2. Open the external service console in the browser.
3. Work from the documented setup steps, but adapt to the current UI. Provider
   consoles are reorganised often, so treat the docs as the intent and the page
   as the truth.
4. Ask with `ask-user` when the user must choose a project, app name, account,
   workspace, scope set, description, or resource. Do not invent these values.
5. Continue until the credential can be created in n8n, the user must complete
   a private step, or a real blocker is reached. Reading docs, reaching a
   dashboard, enabling an API, or seeing a settings page is **not** completion.

## Secrets

The capture and create tools exist so a secret never enters model context.
Everything here follows from that.

- Never ask the user to paste passwords, API keys, tokens, client secrets,
  cookies, private keys, or connection strings into chat or `ask-user`.
- When a secret is visible in the browser, call `browser_snapshot` first. Pass
  `interactive: false` when the secret is static page text rather than an
  input, since a non-interactive snapshot includes text that carries no ref.
- Capture with `browser_capture_secret`, using either a snapshot `ref` for an
  input or a `redactedKey` marker such as `[REDACTED:password:1]` for visible
  text.
- Use the same `credentialsKey` for every field of one credential.
- Create the credential with `browser_create_credential`. Literal, non-secret
  values go in `data`; names of captured secret fields go in `resolveData`.
- Do not echo, summarise, transform, or store a secret value yourself.

`browser_act` does not capture secrets and does not type them. Use the
individual tools for the capture step.

## Closeout

After `browser_create_credential` succeeds, call the relevant n8n credential or
workflow setup tool again so the new credential can be selected or applied. If
the user must finish sign-in, 2FA, consent, or manual entry, tell them exactly
what to do in the browser or n8n setup card — without asking for secrets in
chat.
