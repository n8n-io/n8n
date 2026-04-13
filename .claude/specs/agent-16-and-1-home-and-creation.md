# AGENT-16 + AGENT-1: Home Screen & Creation Flow

**Tickets:** [AGENT-16](https://linear.app/n8n/issue/AGENT-16), [AGENT-1](https://linear.app/n8n/issue/AGENT-1)
**Branch:** `n8n-agents`
**Figma:** https://www.figma.com/design/PeFCNtBUBdtDNonFc9vmqR/Agents-Q2?node-id=0-1&p=f&m=dev

---

## Overview

These two tickets together transform the agent UX from the current code-editor-centric tabbed layout to the Figma-designed chat-first experience. AGENT-16 covers sidebar navigation and home screen entry points. AGENT-1 covers the agent creation flow and the main agent view (chat + settings sidebar).

---

## Part 1: AGENT-16 — Sidebar & Home Screen

### What Figma Shows

**Left sidebar** (see node `115:653`):
- Below "Shared with me", a new **"Agents"** section header with **"New"** badge
- Lists user's agents by name with emoji icons (e.g. "Darwin")
- **"+ New agent"** action at bottom of list
- Agents are visible regardless of which project is selected (cross-project)
- Tooltip/coachmark on first visit: "Create agents that you can chat to, run autonomously, or include in workflows"

**Home screen** (Overview page):
- "Create agent" available in the top-right **"Create workflow"** dropdown menu
- Agents tab added to project tabs (Workflows, Credentials, Executions, Variables, **Agents**)

### What Already Exists

- `ProjectNavigation.vue` — main sidebar with Overview, Personal, Shared, InstanceAI, Chat items
- `ProjectHeader.vue` — already has `ACTION_TYPES.AGENT` + "New Agent" button + dropdown item
- `ProjectTabs.vue` — dynamic tabs via `additionalTabs` prop from module descriptors
- `module.descriptor.ts` — agents module already registers "Agents" tab in `projectTabs.overview` and `projectTabs.project`
- `settingsStore.isModuleActive('agents')` — feature flag gate already used in ProjectHeader
- `listAllAgents` API — `GET /agents/v2?all=true` returns cross-project agent list

### What Needs to Change

#### 1.1 PostHog feature flag gating

**File:** `packages/frontend/editor-ui/src/app/moduleInitializer/moduleInitializer.ts`

The `agents` module registration should be gated behind PostHog flag `0XX_first_class_agents` (confirm index with team). When the flag is off, the module isn't registered, `settingsStore.isModuleActive('agents')` returns false, and all UI (sidebar, tabs, create button) is hidden.

#### 1.2 Add Agents section to `ProjectNavigation.vue`

**File:** `packages/frontend/editor-ui/src/features/collaboration/projects/components/ProjectNavigation.vue`

Add between the Instance AI / Chat items and the "Projects" label:

```
"Agents" section header with "New" badge
├── Agent 1 (icon + name) → navigates to agent builder
├── Agent 2 (icon + name)
└── + New agent → navigates to new agent creation page
```

Implementation:
- Add computed `isAgentsAvailable` gated on `settingsStore.isModuleActive('agents')`
- Add computed `agentsList` that calls `listAllAgents` (fetched on mount, cached in a local ref)
- Render a section with `N8nText` header "Agents" + `N8nTag` "New" badge
- Map agents to `N8nMenuItem` items with route to `AGENT_BUILDER_VIEW`
- Add "+ New agent" item that routes to the new agent creation page (new route, see Part 2)
- Active state: highlight when current route is an agent builder with matching agentId

#### 1.3 Coachmark tooltip

- On first display of the Agents section, show a tooltip/popover: "Create agents that you can chat to, run autonomously, or include in workflows"
- Gate on a localStorage flag (e.g. `n8n_agents_coachmark_dismissed`)
- Use existing `useN8nLocalStorage` composable for persistence
- Dismiss on click or after navigating to an agent

#### 1.4 No changes needed (already done)

- "New Agent" in ProjectHeader create dropdown
- Agents tab in ProjectTabs (via module descriptor)
- Feature flag gating

---

## Part 2: AGENT-1 — Creation Flow & Agent View Redesign

### What Figma Shows

**A. "New agent" page** (nodes `115:1350`, `115:4136`):
- Header: "New agent" title, **"Create blank"** button top-right
- Center content: "Let's build something, [Name]" heading
- Text input: "Describe what you're working on..." with mic + send buttons
- Below input: **"Suggestions"** section with 3 template cards:
  - Each card: emoji icon + bold name + description + tool icons on right
  - e.g. "SEO Audit", "Recruiting Sourcer", "Inbox Sorter"
- Submitting a description → uses the AI builder to create the agent (existing `POST /build` endpoint)

**B. Agent home/chat view** (node `6:193`):
- **3-column layout**: left sidebar (app nav) | center (chat) | right (settings)
- Top bar: agent icon + "Sales Agent" name, settings toggle + activity toggle icons
- Center column:
  - Agent icon (large) + name + "Add a description here" subtitle
  - Chat input: "Send a message..." with attachment, mic, send buttons
  - **"Recent"** section: list of past sessions with source icon + title + preview + timestamp
- Right column (**Settings sidebar**, toggled via icon):
  - "Settings" header with Cancel + Save buttons
  - "Unsaved changes" indicator
  - **Model**: provider icon + model name + credential, with dropdown
  - **Instructions**: text area with agent system prompt
  - **Triggers** (collapsible): n8n Chat, Slack Mention, Schedule, Workflow — with "+" to add
  - **Tools** (collapsible): list of tools with credential names, "+" to add, warning state for missing creds
  - **Advanced** (collapsible): memory config, guardrails toggles, delete agent

**C. Agent chat conversation** (node `14:319`):
- Breadcrumb: "Sales Agent > Biggest churn risk"
- User messages right-aligned, agent messages left-aligned
- Tool calls: collapsible "5 tool calls" with list (icon + "Service → Action description")
- Message actions: copy, retry, more (...)
- Chat input pinned to bottom

### What Already Exists

- `AgentBuilderView.vue` — current tabbed layout: left sidebar (Code/Overview/Tools/Prompts/Memory/Evals/Integrations) + center panel + right chat panel
- `AgentChatPanel.vue` — SSE streaming chat with tool call display (functional)
- `AgentOverviewPanel.vue` — model selector, credential picker, instructions editor
- `AgentToolsPanel.vue` — tool management with workflow tools
- `AgentSidebar.vue` — left tab navigation (code-first tabs)
- All backend APIs for chat, schema, tools, integrations already exist

### What Needs to Change

#### 2.1 New route: Agent creation page

**File:** `packages/frontend/editor-ui/src/features/agents/module.descriptor.ts`

Add a new route:
```typescript
{
  name: 'NEW_AGENT',
  path: '/new-agent',
  component: NewAgentView,
  meta: { middleware: ['authenticated', 'custom'] },
}
```

**File:** `packages/frontend/editor-ui/src/features/agents/constants.ts`

Add: `export const NEW_AGENT_VIEW = 'new-agent';`

#### 2.2 New view: `NewAgentView.vue`

**File:** `packages/frontend/editor-ui/src/features/agents/views/NewAgentView.vue`

Layout:
- Uses the standard app layout (with main sidebar visible)
- Top bar: "New agent" title left, "Create blank" button right
- Center content (vertically centered, max-width ~600px):
  - Heading: "Let's build something, [firstName]" (from `useUsersStore().currentUser`)
  - Text area input: placeholder "Describe what you're working on...", mic button, send button
  - "Suggestions" label
  - 3 suggestion cards (hardcoded for P0, ties into AGENT-15):
    - Icon + name (bold) + description + tool count icons
    - Click → populates the text input with a pre-written prompt

Behavior:
- **"Create blank"** button: calls `createAgent()` API, navigates to `AGENT_BUILDER_VIEW`
- **Submit description**: calls `createAgent()`, then navigates to `AGENT_BUILDER_VIEW` with a query param like `?prompt=...` so the builder can auto-trigger the build endpoint
- **Click suggestion**: populates input, user can edit + submit

#### 2.3 Redesign `AgentBuilderView.vue` — chat-first layout

**File:** `packages/frontend/editor-ui/src/features/agents/views/AgentBuilderView.vue`

Current layout:
```
[AgentSidebar (tabs)] [Center (code/overview/tools/...)] [AgentChatPanel]
```

New layout (matching Figma):
```
[Center: Agent home + Chat] [Settings sidebar (togglable)]
```

Changes:
- Remove `AgentSidebar` (tab navigation) from the agent builder view
- Center column becomes the **chat-first view**:
  - Agent header: icon + name (editable) + description (editable)
  - Chat input (reuse `AgentChatPanel` internals or `ChatInputBase`)
  - Recent sessions list (below chat input when no conversation is active)
  - When in conversation: full chat thread replaces the home content
- Right column becomes the **Settings sidebar** (new component):
  - Toggle visibility via header icons (settings icon + activity icon)
  - Scrollable panel with all settings sections

Top bar:
- Left: agent icon + agent name (as breadcrumb: "Sales Agent" or "Sales Agent > Session title")
- Right: settings toggle icon, activity toggle icon

#### 2.4 New component: `AgentSettingsSidebar.vue`

**File:** `packages/frontend/editor-ui/src/features/agents/components/AgentSettingsSidebar.vue`

A right-hand panel (~340px wide) containing all agent configuration in a single scrollable view:

| Section | Content | Existing component to reuse |
|---------|---------|---------------------------|
| Header | "Settings" + Cancel/Save buttons + "Unsaved changes" | New |
| Model | Provider + model dropdown + credential picker | `AgentOverviewPanel` (extract model/credential parts) |
| Instructions | Text area for system prompt | `AgentOverviewPanel` (extract instructions part) |
| Triggers | Collapsible list + "+" button | New (P0: just list, no inline config) |
| Tools | Collapsible list with credential status + "+" button | `AgentToolsPanel` (simplified view) |
| Advanced | Collapsible: memory, guardrails, delete | `AgentMemoryPanel` parts, new guardrails toggles |
| Code | Collapsible accordion (collapsed by default), Monaco editor | `AgentCodeEditor` (existing) |

Behavior:
- Tracks local changes, shows "Unsaved changes" indicator
- Save: calls `patchAgentSchema()` + `updateAgent()` as needed
- Cancel: reverts to last-saved state

#### 2.5 New component: `AgentHomeContent.vue`

**File:** `packages/frontend/editor-ui/src/features/agents/components/AgentHomeContent.vue`

The center content when no chat session is active:
- Large agent icon (centered)
- Agent name (editable on click)
- "Add a description here" subtitle (editable on click)
- Chat input (`ChatInputBase` with attachment, mic, send)
- "Recent" section header with list/grid toggle icon
- Recent sessions list (each item: source icon + title + preview text + timestamp)

Note: Recent sessions requires a new API endpoint. For P0 MVP, this can show an empty state or be omitted if the sessions API isn't ready (depends on AGENT-9).

#### 2.6 Update `AgentChatPanel.vue` for inline use

Currently `AgentChatPanel` is a right-side panel. It needs to work as the center content when a conversation is active. Refactor to:
- Extract chat message thread into a reusable `AgentChatThread.vue`
- `AgentChatPanel` becomes a wrapper that can render in center-column mode (full width) vs. the old side-panel mode
- Add breadcrumb support in the top bar (agent name > session title)

#### 2.7 Update `ProjectHeader.vue` — "New Agent" action

Currently "New Agent" in the dropdown creates a blank agent and navigates to builder. Change to navigate to `NEW_AGENT_VIEW` instead, so users see the creation flow.

**File:** `packages/frontend/editor-ui/src/features/collaboration/projects/components/ProjectHeader.vue`

```typescript
[ACTION_TYPES.AGENT]: () => {
  void router.push({ name: NEW_AGENT_VIEW });
},
```

---

## File Changes Summary

| Action | File | Description |
|--------|------|-------------|
| Modify | `ProjectNavigation.vue` | Add Agents section with list + coachmark |
| Create | `views/NewAgentView.vue` | "Let's build something" creation page |
| Create | `components/AgentSettingsSidebar.vue` | Right-hand settings panel |
| Create | `components/AgentHomeContent.vue` | Agent home (icon, chat input, recent) |
| Modify | `views/AgentBuilderView.vue` | Redesign to chat-first 2-column layout |
| Modify | `components/AgentChatPanel.vue` | Refactor for center-column use |
| Modify | `module.descriptor.ts` | Add NEW_AGENT route |
| Modify | `constants.ts` | Add NEW_AGENT_VIEW constant |
| Modify | `ProjectHeader.vue` | Route "New Agent" to creation page |
| Modify | `AgentOverviewPanel.vue` | Extract model/instructions for reuse in settings sidebar |

---

## Implementation TODO

### AGENT-16: Sidebar & Home Screen
- [ ] Gate agents module registration behind PostHog flag `0XX_first_class_agents` in `moduleInitializer.ts`
- [x] Add `isAgentsAvailable` computed + agent list fetch to `ProjectNavigation.vue`
- [x] Render Agents section header with "New" badge
- [x] Render agent list items with icons + names + navigation (global, cross-project)
- [x] Add "+ New agent" item routing to creation page
- [x] Add coachmark tooltip with localStorage dismissal
- [x] Active state highlighting for current agent

### AGENT-1: Creation Flow
- [x] Add `NEW_AGENT_VIEW` constant and route in module descriptor
- [x] Create `NewAgentView.vue` with heading, input, suggestions, "Create blank"
- [x] Hardcode 3 suggestion templates (SEO Audit, Recruiting Sourcer, Inbox Sorter)
- [x] "Create blank" creates agent + navigates to builder
- [x] Submit description creates agent + navigates to builder with prompt param
- [x] Update ProjectHeader to route "New Agent" action to creation page

### AGENT-1: Agent View Redesign
- [x] Create `AgentSettingsSidebar.vue` with Model, Instructions, Triggers, Tools, Advanced, Code sections
- [x] Code section: collapsible accordion (collapsed by default) wrapping `AgentCodeEditor`
- [x] Create `AgentHomeContent.vue` with agent icon/name/description + chat input + recent sessions placeholder
- [x] Recent sessions: show "No conversations yet" empty state
- [x] Redesign `AgentBuilderView.vue` to 2-column layout (center chat + right settings)
- [x] Add top bar with agent name, settings toggle, activity toggle — split header pattern (each column has own 56px header)
- [x] Refactor `AgentChatPanel.vue` for center-column rendering (inline mode)
- [x] ~~Extract reusable parts from `AgentOverviewPanel`~~ → Built model/instructions/credential directly in sidebar using ChatHub patterns (CredentialIcon, PROVIDER_CREDENTIAL_TYPE_MAP, credential setup flow)
- [x] Wire Save/Cancel in settings sidebar to schema API
- [x] Add "Unsaved changes" tracking (dirty state lifted to parent view)

### Additional work completed (not in original plan)
- [x] Dynamic provider list from `chatHubLLMProviderSchema` (not hardcoded)
- [x] Provider icons via `CredentialIcon` + `PROVIDER_CREDENTIAL_TYPE_MAP` (not copied SVGs)
- [x] ChatHub-style credential setup: auto-select single credential, open selector modal or creation modal
- [x] Model dropdown disabled when no credential is set
- [x] Provider ↔ catalog ID mapping (ChatHub camelCase ↔ SDK lowercase)
- [x] All static text uses i18n (30 keys in en.json)
- [x] CSS uses proper design tokens (`--background--surface`, `--background--surface--hover`)
- [x] Unit tests: constants, provider mapping, NewAgentView render

### Deferred (not blocking P0 launch)
- [ ] Recent sessions list (needs AGENT-9 execution logging API)
- [ ] Activity sidebar (Agent ID, Session ID, context, cost)
- [ ] Trigger inline configuration (n8n Chat, Schedule — Slack already works)
- [ ] Tool config modals (Slack channels, Workflow config)
- [ ] Breadcrumb navigation for chat sessions
- [ ] PostHog feature flag gating (needs backend + flag index confirmed with team)

---

## Decisions

1. **Agents in sidebar — global.** The sidebar shows all agents across all projects via `?all=true` API. The "Agents" tab within a project view shows only that project's agents (project-scoped via `listAgents`).
2. **Feature flag — PostHog `0XX_first_class_agents`.** A PostHog experiment flag controls whether the `agents` module is registered in `moduleInitializer.ts`. The `settingsStore.isModuleActive('agents')` gate stays as the UI-level check — it'll be falsy when the module isn't registered. The exact index prefix (e.g. `025`, `026`) should be confirmed with the team before implementation.
3. **Recent sessions — placeholder.** Show the "Recent" section header with an empty state: "No conversations yet — send a message to get started." This preserves layout structure and will be wired to real data when AGENT-9 lands.
4. **Code editor — collapsed accordion.** Keep the Monaco code editor accessible in the settings sidebar as a collapsible "Code" accordion section, collapsed by default. Will be hidden/removed closer to P0 release.
