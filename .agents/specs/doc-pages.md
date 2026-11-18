# Doc pages

Hackathon project on branch `feat/n8n-pages-auto-documentation`. No feature
flag. No slicing: build agents implement the full spec.

## Goal

n8n writes a documentation page for each published workflow that has an
outside entry point, and for each published Agent. An LLM writes the first
draft. People edit pages in a block editor like Notion. Pages replace our
internal Notion "Workflow Documentation Library". The reference page is
"Absence API" in that library.

## Decisions

| Topic | Decision |
| --- | --- |
| Unit | One page for each workflow or Agent. Child pages hang below a page. No free-form top-level pages. |
| What gets a page | Published Agents. Published workflows with a trigger node in the published version. Manual Trigger and Execute Workflow Trigger do not count. |
| Readers | Signed-in users of the instance. Read and edit rights come from the workflow or Agent. |
| Editing | Everything on the page is editable. |
| First draft | If a workflow or Agent is published and has no page, a background job writes the page. Later publishes never regenerate. |
| Older workflows | They get an empty page with a "Generate with AI" button. |
| Stale banner | The page stores the version id that it was written against. If the published version differs, the page shows a banner. |
| Check with AI | Returns a list of findings. If the user clicks "Apply" on a finding, it replaces one section (heading to next heading). |
| Regenerate with AI | Asks the user first, then rewrites the whole page. |
| Storage | Tiptap JSON. The LLM writes markdown, and the editor converts it to JSON at the first save. |
| Blocks | Headings, lists, tables, task lists, code, quotes, dividers, links, callouts, toggles, child-page links. No images or file uploads. |
| Secrets | The LLM writes the auth type and the credential name. It never writes a secret value. |
| Page properties | None. |
| Overview (`/home`) | Replaced by project cards. Each card shows the top 4 documented items of that project. Search sits on top. |
| Project page | Keeps its tabs and gets a "Docs" tab. |
| Search | Page results come first, from a new backend search. Other results come from the existing command bar sources. |
| Model | `InstanceAiModelService.resolveUtilityModelConfig(user)`, one `@n8n/agents` call with no tools. |
| Concurrency | The last save wins. No real-time collaboration. |
| Out of scope | Notion import, images, page properties, public pages, view tracking, project transfer handling. |

## Page kinds

The kind decides the template. Detect it from the trigger nodes of the
published version, in this priority order.

| Kind | Rule |
| --- | --- |
| `api` | Has `n8n-nodes-base.webhook` or `n8n-nodes-base.formTrigger` |
| `agent` | Is an Agent, or has `@n8n/n8n-nodes-langchain.chatTrigger` |
| `schedule` | Has `n8n-nodes-base.scheduleTrigger` or `n8n-nodes-base.cron` |
| `event` | Has any other trigger node, except `manualTrigger` and `executeWorkflowTrigger` |
| none | No page |

A child page has no kind.

## Templates

The LLM fills these headings. The "Absence API" page sets the tone: short
sections, tables for parameters, real example requests.

`api`: Overview, Endpoint (method, path, production URL), Authentication,
Parameters or Body (required and optional tables), Validation Rules, Request
Examples (with curl), Logic, Responses (each status code with an example),
Example Use Cases.

`schedule`: Overview, Schedule, What It Reads, What It Changes, Failure
Handling, Example Run.

`event`: Overview, Trigger, What It Reads, What It Changes, Failure Handling.

`agent`: Overview, Channels, How to Talk to It, Tools, Limits, Example
Conversations.

## Data model

New table `doc_page`, owned by the backend module.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | string (nanoid) | Primary key |
| `projectId` | string | FK to `project`, `ON DELETE CASCADE` |
| `parentId` | string, null | FK to `doc_page`, `ON DELETE CASCADE`. Set only on child pages |
| `resourceType` | `'workflow' \| 'agent'`, null | Null on child pages |
| `resourceId` | string, null | Null on child pages. Unique with `resourceType` |
| `kind` | `'api' \| 'schedule' \| 'event' \| 'agent'`, null | Null on child pages |
| `title` | varchar(255) | The resource name at creation |
| `content` | json, null | Tiptap document. Null until the first save in the editor |
| `markdown` | text, null | LLM output that waits for the editor to convert it. The first save sets it to null |
| `contentText` | text | Plain text for search and excerpts |
| `writtenAgainstVersionId` | string, null | Version id of the workflow or Agent at generation time |
| `updatedById` | string, null | FK to `user`, `ON DELETE SET NULL` |
| `createdAt`, `updatedAt` | timestamps | `WithTimestamps` |

`contentText` comes from the server. For `markdown`, store the markdown
itself. For `content`, walk the JSON and join every `text` field.

If the `writtenAgainstVersionId` of a page is not the `activeVersionId` of
its workflow or Agent, the page is stale.

## API contract

Put the DTOs and response types in `@n8n/api-types`. All routes sit under
`/rest/doc-pages`.

```ts
type DocPageKind = 'api' | 'schedule' | 'event' | 'agent';

type DocPageSummary = {
  id: string | null;            // null when the resource has no page yet
  resourceType: 'workflow' | 'agent';
  resourceId: string;
  projectId: string;
  name: string;                 // resource name
  kind: DocPageKind;
  excerpt: string;              // first 160 chars of contentText
  isStale: boolean;
  isPublished: boolean;
};

type DocPage = {
  id: string;
  projectId: string;
  parentId: string | null;
  resourceType: 'workflow' | 'agent' | null;
  resourceId: string | null;
  kind: DocPageKind | null;
  title: string;
  content: object | null;       // tiptap JSON
  markdown: string | null;
  isStale: boolean;
  isPublished: boolean;
  canEdit: boolean;
  breadcrumb: Array<{ id: string; title: string }>; // root first, self excluded
  children: Array<{ id: string; title: string }>;
  updatedAt: string;
};

type DocOverviewProject = {
  project: { id: string; name: string; type: string };
  items: DocPageSummary[];      // top 4
};

type DocCheckFinding = {
  heading: string;              // exact heading text of the section to replace
  problem: string;              // one sentence
  replacementMarkdown: string;  // full new section, heading included
};
```

| Method and path | Body or query | Returns | Scope |
| --- | --- | --- | --- |
| `GET /overview` | none | `DocOverviewProject[]` (below) | read on each item |
| `GET /search` | `?q=` (min 2 chars) | `DocPageSummary[]`, max 20, `LIKE` on `title` and `contentText` | read |
| `GET /projects/:projectId` | none | `DocPageSummary[]`, every documentable resource in the project | read |
| `POST /ensure` | `{ resourceType, resourceId }` | `DocPage`. If the resource is documentable and has no page, creates an empty one. No LLM call | read |
| `GET /:id` | none | `DocPage` | read |
| `PATCH /:id` | `{ title?, content? }` | `DocPage`. Saving `content` sets `markdown` to null | update |
| `POST /:id/children` | `{ title }` | `DocPage` (the child) | update |
| `DELETE /:id` | none | `{ success: true }`. Child pages only | update |
| `POST /:id/generate` | none | `DocPage`. Writes `markdown`, sets `content` to null, sets `writtenAgainstVersionId` | update |
| `POST /:id/check` | `{ markdown }` | `{ findings: DocCheckFinding[] }` | update |
| `POST /:id/mark-current` | none | `DocPage`. Sets `writtenAgainstVersionId` to the published version | update |

"read" and "update" mean `workflow:read` / `workflow:update` or `agent:read` /
`agent:update` in the page's project. A child page uses the scopes of its
root page. `generate` and `check` reject child pages.

Top 4 ranking for `/overview`: workflows by the sum of `rootCount` for
`production_success` and `production_error` in `workflow_statistics`. Agents
by their latest session time. Merge both lists, highest first. Leave out
unpublished resources.

## Backend

Module: `packages/cli/src/modules/doc-pages/`. Follow
`docs/backend/how-to/build-a-backend-module.md` and register it in
`modules.manifest.ts`. Follow the repository composition rule in `AGENTS.md`.
Use the `n8n:db-migrations` skill for the migration.

| File | Job |
| --- | --- |
| `doc-page.entity.ts` | Entity above |
| `doc-page.repository.ts` | Use-case methods: `findByResource`, `findById`, `listByProject`, `search`, `findChildren`, `findAncestors`, `save`, `deleteByResource` |
| `doc-page-kind.ts` | `detectKind(nodes)` from the table above |
| `doc-page-text.ts` | `extractText(tiptapJson)` |
| `doc-page.service.ts` | Ensure, read, update, children, overview, search, staleness |
| `doc-page-ai.service.ts` | Generate and check |
| `doc-page.listener.ts` | Event handlers below |
| `doc-page.controller.ts` | Routes above |

Event handlers:

| Event | Action |
| --- | --- |
| `workflow-activated` | If the workflow has no page and has a kind, ensure the page. Then run generate in the background, and log errors |
| `agent-published` (new) | Same for Agents. Emit it from `AgentPublishService.publishAgent` next to `agent-saved`, with `{ agentId, projectId, user }`. Add it to the relay event map |
| `workflow-deleted`, agent delete | `deleteByResource`. The FK cascade removes the child pages |

Archived or unpublished resources keep their page. `isPublished` is false.

### LLM calls

Follow `packages/cli/src/evaluation.ee/insights/eval-insights.service.ts`:
lazy `await import('@n8n/agents')`, then
`new Agent('doc-pages').model(cfg).instructions(SYSTEM).generate(prompt)`.
Get `cfg` from `InstanceAiModelService.resolveUtilityModelConfig(user)`. If no
model is set up, return a `UserError` with a clear message.

Generate input:

- Workflows: `generateWorkflowCode` from `@n8n/workflow-sdk`, run on the
  published version (`activeVersionId`), not the draft.
- Agents: the published Agent configuration JSON.
- The kind template, the webhook base URL from `UrlService`, and the rules
  below.

Generate rules for the system prompt:

- Write GitHub markdown only. Use the template headings in order. Start with
  the first heading, not a title.
- For a callout, write `> [!note]`, `> [!tip]` or `> [!warning]` on the first
  line of a quote.
- Never write a secret value. Write the auth type and the credential name.
- Use real paths, parameter names and status codes from the workflow. If a
  fact is not in the workflow, leave it out.

Check input is the page markdown from the editor plus the same workflow
input. Use `structuredOutput` with a zod schema for `DocCheckFinding[]`. A
finding replaces a full section, so `heading` must match a heading in the
page exactly.

## Frontend

Feature module: `packages/frontend/editor-ui/src/features/docPages/`. Follow
`packages/@n8n/module-cli/frontend-module-guide.md`. Put all UI text in
`@n8n/i18n`. Use the `n8n:ui-design` skill for review.

| Piece | Details |
| --- | --- |
| Store and API | `docPages.store.ts` and `docPages.api.ts` for the routes above |
| Route | `/projects/:projectId/docs/:pageId` renders `DocPageView.vue` |
| Docs tab | `projectTabs.project` entry in `module.descriptor.ts`, like the Agents tab (`features/agents/module.descriptor.ts`). Lists `GET /projects/:projectId`, grouped as APIs, Schedules, Events, Agents. Clicking an item calls `POST /ensure`, then opens the page |
| Overview | `/home` renders `DocOverview.vue` in place of the old tabs. A search box sits on top. Below it, one card for each project with its top 4 items: name, kind badge, excerpt. Keep the old `/home/*` child routes registered so existing links work |
| Search | `DocSearch.vue`. Page results from `GET /search` come first. Below them, results from the command bar composables in `features/shared/commandBar/composables/` |
| Page view | Breadcrumb, editable title, open button for the workflow or Agent, "Unpublished" badge, stale banner, editor, child pages |
| Stale banner | Text says that the workflow changed since the page was written. Buttons: "Check with AI", "Mark as current" |
| Empty page | When `content` and `markdown` are both null, show "Generate with AI" |
| Toolbar | "Check with AI" and "Regenerate with AI". Regenerate first opens a dialog that asks the user to continue |
| Check panel | Side panel with the findings. "Apply" replaces the matching section in the editor and saves |
| Editor header button | The workflow editor header and the Agent editor header get a "Docs" button. It calls `POST /ensure` and opens the page. If the resource is not documentable, hide the button |
| Autosave | Save on change with a debounce of 1 second. Send `content` from `editor.getJSON()` |

### Editor

Build `DocPageEditor.vue` in the feature folder. Reuse the extension setup of
`N8nMarkdownEditor` in the design system. Add these:

| Extension | Package or build |
| --- | --- |
| Slash menu | `@tiptap/suggestion`, with a menu of every block type |
| Drag handle | `@tiptap/extension-drag-handle-vue-3` |
| Toggle | `@tiptap/extension-details` (plus summary and content) |
| Callout | Custom node with `variant: note \| tip \| warning`. Parse and render the `> [!note]` markdown form |
| Child page link | Custom node with `pageId` and `title`. The slash item "Page" calls `POST /:id/children`, then inserts the node. Renders to markdown as a link |

Add new tiptap packages at version `3.30.5`, the version in the pnpm catalog.

Load rule: if `content` is set, load the JSON. Otherwise, load `markdown`
with the markdown content type. The first autosave then stores the JSON.

For Check, send `editor.getMarkdown()`. To apply a finding, do these steps:

1. Find the heading node with the same text.
2. Select the nodes from that heading to the next heading of the same or a
   higher level.
3. Replace them with the parsed `replacementMarkdown`.

## Demo path

1. Open Overview. See project cards with the top workflows and Agents.
2. Search "absence". The page result comes first.
3. Open an API page that the LLM wrote at publish.
4. Edit a sentence, add a callout, and add a child page "Runbook".
5. Change the webhook path in the workflow and publish.
6. See the stale banner. Run "Check with AI" and apply the Endpoint finding.

## Implementation TODO

Backend

- [ ] `doc_page` entity, migration (SQLite and Postgres), repository
- [ ] `detectKind` with a unit test for each kind and for "none"
- [ ] `extractText` with a unit test
- [ ] Service: ensure, read, update, children, delete, staleness
- [ ] Overview ranking and search
- [ ] AI service: generate and check
- [ ] Listener: first-publish generation for workflows and Agents
- [ ] `agent-published` event in `AgentPublishService`
- [ ] Listener: delete pages with their resource
- [ ] Controller with scope checks
- [ ] Types in `@n8n/api-types`

Frontend

- [ ] API client and store
- [ ] `DocPageEditor` with slash menu, drag handle, toggle, callout, child page link
- [ ] Markdown load and JSON save
- [ ] `DocPageView` with breadcrumb, banner, toolbar, check panel
- [ ] Project Docs tab
- [ ] Overview replacement on `/home`
- [ ] Combined search
- [ ] "Docs" button in the workflow and Agent editor headers
- [ ] i18n strings

## Known gaps

- When a workflow moves to another project, its page keeps the old
  `projectId`.
- Generation runs inside the request for `generate` and `check`. Long
  workflows can take 30 seconds or more.
