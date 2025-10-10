# n8n System Architecture Overview

## Third-party Dependencies

### Backend services
- **Express 5** – primary HTTP server and REST routing layer for the CLI package, combined with middlewares like `compression`, `cookie-parser`, `express-rate-limit`, and `helmet` for performance, session handling, throttling, and security headers.【F:packages/cli/package.json†L118-L140】
- **@n8n/typeorm (TypeORM fork)** – ORM abstraction for the relational database layer, powering the entity definitions in the `@n8n/db` package and supporting multiple SQL dialects.【F:packages/cli/package.json†L109-L111】【F:packages/@n8n/db/src/entities/workflow-entity.ts†L15-L41】
- **Bull queue + ioredis** – distributed job queue that backs the scaling/worker mode via Redis, orchestrated by `ScalingService` for multi-instance execution workloads.【F:packages/cli/package.json†L119-L143】【F:packages/cli/src/scaling/scaling.service.ts†L38-L200】
- **cron** – time-based scheduler used by `ScheduledTaskManager` to register and execute polling triggers on leader instances.【F:packages/cli/package.json†L118-L172】【F:packages/core/src/execution-engine/scheduled-task-manager.ts†L1-L161】
- **class-validator/class-transformer** – validation helpers applied across DTOs and entities to enforce schema constraints, e.g. credential name length and type checks.【F:packages/cli/package.json†L121-L124】【F:packages/@n8n/db/src/entities/credentials-entity.ts†L1-L43】
- **jsonwebtoken** – stateless JWT signing and verification for cookie-based web sessions managed by `AuthService`, with MFA enforcement and invalidation support.【F:packages/cli/package.json†L145-L148】【F:packages/cli/src/auth/auth.service.ts†L1-L193】
- **Axios & node-fetch ecosystem** – HTTP clients used by nodes and core services for external API calls.【F:packages/cli/package.json†L117-L144】
- **SAML/OAuth libraries** – packages such as `samlify`, `openid-client`, `oauth-1.0a`, and `@n8n/client-oauth2` enable enterprise sign-in and credential flows.【F:packages/cli/package.json†L152-L173】

### Frontend application
- **Vue 3 + Vue Router** – SPA framework used by the editor UI for component-driven screens and client-side routing.【F:packages/frontend/editor-ui/package.json†L97-L106】
- **Pinia** – global state management for workflow, settings, template, and canvas stores.【F:packages/frontend/editor-ui/package.json†L86-L88】
- **Vue Flow (@vue-flow/core)** – canvas engine that renders the workflow graph, handles pan/zoom, and exposes node/edge APIs consumed by `Canvas.vue` and related composables.【F:packages/frontend/editor-ui/package.json†L57-L61】【F:packages/frontend/editor-ui/src/features/canvas/components/Canvas.vue†L38-L179】
- **Element Plus + @n8n design system** – component library and custom design tokens that supply inputs, dialogs, sticky notes, and iconography throughout the editor.【F:packages/frontend/editor-ui/package.json†L46-L76】【F:packages/frontend/editor-ui/src/features/canvas/components/elements/nodes/render-types/CanvasNodeStickyNote.vue†L100-L124】
- **VueUse** – composable utilities for throttling, viewport adjustments, and device detection in the canvas layer.【F:packages/frontend/editor-ui/package.json†L62-L63】【F:packages/frontend/editor-ui/src/features/canvas/components/Canvas.vue†L39-L53】
- **CodeMirror 6** – embedded code editor for expression editors and script nodes via codemirror packages.【F:packages/frontend/editor-ui/package.json†L27-L37】
- **AG Grid, Chart.js, QR Code, etc.** – specialized UI widgets for table editing, analytics widgets, and credential onboarding flows.【F:packages/frontend/editor-ui/package.json†L64-L105】

## Styling stack
Tailwind CSS is configured for utility-first styling alongside theme variables, enabling dark mode through a `[data-theme="dark"]` selector, and complementing Element Plus components.【F:packages/frontend/editor-ui/tailwind.config.js†L1-L8】 Custom SCSS modules in canvas components extend Tailwind classes for fine-grained layouts (e.g. node toolbars and prompts).【F:packages/frontend/editor-ui/src/features/canvas/components/elements/nodes/render-types/CanvasNodeAddNodes.vue†L97-L132】

## Workflow Editor Architecture

### Canvas orchestration
`WorkflowCanvas.vue` adapts persisted workflow data into Vue Flow nodes and edges using the `useCanvasMapping` composable, throttling updates and triggering automatic fitView once the graph initializes.【F:packages/frontend/editor-ui/src/features/canvas/components/WorkflowCanvas.vue†L1-L95】 `Canvas.vue` layers context menus, event buses, keyboard shortcuts, and viewport management on top of Vue Flow, exposing extensive events for node activation, selection, connection creation, and workflow execution commands.【F:packages/frontend/editor-ui/src/features/canvas/components/Canvas.vue†L1-L200】

`useCanvasMapping` converts legacy workflow definitions into canvas-ready structures, calculating node render metadata, port configurations, tooltips, execution status badges, and connection handles while respecting sticky notes and experimental nodes.【F:packages/frontend/editor-ui/src/features/canvas/composables/useCanvasMapping.ts†L1-L200】

### Node renderers
Canvas nodes share a runtime contract in `canvas.types.ts`, which enumerates render types and the metadata injected into each component (icon, trigger/config flags, sticky note sizing, etc.).【F:packages/frontend/editor-ui/src/features/canvas/canvas.types.ts†L43-L200】 `CanvasNodeRenderer.vue` dispatches to the appropriate render component based on that type, ensuring all nodes run through a consistent injection pipeline.【F:packages/frontend/editor-ui/src/features/canvas/components/elements/nodes/CanvasNodeRenderer.vue†L1-L38】

| Render type | Description | Component |
|-------------|-------------|-----------|
| `default` nodes | Operational nodes with configurable IO handles, execution states, icons, tooltips, and run/pin indicators controlled by `CanvasNodeDefault.vue`. | `CanvasNodeDefault.vue`【F:packages/frontend/editor-ui/src/features/canvas/components/elements/nodes/render-types/CanvasNodeDefault.vue†L1-L118】 |
| `n8n-nodes-base.stickyNote` | Resizable sticky annotations backed by the `N8nSticky` design-system widget, with resize, edit, and context menu hooks. | `CanvasNodeStickyNote.vue`【F:packages/frontend/editor-ui/src/features/canvas/components/elements/nodes/render-types/CanvasNodeStickyNote.vue†L1-L124】 |
| `n8n-nodes-internal.addNodes` | Empty workflow placeholder presenting an add-first-step action and optional template shortcut. | `CanvasNodeAddNodes.vue`【F:packages/frontend/editor-ui/src/features/canvas/components/elements/nodes/render-types/CanvasNodeAddNodes.vue†L1-L95】 |
| `n8n-nodes-internal.choicePrompt` | Dual-choice prompt that lets builders pick between adding a trigger or opening the AI builder chat. | `CanvasNodeChoicePrompt.vue`【F:packages/frontend/editor-ui/src/features/canvas/components/elements/nodes/render-types/CanvasNodeChoicePrompt.vue†L1-L77】 |

Supporting elements such as custom edges, connection overlays, mini-map, control buttons, and toolbars are composed in `Canvas.vue`, building on Vue Flow panels and event hooks.【F:packages/frontend/editor-ui/src/features/canvas/components/Canvas.vue†L54-L179】

## Workflow Engine

### Activation and lifecycle
The `ActiveWorkflows` service keeps in-memory state of active workflows, starts trigger functions, and wires polling nodes through the scheduler. If activation fails, it emits descriptive `WorkflowActivationError`s and rolls back registrations.【F:packages/core/src/execution-engine/active-workflows.ts†L28-L195】 It leverages `TriggersAndPollers` for trigger execution and delegates cron registration to `ScheduledTaskManager`.

### Execution runtime
`WorkflowExecute` orchestrates run loops: it seeds the node execution stack, supports partial executions, handles cancellations through `PCancelable`, manages pin data, and interacts with lifecycle hooks for logging and telemetry.【F:packages/core/src/execution-engine/workflow-execute.ts†L1-L200】 The CLI layer wraps this engine via `WorkflowExecutionService` and `WorkflowRunner`, which prepare execution payloads, enqueue runs, check credential access, and handle error propagation for manual and queued runs.【F:packages/cli/src/workflows/workflow-execution.service.ts†L1-L200】【F:packages/cli/src/workflow-runner.ts†L1-L200】

### Scaling and queueing
`ScalingService` provides the abstraction for Bull-backed queues: it creates the queue with Redis clients, schedules recovery tasks when the leader comes online, registers workers, reports job failures, and gracefully pauses the queue during shutdowns or role transitions.【F:packages/cli/src/scaling/scaling.service.ts†L38-L200】 Execution jobs are tracked by `ActiveExecutions` and lifecycle hooks so the engine can resume, cancel, or inspect runs.

## Scheduler
`ScheduledTaskManager` wraps the `cron` library to register polling triggers per workflow, keyed by workflow ID, node, timezone, and recurrence metadata. It enforces leader-only execution, deduplicates registrations, logs active crons, and tears them down on workflow removal or shutdown.【F:packages/core/src/execution-engine/scheduled-task-manager.ts†L15-L161】 Polling nodes convert user-configured intervals into cron expressions before registering with this manager.【F:packages/core/src/execution-engine/active-workflows.ts†L138-L195】

## Database Schema Highlights
The `@n8n/db` package defines the relational schema via TypeORM entities:
- **WorkflowEntity** – stores workflow graphs, metadata, folder nesting, tags, static data, pin data, and version markers; linked to tag mappings and statistics for analytics.【F:packages/@n8n/db/src/entities/workflow-entity.ts†L24-L112】
- **ExecutionEntity** – tracks execution runs with status, retry links, start/stop timestamps, wait timers, metadata, and relations to execution data payloads and annotations.【F:packages/@n8n/db/src/entities/execution-entity.ts†L1-L90】
- **CredentialsEntity & SharedCredentials** – persist encrypted credential blobs, managed flags, and sharing relationships to projects via role-based access rows.【F:packages/@n8n/db/src/entities/credentials-entity.ts†L1-L43】【F:packages/@n8n/db/src/entities/shared-credentials.ts†L1-L24】
- **User, Role, and AuthIdentity** – user profiles with personalization settings, MFA fields, and relations to auth identities, API keys, and shared resources.【F:packages/@n8n/db/src/entities/user.ts†L29-L137】【F:packages/@n8n/db/src/entities/auth-identity.ts†L1-L36】
- **Project & ProjectRelation** – workspace construct that binds users to personal or team projects, with join tables linking to workflows and credentials for scoped sharing.【F:packages/@n8n/db/src/entities/project.ts†L1-L29】【F:packages/@n8n/db/src/entities/project-relation.ts†L1-L25】
- **SharedWorkflow** – mapping table granting workflow access to projects with specific sharing roles.【F:packages/@n8n/db/src/entities/shared-workflow.ts†L1-L24】
These entities inherit timestamp/id helpers and rely on JSON columns or transformers for complex node data, mirroring workflow runtime requirements.【F:packages/@n8n/db/src/entities/workflow-entity.ts†L24-L104】

## Authentication Framework
`AuthService` issues and validates JWT cookies, enforces MFA policies, handles token invalidation (storing revoked tokens), and exposes middleware that optionally skips checks for preview mode or specific endpoints. It also integrates with licensing checks to enforce seat limits before issuing sessions.【F:packages/cli/src/auth/auth.service.ts†L1-L193】 Auth identities are persisted in the database to support external providers like LDAP and SSO.【F:packages/@n8n/db/src/entities/auth-identity.ts†L1-L36】

---
This document focuses on the workflow editor canvas and workflow engine internals, covering the major supporting systems (dependencies, scheduler, database, and authentication) for a comprehensive architectural snapshot of the n8n no-code automation platform.
