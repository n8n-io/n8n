---
name: webpage-builder
description: >-
  Load before building or editing a workflow that serves a web page: a landing
  page, website, portfolio, docs or handbook page, or any other HTML page that
  people open in a browser. Then load workflow-builder before build-workflow.
recommended_tools:
  - nodes
  - build-workflow
---

# Webpage Builder

## Routing

Load this skill, then `workflow-builder`, before `build-workflow`. For pages,
these rules replace the Webhook → Code → Respond to Webhook pattern of the
`web_app` best practice, except where this skill says otherwise.

## Pick the shape

- **Static page** (landing page, website, portfolio, docs, handbook, event
  page): use one Webpage node (`n8n-nodes-base.webpage`). Put the complete page
  in its `html` parameter. Add no other nodes. A page view runs nothing.
- **Page that shows live data**: keep the page in a Webpage node. In the same
  workflow, add a Webhook (`responseMode: 'responseNode'`) → data nodes →
  Respond to Webhook (JSON). The page script calls that webhook with `fetch()`.
- **HTML that the server must build for each request**: use the `web_app` best
  practice instead of a Webpage node.

## Configure the node

Read `nodes(action="type-definition")` for `n8n-nodes-base.webpage` and obey
its `@builderHint` notes. Create it with `trigger()`.

- `path`: use the path that the user names, without a leading slash (`my-page`
  for `/my-page`). If the user names no path, use a short kebab-case slug.
- `authentication`: keep `none`. Set `n8nOAuth2` only when the user asks that
  only signed-in n8n users can open the page. Then only users who can run this
  workflow can open it.
- Page authentication protects only the HTML. The page script cannot send n8n
  credentials, so a Webhook that the page calls with `fetch()` must keep
  authentication `none`, and its URL stays public. When the user asks for a
  signed-in-only page that shows private data, use the `web_app` best practice
  instead: set `authentication: 'n8nOAuth2'` on the Webhook that serves the
  HTML, and put the data in the HTML on the server. If you keep a Webpage with a
  data Webhook, tell the user that the data URL is public.
- `html`: write a complete HTML5 document with real copy for the request. Do
  not use lorem ipsum or `placeholder()`. Inline `<style>`, inline `<script>`
  and CDN links are allowed.
- Do not set `width` or `height`. The canvas sets them.

Example of a static page. One Webpage node is a complete workflow:

```ts
const page = trigger({
  type: 'n8n-nodes-base.webpage',
  version: 1,
  config: {
    name: 'Landing Page',
    parameters: {
      path: 'my-page',
      html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Acme Notes</title>
  <style>
    body { margin: 0; font-family: system-ui, sans-serif; color: #1f2937; }
    main { max-width: 720px; margin: 0 auto; padding: 64px 24px; }
  </style>
</head>
<body>
  <main>
    <h1>Notes your whole team can find</h1>
    <p>Acme Notes keeps meeting notes, decisions and docs in one searchable place.</p>
    <a href="https://example.com/signup">Start for free</a>
  </main>
</body>
</html>`,
    },
  },
});

export default workflow('id', 'name').add(page);
```

## Write the HTML

- Put the HTML in a template literal in the workflow source file. Escape each
  backslash (`\\`), each backtick (`` \` ``) and each `${` (`\${`) in the
  HTML. Escape backslashes first. For example, the regex `/\d+/` in a page
  script becomes `/\\d+/` in the source, and `'\n'` becomes `'\\n'`. Do not
  use `readFileSync`, `__dirname` or imports.
- n8n serves the HTML as is and does not resolve n8n expressions. Do not put
  `{{ $json... }}` in the page.
- To change the page later, edit only the changed part of the HTML with
  `workspace_str_replace_file`. Then call `build-workflow` again.

## Browser sandbox

n8n serves the page, and the canvas shows it, in a sandbox with an opaque
origin:

- The page cannot use cookies, `localStorage` or `sessionStorage`. Keep state
  in memory.
- The page cannot use the visitor's n8n session or call the n8n API.
- The page can call webhooks of this instance with `fetch()` and an absolute
  URL: `{webhookBaseUrl}/{path}`. Keep the allowed origins of the Webhook at
  the default.
- Show messages in the page. Do not use `alert()`, `confirm()` or `prompt()`.

## Verification and the page URL

- A workflow with only Webpage nodes has nothing to run. `build-workflow` then
  reports `verificationReadiness.status: "not_verifiable"`. This is correct. Do
  not run the workflow and do not warn the user about verification.
- The page URL is `{webhookBaseUrl}/{path}`. If `path` is empty, it is
  `{webhookBaseUrl}/{webhookId}`. Read the Webhook base URL from the
  `<instance-urls>` block. Read the `webhookId` from the workflow JSON.
- The page is live only after the user publishes the workflow. Until then, the
  canvas shows a preview. Tell the user both, and give the URL.
- In progressive building, an increment with only Webpage nodes has no
  execution. The increment is complete when the build succeeds and the user has
  the preview or the published URL. Mark it as done. Do not ask for a live
  test. Offer the next increment, for example the Webhook that the page calls.
- For a page that shows live data, the data Webhook is also live only after
  publish. Until then, the `fetch()` in the canvas preview fails. In the page
  script, show a clear message in the page when the `fetch()` fails or returns
  an error status. Tell the user that the preview shows the layout and that the
  data loads after they publish the workflow.
