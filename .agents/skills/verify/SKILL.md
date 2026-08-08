---
name: n8n:verify
description: Build, launch and drive a local n8n instance to observe a change at runtime (canvas UI + push/websocket traffic). Use when verifying editor or execution-lifecycle changes end-to-end rather than via tests.
---

# Verify an n8n change at runtime

Boots an isolated instance, provisions workflows over the REST API, and drives
the canvas with Playwright. Written for editor/canvas and execution-lifecycle
changes, where the only real evidence is what the browser renders and what comes
down the push socket.

## 1. Build first — the server does not read your source

```bash
pnpm build > /tmp/verify-build.log 2>&1   # ~2-4 min; tail the log on failure
```

`pnpm start` runs `packages/cli/dist`, not `src`, and the frontend is served from
a **static cache dir under `$N8N_USER_FOLDER`** that is populated at boot
(`EDITOR_UI_DIST_DIR` → `staticCacheDir`, see `packages/cli/src/server.ts`).

**Gotcha that will waste your time:** rebuilding the frontend while the server
runs changes nothing — the old bundle keeps being served. After any frontend
rebuild, **restart the server**. Confirm you're testing what you built:

```bash
curl -s http://localhost:5678/ | grep -o 'assets/index-[A-Za-z0-9_-]*\.js' | head -1
ls packages/frontend/editor-ui/dist/assets/ | grep -E '^index-.*\.js$' | head -1
# these two must match
```

## 2. Boot isolated — never touch the developer's real `~/.n8n`

```bash
N8N_USER_FOLDER=/tmp/n8n-verify/home \
N8N_ENCRYPTION_KEY=verifyverifyverify \
N8N_DIAGNOSTICS_ENABLED=false N8N_VERSION_NOTIFICATIONS_ENABLED=false \
N8N_PERSONALIZATION_ENABLED=false N8N_PORT=5678 E2E_TESTS=true \
pnpm start > /tmp/n8n-verify/server.log 2>&1 &

until curl -sf http://localhost:5678/rest/settings -o /dev/null; do sleep 1; done
```

Sqlite in that folder, so `rm -rf` the folder for a clean slate. Skip
postgres/redis unless the change is multi-main or queue-mode specific.

## 3. Provision over REST, not by clicking

`POST /rest/owner/setup` on a fresh instance returns an `n8n-auth` cookie;
afterwards `POST /rest/login` with `{emailOrLdapLoginId, password}`. Then
`POST /rest/workflows`. Node `typeVersion` must be a real version or the node
renders with issues — read `defaultVersion` from the node source
(`packages/nodes-base/nodes/<Node>/<Node>.node.ts`). `workflowSelector` params
(Execute Sub-workflow) need `{__rl: true, value: '<id>', mode: 'list',
cachedResultName: '<name>'}`.

Cookie handling that works with `fetch`: read `res.headers.getSetCookie()`, keep
the entry starting `n8n-auth=` (up to the first `;`), and send it back as
`cookie` on every later request.

## 4. Drive with Playwright from inside the repo

Scripts must live **in the repo** (e.g. `.context/verify/`) so `import
{ chromium } from 'playwright'` resolves — a script in `/tmp` cannot.

The Playwright **MCP** server reports screenshots it never writes to a readable
path; drive Playwright directly instead so you can `Read` the PNGs and actually
look at them.

```js
const ctx = await browser.newContext({
  viewport: { width: 1400, height: 900 },
  colorScheme: 'dark',        // flip to 'light' — theme bugs hide here
  deviceScaleFactor: 2,       // 2px CSS details are unreadable at 1x
});
// sign in
await page.getByRole('textbox', { name: 'Email' }).fill(EMAIL);
await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD);
await page.locator('[data-test-id="form-submit-button"]').click();
await page.waitForURL(/home\/workflows/);
```

Useful test ids: `execute-workflow-button`, `stop-execution-button`,
`zoom-in-button`, `canvas-default-node`, `canvas-node-status-mark-success`.

## 5. Techniques that paid off

- **Count push frames** — attach to the websocket and bucket by message type.
  This is how you see volume regressions the UI hides:
  ```js
  page.on('websocket', ws => ws.on('framereceived', ({payload}) => {
    const t = JSON.parse(String(payload))?.type; byType[t] = (byType[t] ?? 0) + 1;
  }));
  ```
- **Pin CSS custom properties to test geometry.** Don't try to catch a
  transient state mid-execution. Add the state's class, disable the transition
  and any animation, then set the variable to 10/25/50/75/90% and screenshot
  each. Found a real arc-direction bug this way that timing-based capture had
  masked. CSS-module class names are hashed — discover them by scanning
  `document.styleSheets` for `_running_`/`_progress_` prefixes.
- **Beware the CSS transition when probing computed styles.** A `getComputedStyle`
  read mid-transition returns an interpolated value, not the target — the var
  said `50%` while the gradient stop read `37.2%`.
- **Sample in-page with `requestAnimationFrame`, not by polling from Node.**
  A fast child sub-workflow lives ~10ms; a 500ms Node poll sees nothing and you
  will wrongly conclude the UI never rendered.
- **Zoom in ~4 clicks before screenshotting** node-border details.

## 6. Flows worth driving for sub-workflow / execution changes

| Flow | Why |
|---|---|
| Manual trigger → Execute Sub-workflow → slow child (~900ms/node) | happy path, progress observable |
| Child with IF and two arms | only one arm runs — reveals estimate-vs-actual gaps |
| Loop Over Items over 200+ items → fast child | push volume, responsiveness, per-iteration reset |
| Same in light **and** dark | per-theme tokens |

For the loop case measure: frames by type, frames/sec, `connection lost` in
`document.body.innerText`, main-thread RTT (`page.evaluate` round-trip while the
stream is hot), and whether the canvas is still clickable afterwards.

## 7. Teardown

```bash
lsof -ti:5678 | xargs -r kill
rm -rf /tmp/n8n-verify/home
```
