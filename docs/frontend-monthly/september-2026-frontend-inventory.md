# Frontend change inventory — 3 Aug 2026 to 2 Sep 2026

Source of truth for the September 2026 Frontend Monthly deck (N8N-315 → N8N-314 Stage 2).
Do not build slides from anything not written here.

## Method

| Item | Value | Label |
| --- | --- | --- |
| Repo | `git@github.com:n8n-io/n8n.git` | verified |
| Default branch | `master` (`git remote show origin` → `HEAD branch: master`) | verified |
| Window | `2026-08-03` 00:00 UTC to `2026-09-02` 23:59 UTC, both days included | verified |
| Date basis | Commit date on `master`. `master` is squash-merge only, so commit date = merge date | verified |
| Path scope | `packages/frontend/**` | verified |
| Command | `git log origin/master --since=2026-08-03T00:00:00Z --until=2026-09-03T00:00:00Z -- packages/frontend` | verified |

**Coverage.** All 383 distinct PRs in the window are cited in this file — either in a theme table or in the "not on a slide" list. Nothing was silently dropped.

**Receipts.** Every entry carries `#NNNNN` — the PR number from the squashed commit subject. Link form: `https://github.com/n8n-io/n8n/pull/NNNNN`. 383 of 386 commits carry a PR number. The 3 that do not are release-tag merge commits; they are in the "not on a slide" list with their SHAs.

**Labels.** `verified` = the PR title states the fact. `inferred` = I grouped or summarized across PRs and the wording is mine. `assumed` = stated without a receipt in this window.

**Overlap warning (inferred).** The August deck window ended `Aug 3`. Its slides already cite `#35390` and `#35144`, which fall on `Aug 3` in this window. Stage 2 must not present those two as new. Both are listed below and flagged.

## Totals

| Metric | Value | Label |
| --- | --- | --- |
| Commits touching `packages/frontend` | 386 | verified |
| Distinct PRs | 383 | verified |
| Contributors (all authors) | 75 | verified |
| Contributors (bots not counted) | 72 | verified |
| Bot authors excluded | `n8n-assistant[bot]`, `n8n-cat-bot[bot]`, `n8n-release-tag-merge[bot]` | verified |
| Lines in `packages/frontend` | +117,267 / −46,446 | verified |
| Conventional-commit split | feat 157 · fix 143 · refactor 34 · chore 21 · test 13 · build 6 · perf 2 · ci 2 · docs 1 | verified |
| `no-changelog` PRs | 110 of 383 | verified |
| Releases | `2.34.0` → `2.38.2` | verified |
| Minors cut | 5 (2.34, 2.35, 2.36, 2.37, 2.38) | verified |

### Packages touched (by file-touch count)

| Package | File touches | Label |
| --- | --- | --- |
| `editor-ui` | 3037 | verified |
| `@n8n/design-system` | 499 | verified |
| `@n8n/i18n` | 139 | verified |
| `@n8n/chat` | 29 | verified |
| `@n8n/stores` | 27 | verified |
| `@n8n/frontend-module-sdk` | 26 | verified |
| `@n8n/frontend-test-utils` | 15 | verified |
| `@n8n/storybook` | 13 | verified |
| `@n8n/rest-api-client` | 12 | verified |
| `@n8n/eslint-plugin-design-system` | 9 | verified |
| `@n8n/composables` | 9 | verified |
| `@n8n/frontend-vite-config` | 7 | verified |
| `@n8n/frontend-constants` | 7 | verified |
| `@n8n/frontend-utils` | 4 | verified |

14 frontend packages touched. `@n8n/frontend-test-utils` is new in this window (`#37304`).

### Top contributors (commits to `packages/frontend`, bots not counted)

| Commits | Author | | Commits | Author |
| --- | --- | --- | --- | --- |
| 47 | Alex Grozav | | 11 | Sebastien Powell |
| 25 | Rob Hough | | 11 | Jaakko Husso |
| 24 | Robin Braumann | | 9 | oleg |
| 23 | Kai | | 9 | Sandra Zollner |
| 19 | Michael Drury | | 9 | Raúl Gómez Morales |
| 15 | Anne Aguirre | | 9 | Benjamin Schroth |

…plus 60 more. All figures verified.

### Theme order

Taken from the August 2026 deck, which repeats the July and June shape: product themes first, `Trust & Security` at slot 6-7, `Evaluations` plus an `…and also shipped` grab bag, then `Foundations · Quality`, then `Architecture` last, then contributors and wrap-up. Slot 1 is reserved for the month's newest thread.

---

## Theme 1 · New feature — Gateway credits

The AI Gateway wallet became a visible, metered product surface across the editor. 13 PRs. Renamed to "Gateway credits" at the end of the window.

| Effect (user-visible) | Type | Receipt | Label |
| --- | --- | --- | --- |
| "n8n credits" and "n8n Connect" copy became "Gateway credits" across the UI. | feature | #37267 | verified |
| A role-aware top-up flow lets eligible users add credits. | feature | #35873 | verified |
| The credits pill switches state after a top-up or when the allowance runs out. | feature | #36239 | verified |
| The node credential picker shows and offers Gateway credits. | feature | #35758 | verified |
| The agent tools modal gained an n8n credits section. | feature | #36183 | verified |
| The credits settings link is back in settings. | feature | #36435 | verified |
| The credits balance is cached, so the editor makes fewer wallet requests. | performance | #36725 | verified |
| Copying a workflow keeps its n8n credits. | fix | #37253 | verified |
| Building a workflow with the AI Assistant keeps managed n8n credits. | fix | #37198 | verified |
| The credit banner renders as its own card above detached chat inputs. | fix | #37082 | verified |
| n8n Connect usage is hidden when `aiGatewayCloudUbb` is on. | feature | #35978 | verified |
| Free AI credits callout texts were adjusted. | design system | #35668 | verified |
| Credit-balance clicks are tracked. | DX | #36194 | verified |

## Theme 2 · Product — AI Assistant

79 commits touched `features/ai/instanceAi`. New front doors, a self-hosted onboarding path, dynamic models, and MCP wired into the chat.

| Effect (user-visible) | Type | Receipt | Label |
| --- | --- | --- | --- |
| Self-hosted instances got their own AI Assistant onboarding. | feature | #35579 | verified |
| Instance AI models load dynamically instead of from a fixed list. | feature | #35927 | verified |
| The Assistant refuses a prompt until a model is configured. | fix | #37226 | verified |
| The setup screen and connect modal were polished. | feature | #36795 | verified |
| Connections moved from the sidebar to a "+" button in the text input. | feature | #36585 | verified |
| An inline "Available tools" card connects MCP servers from the chat. | feature | #35332 | verified |
| The MCP registry search is exposed to the Assistant as a tool. | feature | #35318 | verified |
| The Assistant is told which services are connected and what tools they expose. | feature | #35931 | verified |
| Canvas nodes are passed to the Assistant as context. | feature | #36225 | verified |
| The artifact panel shows build progress while the Assistant works. | feature | #37562 | verified |
| An activity indicator shows while the Assistant is still working. | fix | #37046 | verified |
| Step narration stays inside thinking blocks. | fix | #36808 | verified |
| Agent sandboxes can be enabled through Instance AI setup. | feature | #36056 | verified |
| Simplified Custom Auth credentials get a recipe-guided setup in the Assistant. | feature | #35056, #35324 | verified |
| Conversations start in the current project. | fix | #37051 | verified |
| Credential setup cards are scoped to the thread's project. | fix | #36425 | verified |
| Workflow builds stay honest about their project. | fix | #37177 | verified |
| A skipped credential setup is remembered for the rest of the thread. | fix | #36308 | verified |
| Instance AI questions require an explicit answer or Skip. | fix | #35700 | verified |
| The browser tab is named after the conversation. | fix | #35958 | verified |
| The canvas locks while the agent is working. | fix | #35339 | verified |
| Node IDs stay stable when the Assistant edits a workflow. | fix | #36236 | verified |
| Verification fixtures can no longer be pinned as real data. | fix | #36653 | verified |
| The preview width is restored after a viewport resize. | fix | #36433 | verified |
| MCP server status is correct in the Assistant UI, including after a failed tool call or a credential update. | fix | #36180, #37197 | verified |
| Redundant workflow-edit approval is skipped. | fix | #35423 | verified (also cited in the August deck as #35423 — check before reusing) |
| Update approval is skipped for workflows created in the same session. | feature | #36054 | verified |
| Frontend telemetry is redacted; a setup funnel is tracked. | DX | #36914, #36391 | verified |
| The personalization survey and community registration modal show on the Instance AI landing page. | fix | #36809 | verified |
| Ready-to-run demo templates point at a current OpenAI model. | fix | #36189 | verified |
| A trial intro modal, an activation-capped trial variant, a free-use nudge and a manual-builders nudge went to experiment. | feature | #34739, #35994, #36206, #37145 | verified |
| Model experiments improved. | feature | #35034 | inferred (title says "Improve Instance AI model experiments"; the user-visible change is not stated) |

## Theme 3 · Product — Agent Builder and agent sessions

92 commits touched `features/agents` — the largest thread in the window. Sessions became inspectable; the builder gained test runs, schedules and workflow tools.

| Effect (user-visible) | Type | Receipt | Label |
| --- | --- | --- | --- |
| Agent Builder gained test runs, with HITL inside them. | feature | #35716, #35731 | verified |
| A docked agent preview chat landed; a preview chat was added to the SessionTimeline view. | feature | #35773, #36128 | verified |
| Agents are created on first configuration instead of on click. | feature | #35429 | verified |
| A sensible default model is auto-selected for new agents. | feature | #36058 | verified |
| Moonshot, MiniMax and Qwen Cloud joined the model providers. | feature | #36751 | verified |
| The model-picker provider order changed. | feature | #37143 | verified |
| Agent Builder model settings were removed. | refactor | #36654 | verified |
| The builder can create workflow tools, and configure their inputs. | feature | #36460, #36587 | verified |
| The builder can inspect and update schedules. | feature | #36449 | verified |
| Tool selection explains why unsupported workflows cannot run inside agents. | feature | #36519 | verified |
| Workflows with Wait nodes work as agent tools. | feature | #36692 | verified |
| Sub-agents and workflow tools resolve by run type. | feature | #37117 | verified |
| MCP servers can be allowed tools inside skills. | feature | #35969 | verified |
| Agent sessions gained filters. | feature | #36493 | verified |
| Session timelines persist during execution. | feature | #35490 | verified |
| Tool hard and soft failures show in the session trace timeline. | feature | #36405 | verified |
| Tool-call feedback in sessions improved; tool execution data displays. | feature, fix | #36346, #36085 | verified |
| A LangSmith session debug export landed. | feature | #36309 | verified |
| Agent test execution is exposed through MCP. | feature | #35744 | verified |
| n8n Sandbox support was added to Agent Knowledge. | feature | #35811 | verified |
| n8n Connect extends to Agent Builder node tools. | feature | #35402 | verified |
| Agent file upload visibility improved. | feature | #35513 | verified |
| The assistant suggests testing a new agent from the chat. | feature | #35706 | verified |
| Inline agent creation sits behind a feature flag. | feature | #35437 | verified |
| Agent scheduled tasks run in the timezone they were authored in. | fix | #36226 | verified |
| Session failures and startup/channel failures are surfaced and reconciled. | fix | #36492, #36578 | verified |
| Agent workflow tools stay linked after renames; tool schemas stay aligned with saved config. | fix | #35690, #36329 | verified |
| The agent HTTP Request tool configuration was hardened. | fix | #36463 | verified |
| Skill save validation errors surface; skill renames stop reverting. | fix | #36055 | verified |
| Agent persistence and channel setup are treated as one in-flight action; channel setup is separate from publishing. | fix | #36577, #35468 | verified |
| Agent validation details show in tooltips. | fix | #36772 | verified |
| Errors hand off from an agent to the AI Assistant more cleanly, with a single execution context. | fix | #36076, #36310 | verified |
| Data table columns load on selection. | fix | #36634 | verified |
| Sub-agent tool approvals propagate; sub-agent names are used and publish happens before assignment. | fix | #35368, #36846 | verified |
| Streaming was added to Message an Agent workflows. | feature | #36734 | verified |
| Pre-tool-call text stops leaking into agent responses. | fix | #35212 | verified |
| Agent nodes stay inside canvas group borders. | fix | #35972 | verified |
| Agent references show in credential usage. | fix | #35409 | verified |
| Agent execution pulse is classified with `run_type`; creation and modification telemetry was consolidated. | DX | #35346, #35444 | verified |
| Several session/preview UI defects were fixed: stuck tool-call UI and MCP timeouts, trace on full-screen preview dock, right-aligned user messages, timeline error distinction, artifact lifecycle and names, capability-chip spacing, overflowing error callout text, artifact tab bar, agent NDV z-index. | fix | #36162, #36930, #36521, #36816, #35703, #35823, #35493, #37615, #37141, #36233 | verified |
| Agents open without Instance AI. | fix | #36462 | verified |
| Agent builder skill and channel handling improved. | fix | #35980 | inferred (title is generic; the user-visible change is not stated) |
| Autosave and publish event defects in the builder were fixed. | fix | #36241 | verified |

## Theme 4 · Product — Agent channels

Agents reached more places to talk. Slack, Discord and Telegram all landed or improved in the window.

| Effect (user-visible) | Type | Receipt | Label |
| --- | --- | --- | --- |
| A new Slack agent integration landed, with a Slack Agent view. | feature | #35591, #36352 | verified |
| Discord became an agent chat channel. | feature | #35331 | verified |
| The WhatsApp support agent example was replaced with a Telegram one. | feature | #35341 | verified |
| Published agent channel add, replace and remove are failure-safe. | fix | #36100 | verified |
| Draft channels are excluded from telemetry. | DX | #36455 | verified |
| The add-channel modal closes on outside click. | fix | #37171 | verified |
| Agent integration setup was decoupled. | refactor | #35589 | verified |
| Oversized chat attachments are handled gracefully. | fix | #36061 | verified |

## Theme 5 · Product — Workflow Reviews

34 commits in `features/workflow-reviews`. August's brand-new gate grew an activity feed, comments, a diff tab and reviewer rules.

| Effect (user-visible) | Type | Receipt | Label |
| --- | --- | --- | --- |
| A review activity feed landed, then was completed with a decision note. | feature | #35791, #36137 | verified |
| Reviewers can comment on the activity feed. | feature | #35792 | verified |
| A Changes diff tab was added to the review detail pane. | feature | #35431 | verified |
| Closed review requests show their diff. | feature | #36539 | verified |
| Review decisions are restricted to assigned reviewers, and authorized against every covered workflow. | feature, refactor | #36040, #36985 | verified |
| A reviewer is required when creating a review request. | feature | #35932 | verified |
| Decision eligibility is surfaced on the review detail. | feature | #35391 | verified |
| The review baseline is persisted at approval time. | feature | #36132 | verified |
| Review status shows as a badge on the workflows list. | feature | #36476 | verified |
| Review detail metadata and authors display. | feature | #35638, #35897 | verified |
| Users can update review descriptions; title and description inputs show character counters. | feature | #36069, #36177 | verified |
| A workflow version can be named and described when submitting for review. | feature | #35566, #35640 | verified |
| The inbox sections were split, then given better empty and loading states, and a resizable sidebar. | feature | #36216, #36829, #37196 | verified |
| Review success toasts link to the review. | feature | #35888 | verified |
| Workflow reviews are gated on license only. | feature | #36794 | verified |
| The inbox loads after signing in from a deep link. | feature | #36575 | verified |
| Review lifecycle events were split. | DX | #36377 | verified |
| An error shows when eligible reviewers fail to load. | fix | #37089 | verified |
| No-op review updates are disabled. | fix | #35890 | verified |
| The pinned version name shows in the review banner. | fix | #36759 | verified |
| The inbox route was renamed to `/reviews`; status badges were removed; feed formatting was refined. | refactor | #36824, #36724, #37005 | verified |
| Approval auto-publishes the workflow. | feature | #35390 | verified — **already on the August deck. Do not re-present.** |

## Theme 6 · Product — End-user credentials and auth

| Effect (user-visible) | Type | Receipt | Label |
| --- | --- | --- | --- |
| n8n User Auth (OAuth2) reached general availability. | feature | #35900 | verified |
| Form trigger OAuth2 authentication reached GA, was reverted, then re-landed. | feature | #36451, #36848, #36950 | verified |
| End-user credentials came to the Chat Trigger behind a flag, with a connect bar in the hosted chat shell and a credential status strip in `@n8n/chat`. | feature | #36811, #37550, #37399 | verified |
| Chat Trigger publish validation and `workflow:execute` access control landed. | feature | #37231 | verified |
| Chat and MCP trigger auth modes are validated for end-user credentials. | fix | #36534 | verified |
| End-user credential creation is restricted to team projects. | feature | #36025 | verified |
| The shared OAuth consent screen was adapted for first-party clients and got chat-specific branding. | feature | #36261, #37430 | verified |
| Scopes show for managed OAuth credentials under `N8N_MANAGED_OAUTH_SHOW_SCOPES`. | feature | #36053 | verified |
| The connected provider account shows instead of the n8n account email. | fix | #35553 | verified |
| The OAuth sign-in popup opens before network calls, and blocked pop-ups are reported clearly. | fix | #35948 | verified |
| Saved credential data survives connect-save, so no false disconnect prompt appears. | fix | #35598 | verified |
| Save works and stale OAuth state clears when the auth method switches. | fix | #35367 | verified |
| An explicit request for a new credential during setup is honored. | fix | #36348 | verified |
| Explicit credential selection is preserved; the only generic auth credential is no longer auto-selected. | fix | #36500, #35963 | verified |
| Stale credentials are removed from node config when credentials switch. | fix | #34937 | verified |
| Non-project credentials no longer appear as options. | fix | #36715 | verified |
| The connection test for Kafka and Odoo credentials was restored. | fix | #36195 | verified |
| A Confluence Cloud OAuth2 credential was added; Microsoft SharePoint OAuth2 now requires a subdomain. | feature, fix | #35732, #35680 | verified |
| Azure OpenAI classic and Foundry credential setup and execution work for agents. | fix | #37251 | verified |
| The end-user credential warning mentions the n8n User Auth webhook mode. | fix | #35222 | verified |
| Credential telemetry is attributed to workflow and thread; AI-created credential success signals are tracked. | DX | #37027, #35812 | verified |

## Theme 7 · Trust & Security — Settings, permissions and governance

| Effect (user-visible) | Type | Receipt | Label |
| --- | --- | --- | --- |
| n8n serves a nonce-based Content-Security-Policy on its HTML pages. | feature | #36749 | verified |
| Instance Settings permissions were split into granular custom-role options. | fix | #36802 | verified |
| A `project:manageUsers` scope gates project membership changes. | fix | #36243 | verified |
| The UI warns about self-escalation via the Manage project roles scope. | feature | #36458 | verified |
| A `nodeTypePolicy` RBAC scope and license flag were added. | feature | #37538 | verified |
| Browser credential creation is gated on its own permission. | fix | #36931 | verified |
| SSO role mapping shows a clear no-access message when it denies a login. | fix | #36407 | verified |
| A Git connections settings page landed, with a public API. | feature | #36991, #36272 | verified |
| MCP auto-expose for new workflows is a settings toggle; MCP Access was reordered so auto-expose sits with workflows. | feature, refactor | #35828, #36706 | verified |
| MCP supports folder creation and workflow moves. | feature | #35964 | verified |
| A one-click connector for the ChatGPT MCP client was restored. | feature | #35396 | verified |
| MCP server usage events go to log streaming. | feature | #33300 | verified |
| MCP connect and client revoke are tracked. | DX | #36456 | verified |
| The trust checkbox moved out of the MCP consent redirect callout. | fix | #36543 | verified |
| A placeholder shows while MCP settings counts load. | fix | #35894 | verified |
| Screen-reader support improved for scope selector tool pills. | fix | #37159 | verified |
| Settings menu labels use sentence case. | fix | #36651 | verified |
| Azure Key Vault provider endpoints are configurable. | feature | #35214 | verified |
| The "Any workflow" caller policy is deprecated. | feature | #36350 | verified |
| Community packages that need an unsupported node API are skipped at startup. | feature | #37449 | verified |
| A setup-items event contract and a setup panel flag landed. | feature | #37146 | inferred (no-changelog; user-visible surface not stated in the title) |

## Theme 8 · Product — Canvas-only mode, evaluations and the rest

### Canvas-only mode (embedded editor)

| Effect (user-visible) | Type | Receipt | Label |
| --- | --- | --- | --- |
| The command bar is disabled in canvas-only mode. | feature | #35542 | verified |
| Save, publish, unpublish and create-new keyboard shortcuts are disabled. | feature | #36001 | verified |
| The NPS survey, the node feature-request link and the AI templates link are hidden. | feature | #36921, #35998, #35999 | verified |
| Node details links open in a new tab. | fix | #36446 | verified |

### Evaluations

| Effect (user-visible) | Type | Receipt | Label |
| --- | --- | --- | --- |
| An Evals tab shell was added to the agent config panel, then the AI-drafted eval cases view landed in it. | feature | #35530, #35748 | verified |
| An eval review view with ratings and edit capture landed. | feature | #35747 | verified |
| Test case detail was split into config and latest-run panes. | feature | #34371 | verified |
| Evaluation runs no longer fail when the Evaluation Trigger feeds the entry node. | fix | #36975 | verified |
| The evaluation single run view gained padding. | fix | #36929 | verified |

### …and also shipped

| Effect (user-visible) | Type | Receipt | Label |
| --- | --- | --- | --- |
| The Markdown editor gained a floating toolbar and more toolbar options. | feature | #37293, #35630 | verified |
| Markdown fixes: placeholder only when empty, no doubled code-block box, input focused before the toolbar. | fix | #36336, #36844, #35529 | verified |
| Browser Use connection: simplified flow, restyled view, setup gated on extension detection, remembered allowed hosts, better connect conditions, success toast, in-flight probe guard. | feature, refactor | #36316, #36611, #36235, #36744, #36215, #36474, #36290 | verified |
| Enhanced HITL for Slack and Telegram was enabled. | feature | #35411 | verified |
| Autosave was hardened: no retries on permanent errors, gated on document hydration, never on a read-only preview canvas, save-failure handling extracted. | fix, refactor | #36967, #36966, #36023, #36968 | verified |
| A stop execution button was added to the NDV. | feature | #36444 | verified |
| Workflow and agent header menus were aligned; header actions and production checklist placement were polished; the Publish button stays visible in narrow headers; the actions menu stops shifting on first save. | feature, fix | #37315, #36209, #35502, #36077 | verified |
| A Contact Support link was added to the Help menu on Cloud. | feature | #37414 | verified |
| Convert to sub-workflow is hidden when Execute Workflow nodes are excluded. | feature | #36499 | verified |
| Dependency pills show on views listing more than 100 resources. | fix | #35825 | verified |
| Output panel warnings are grouped to keep the panel usable. | fix | #36619 | verified |
| A new node stops showing a deleted node's execution data. | fix | #36915 | verified |
| The read-only execution background stays in sync. | fix | #35245 | verified |
| Chat history refreshes when switching executions. | fix | #35312 | verified |
| Expression editor: the cursor position is kept on click; the parameter expression toggle layout was restored; external secret previews are clearer; the expression modal z-index over the agent NDV was fixed. | fix | #36411, #37295, #36064, #36233 | verified |
| Form element attributes survive reordering and deleting. | fix | #36395 | verified |
| Workflows moved out of a folder stay visible in the source control push modal. | fix | #37128 | verified |
| The workflow home project is derived from the shared relation when absent. | fix | #35810 | verified |
| Duplicated workflows no longer inherit the original's static data. | fix | #35921 | verified |
| Community node descriptions show for installed nodes; the community node docs link interpolation key was corrected. | fix | #34914, #37236 | verified |
| Insights date-range boundaries use the caller's timezone. | fix | #33989 | verified |
| The misleading reset zoom control was removed; canvas button spacing in top-right vs bottom-left was made consistent. | fix, feature | #35843, #35319 | verified |
| Users are redirected to sign-in when the session expires; navigation settles instead of hanging when the auth-init guard errors; write-lock polling stops re-arming after session expiry. | fix | #35507, #36190, #34750 | verified |
| The HTTP Request node shows the API response when a file upload fails. | fix | #36924 | verified |
| The decision input has a max resize height. | fix | #37061 | verified |
| Dropdown menus look more obviously scrollable. | fix | #35726 | verified |
| The Agent node shows the disabled reason on the prompt-source option. | fix | #36612 | verified |
| Reduced-motion preferences are respected. | fix | #36523 | verified |
| The Message an Agent node variant is tracked in telemetry. | DX | #35501 | verified |
| Backend events link to PostHog session recordings. | DX | #35613 | verified |
| The UI can call the public API. | feature | #35692 | verified |
| "Always allow" scope is accepted on data-tables resume. | fix | #36070 | verified |
| Agent tool credentials show above configuration; Save is enabled in the agent tool modal when credential auth is selected; the setup credential tool description was fixed. | fix | #35590, #36012, #36766 | verified |
| AI Assistant interaction panels were refined; the Instance AI model dropdown no longer opens when the wizard opens. | refactor, fix | #36799, #37215 | verified |
| Brackets were removed from the docs link in the credential setup assistant help. | fix | #35028 | verified |
| Unsupported `button` type attributes were removed. | fix | #35578 | verified |
| Browser connection status was added to the credential setup telemetry event. | DX | #36457 | verified |
| Test coverage: the reselect-a-model callout on a deleted chat agent; a missing `setNotify` stub in the app-init `useToast` mock. | DX | #35648, #35448 | verified |
| A "see all" button tracking defect on AIA template examples was fixed. | fix | #35451 | verified |

## Foundations · Quality — Design system and code health

67 commits touched `@n8n/design-system` in this window.

| Effect | Type | Receipt | Label |
| --- | --- | --- | --- |
| New components: Combobox, CodeBlock, ChatMessage. | design system | #33622, #34239, #35461 | verified |
| RadioGroup and v2 Pagination were promoted out of `v2` into core; the RadioButtons remnant and legacy Pagination CSS were removed. | design system | #36793, #36522 | verified |
| `N8nInputNumber2` adoption was completed and the legacy InputNumber removed; NumberInput styling was updated. | design system | #36598, #35937 | verified |
| SegmentControl and TagsInput were updated; pagination controls improved. | design system | #34447, #36714, #34774 | verified |
| `N8nIconPicker` UX and performance improved. | performance | #35878 | verified |
| `N8nResizeWrapper` gained a visible handle indicator; `N8nCopyInput` focus and hover states improved. | design system | #37195, #36899 | verified |
| ChatInput gained an adaptive layout. | design system | #36939 | verified |
| Type declarations are emitted for all 159 design-system components; the package publishes from `dist` with an exports map. | DX | #35447, #36305 | verified |
| Compiled theme CSS and an SCSS passthrough ship in `dist`; the traversing font URL was replaced with a narrow SCSS entry; design-system deps are externalized and Lucide icon chunks pre-built. | DX, performance | #35452, #35936, #35603 | verified |
| Invalid `:global()` was removed from shipped design-system CSS. | fix | #35144 | verified — **already on the August deck. Do not re-present.** |
| A Design System ESLint plugin was added; all deep design-system imports were migrated to root imports. | DX, refactor | #34550, #35614, #35654, #36439 | verified |
| Storybook: sidebar reorganized, Checkbox story moved to Core, monolithic `@iconify/json` adopted, tidied for Figma import. | DX | #35608, #35430, #35511, #35734 | verified |
| The colour, shadow and type style-guide pages were refreshed; subtle button hover/active states use `color-mix()`. | design system | #37504, #31132 | verified |
| Theme outline shadows, Edit Fields type selector styles, node status border widths and SchemaItem optical baseline were restored or realigned. | fix | #36581, #36400, #35408, #35406 | verified |
| NDV panels span the full container width. | fix | #35818 | verified |
| The welded `isNDVV2` gate was retired and the unreachable legacy NDV deleted. | refactor | #35615 | verified |
| The frontend test helpers were extracted into a new `@n8n/frontend-test-utils` package; reusable setup moved into `@n8n/vitest-config`. | DX | #37304, #35637 | verified |
| CI and repo configuration moved to pnpm 11; the PR pipeline runs on Node 26; single-instance dependency duplication checks were added. | DX | #36424, #34032, #34681 | verified |
| Frontend workspace packages resolve from source in Vite; `frontend-utils` `htmlUtils` loads as native ESM; the dev REST base URL and backend port derive from env vars. | DX | #36131, #35622, #35770, #35724 | verified |
| PostHog: native exposure tracking in the store, and the client-side flag refetch is skipped when flags are bootstrapped. | DX, performance | #34804, #34805 | verified |
| A typed `@n8n/telemetry` boundary was tightened: telemetry registration split out of the `useTelemetry` module. | refactor | #35350 | verified |
| `formatBytes` and `toMb` were deduplicated into `@n8n/utils`. | refactor | #36218 | verified |
| Dead code removed: `cloudStoreUtils` fixture, `NotificationOptions` re-export chain, two experiment constants, the executions tag filter, the `surfaceMcp` first-open-modal arm, the rolled-out `instanceAiWorkflowPreviewSuggestions` flag, `ConditionalRouterLink` prop style. | refactor | #35635, #35439, #35632, #35618, #35617, #35639, #35604 | verified |
| Test hygiene: modal-key ratcheting in CI, AgentBuilderView async leaks stopped, Reka UI focus-restore timer flushed, `vi.mock` specifiers repaired, dead mocks removed, two `it.todo` bodies made to run, `importOriginal` spreads retired, expression-editor focus waited on, a block-wide timeout added, orphaned Vite dev servers stopped. | DX | #36324, #36412, #36326, #35491, #35438, #35636, #35440, #35754, #35580, #35745 | verified |
| Dependency and platform bumps: oxlint 1.61 → 1.79 (twice), katex 0.18.2, `./plugin` published as its own entry. | DX | #36782, #36775, #36582, #36445 | verified |
| Instances running in E2E test mode are marked. | DX | #35847 | verified |
| Release images are scanned with syft instead of cdxgen. | DX | #37344 | verified |

## Theme 9 · Architecture — The editor as a platform

August moved stores and composables into packages. This window the module SDK became load-bearing: three features left `editor-ui` as frontend module packages, and the modal registry replaced the shell's hard-coded list.

| Effect | Type | Receipt | Label |
| --- | --- | --- | --- |
| Module SDK push and command registries are wired into the shell. | refactor | #34422 | verified |
| Instance-AI credits push routes through the module SDK. | refactor | #34436 | verified |
| OpenTelemetry was extracted into a frontend module package, with its own route name and a module route-name collision guard. | refactor | #36679, #36645 | verified |
| The instance registry was extracted into a frontend module package. | refactor | #36325 | verified |
| Module registration stays silent when it re-runs after a re-login. | fix | #36398 | verified |
| Modals: two-phase registration and a per-feature modals fragment landed; shell-held modal components moved to their owning features; modal state derives from the registry instead of mirroring it; unregistered modal keys render as closed instead of throwing. | refactor, fix | #36147, #36317, #35859, #35625 | verified |
| `settings.store` and `users.store` importers were repointed to `@n8n/stores` and their shims dropped. | refactor | #35459, #35330 | verified |
| `useStorage` consumers were repointed to `@n8n/composables`. | refactor | #35443 | verified |
| The insights feature was given one public entry. | refactor | #36821 | verified |
| The demo-route workflow document store null window was closed. | fix | #36399 | verified |
| Agent workspace string replacement tools were consolidated. | refactor | #36178 | verified |
| Editor `postMessage` origin handling and CSP now bound the embedded surface. | feature | #36749 | inferred (grouping mine; #36749 is the CSP PR, the origin allowlist landed in the August window) |

---

## Not on a slide

Too small, too internal, or without a usable receipt. Keep out of the deck.

### No PR — release-tag merge commits (bot)

| Item | Receipt | Label |
| --- | --- | --- |
| Merge tag `n8n@2.37.0` | `c09da09d3884fa3a8e634d32411893395d406dd7` | verified |
| Merge tag `n8n@2.36.0` | `44a5deb577ee2f409aa7432b7de7d2bcf22191f1` | verified |
| Merge tag `n8n@2.35.0` | `5219149d41b9b4ef5db5da8f8b5920f34bbbb208` | verified |

### Mechanical

| Item | Receipt | Label |
| --- | --- | --- |
| Release PRs 2.34.0, 2.35.0, 2.36.0, 2.37.0 | #35487, #36006, #36483, #36986 | verified |
| Node popularity data refreshes (5) | #35398, #35902, #36381, #36890, #37373 | verified |
| Bundle 2.x chores (3) | #35563, #36558, #37586 | verified |

### Already presented on the August deck

| Item | Receipt | Label |
| --- | --- | --- |
| Auto-publish workflow reviews on approval | #35390 | verified |
| Remove invalid `:global()` from shipped design-system CSS | #35144 | verified |
| Skip redundant workflow edit approval in AI Assistant | #35423 | verified |

### Titles too generic to state a user-visible effect

Each of these has a receipt but no defensible one-sentence effect. Drop them, or ask the author.

| Item | Receipt | Label |
| --- | --- | --- |
| Improve Instance AI model experiments | #35034 | inferred |
| Improve agent builder skill and channel handling | #35980 | inferred |
| Add setup-items event contract and setup panel flag | #37146 | inferred |
| Update AI credential and model selection | #36738 | inferred |
| Add several tools of the same provider via UI | #37212 | inferred |
| Improve agent file upload visibility | #35513 | inferred |
| UI tweak to prevent overflowing text on err callout when on Agent Preview | #37615 | verified but trivial |

## Open questions for Stage 2

1. **The Aug 3 overlap.** The August deck's window ended `Aug 3` and it already used `#35390`, `#35144` and `#35423`. This inventory keeps them for completeness but flags them. Confirm the September deck states its window as `Aug 4 → Sep 2` to avoid the overlap, or presents `Aug 3 → Sep 2` and skips those three.
2. **Slot 1.** Gateway credits is the newest coherent thread (13 PRs), but it is smaller than Agent Builder (92 commits). Past decks put the newest thread first. Confirm which the Operator wants on slide 4.
3. **Release line.** `2.34.0` → `2.38.2` covers 5 minors, one more than the last two decks reported. Verified from tags.
