# Surface MCP to Claude trial users, contained rewrite: implementation plan

> For the engineer or agent who runs this plan: do the tasks in order and use TDD inside each task.
> At each checkpoint, stage the files. Commit only after the owner of the branch agrees.

**Goal:** Ship the behavior of PR #40408 (GROX-640) as an experiment that lives in one backend module and one editor folder. Host code gets only small edits. Each edit carries the marker `Experiment cleanup: remove with surfaceMcpToClaudeTrialUsers.`

**Architecture:** The backend module `mcp-discovery` listens to three events that core already emits: `workflow-saved`, `mcp-oauth-completed` and `mcp-tool-called`. It stores per-owner state in `settings` rows and serves one visit endpoint. The editor reads the PostHog variant, the Cloud targeting data and the Claude OAuth connection from data that already exists. Each placement is one self-gating component.

**Tech stack:** NestJS-style n8n backend module (`@BackendModule`, `@RestController`), TypeORM `SettingsRepository`, Vue 3 + Pinia, Vitest, `vitest-mock-extended`, Testing Library.

## Context

- Source behavior: PR #40408 at head `83418fe963f`. A review of the PR and a local version with the review feedback came before this plan. The comparison table below describes that feedback version.
- Product spec: Linear project "Surface MCP to Claude trial users" (P-GROX-1366).
- Base: `master` at `2ca4e55502e` (12 Oct 2026).
- Open question: this plan replaces PR #40408, or its changes go to the PR branch. The PR author and the plan author decide.

## What changes compared with PR #40408

| Concern | PR #40408 after review feedback | This plan |
| --- | --- | --- |
| Assistant workflow changes | New `builder-change-saved` emit in the Instance AI adapter | Existing `workflow-saved` event with `source: 'n8n-ai'` |
| Assistant agent changes | Emit in `AgentModificationTelemetryService` | The editor relays the existing `agentUpdated` push with `source: 'builder'` |
| Claude connection | New `mcp-client-connected` emit, API key ID plumbing in 5 core files, oauth-server repository import | The editor reads `GET /mcp/oauth-clients`. The module maps OAuth client IDs from `mcp-oauth-completed` |
| PostHog | Backend `getFeatureFlagForInstance`, instance-wide assignment row, `posthog.store.ts` override | Editor `getVariant`. The experiment fires the exposure at eligibility. No `posthog.store.ts` edit |
| Targeting | DTO with `pickedClaude` and `isTrial`, Cloud API calls on each poll | One `targeted` boolean from the data that the Cloud store loads at startup |
| Shared types | New `@n8n/api-types` file and export | Module-local DTO (favorites precedent) and an editor zod schema |
| Placements | Host imports a composable and wraps markup | Host renders one self-gating component |
| Assistant preview size | Anchor ref and watcher in `InstanceAiEmptyView.vue` | The entry sits inside the measured input block |
| Canvas | `CanvasNodeRenderer.vue` swaps the render type | The entry renders in the choice prompt only |
| MCP settings | Ternaries and a duplicated button in the view, `ClaudeLogo` export | One `overrides()` getter and one wrapper component through the capability |
| Host tests | 17 host spec files | 1 (module registry list) |

Estimated footprint: 17 host files with about 120 added lines, and about 20 experiment-owned files.

## Decisions to settle before Task 1

The plan uses the first option of each decision. Each alternative names the extra cost.

1. **Assistant agent saves.** The editor relays the `agentUpdated` push (`source: 'builder'`) to the module. The Assistant view and the agent builder view open the push connection, so the relay sees saves made there. Alternative: one `eventService.emit` in `AgentSaveCompletionService.notify` plus an event map entry (3 core files). Second alternative: ignore agent saves.
2. **Exit for unnamed MCP clients.** A successful write from a client without a name counts as Claude use. Clients on the 2025 MCP protocol send their name only in the handshake, and only OAuth grants keep it. Alternative: restore the handshake event and the API key ID plumbing (5 core files).
3. **Placements.** Keep all four PR placements. Alternative: drop the Create menu entry. The Linear spec lists only three placements, and this entry is the largest host edit (Task 9).
4. **MCP settings copy.** Treatment-only copy through the capability. Alternative: ship the copy fix to both arms as a normal product change. That removes `overrides()`, but it changes the control arm.
5. **Sidebar.** Expand the sidebar once at assignment in both arms, as the Linear spec asks. This depends on the open `067_sidebar_expanded` decision.
6. **Canvas.** Show the entry only in the choice prompt. Cloud trials have the AI builder on, so the canvas always uses the choice prompt there. Alternative: also swap `AddNodes` in `CanvasNodeRenderer.vue` (1 more host file).
7. **Test cases.** `AGENTS.md` asks you to agree on unit test cases with the user before you write them. Each task lists its cases. Approve them together with this plan.

## Known differences from PR #40408

1. A write from an unnamed client counts as Claude use (decision 2).
2. If Claude connects with an API key, the CTA shows "Connect Claude" until the first write. OAuth connections show the right stage.
3. The module counts Assistant agent saves only while an editor tab with a push connection is open (decision 1).
4. Assistant restore, move and tag actions also emit `workflow-saved` with `source: 'n8n-ai'`, so they count as Assistant changes.
5. If the Cloud store has no plan or onboarding data, the editor does not visit in that session. The next page load tries again. The PR retried every 60 seconds.
6. The solid Connect button follows the Claude connection, not the total client count.
7. The proactive starter layout of the Assistant has no entry. The PR also skipped it.

## File map

Experiment-owned, backend (`packages/cli/src/modules/mcp-discovery/`):

- `mcp-discovery.module.ts`: Cloud-only module entry.
- `mcp-discovery.service.ts`: state, eligibility and event listeners.
- `mcp-discovery.controller.ts`: visit, Assistant change and coachmark routes, with the request DTO.
- `__tests__/mcp-discovery.service.test.ts`

Experiment-owned, editor (`packages/frontend/editor-ui/src/experiments/surfaceMcpToClaudeTrialUsers/`):

- `spec.md`, `setup.md`: behavior contract and PostHog setup.
- `onboarding.ts`, `onboarding.test.ts`: Claude answer in the Cloud onboarding survey.
- `stores/surfaceMcpToClaudeTrialUsers.store.ts`, `.test.ts`: state, targeting, exposure, CTA stage, telemetry.
- `useMcpDiscoveryEnrollment.ts`, `.test.ts`: App-level checks, push relay, sidebar.
- `useClaudeEntry.ts`: CTA label and click action shared by all placements.
- `useClaudeCreateMenu.ts`, `.test.ts`: Create menu item.
- `mcpDiscoverySettings.ts`: capability provider for the MCP settings page.
- `components/ClaudeEntry.vue`, `ClaudeEntry.test.ts`: self-gating placement.
- `components/ClaudeEntryButton.vue`: lazy visual part of a placement.
- `components/ClaudeLogo.vue`: Claude icon from the MCP module.
- `components/ClaudeCreateMenuIcon.vue`: Create menu icon and view tracking.
- `components/McpConnectHint.vue`, `McpConnectHint.test.ts`: coachmark around the Connect button.

Host edits:

| File | Edit |
| --- | --- |
| `packages/@n8n/backend-common/src/modules/modules.config.ts` | Module name |
| `packages/@n8n/backend-common/src/modules/module-registry.ts` | Default module |
| `packages/@n8n/backend-common/src/modules/__tests__/module-registry.test.ts` | Expected lists |
| `packages/frontend/editor-ui/src/app/constants/experiments.ts` | Experiment constant |
| `packages/frontend/@n8n/stores/src/constants.ts` | Store ID |
| `packages/@n8n/telemetry/src/events/mcp.ts` | Two entry events |
| `packages/frontend/@n8n/i18n/src/locales/en.json` | One key block |
| `packages/frontend/editor-ui/src/app/App.vue` | Enrollment call |
| `packages/frontend/editor-ui/src/app/components/MainSidebar.vue` | Sidebar entry |
| `packages/frontend/editor-ui/src/app/components/MainSidebarHeader.vue` | Create menu entry |
| `.../canvas/components/elements/nodes/render-types/CanvasNodeChoicePrompt.vue` | Canvas entry |
| `packages/frontend/editor-ui/src/features/ai/instanceAi/InstanceAiEmptyView.vue` | Assistant entry |
| `packages/frontend/editor-ui/src/app/capabilities.manifest.ts` | Capability provider |
| `packages/frontend/@n8n/frontend-module-sdk/src/capabilities/mcpDiscoverySettings.ts` | New token |
| `packages/frontend/@n8n/frontend-module-sdk/src/capabilities/index.ts` | Token export |
| `packages/frontend/@n8n/frontend-module-sdk/src/types/capability.ts` | Capability type |
| `packages/modules/mcp/frontend/src/SettingsMCPView.vue` | Overrides and wrapper |

## Tasks

### Task 1: Worktree and environment

- [ ] **Step 1: Create the worktree from fresh `origin/master`**

```bash
git fetch origin master
git worktree add worktrees/grox-640-contained-experiment -b grox-640-contained-experiment origin/master
```

- [ ] **Step 2: Install and build**

The repository needs Node 24 or later and pnpm 12.4.2 or later.

```bash
cd worktrees/grox-640-contained-experiment
pnpm install > install.log 2>&1; tail -n 5 install.log
pnpm build > build.log 2>&1; tail -n 20 build.log
```

Expected: install and build finish without errors. Add `--maxWorkers=1` to each `pnpm test` command in this plan, as `AGENTS.md` asks.

### Task 2: Backend service

**Files:**
- Create: `packages/cli/src/modules/mcp-discovery/mcp-discovery.service.ts`
- Test: `packages/cli/src/modules/mcp-discovery/__tests__/mcp-discovery.service.test.ts`

Test cases:
- `visit` excludes a user who is not the owner, and stores nothing.
- `visit` excludes an owner who is not targeted, and stores nothing.
- The first targeted visit stores `firstSeenAt` and returns `waiting` until 30 minutes later.
- At the cutoff, `visit` returns `assigned`. The assignment survives a later visit with `targeted: false`.
- An Assistant workflow save at or before the cutoff excludes the owner. A save after the cutoff and a manual save do not.
- An Assistant change from a user who never visited stores nothing.
- Claude use: a named Claude client, an unnamed API-key client and a Claude `update_workflow` count. A failed call, a read tool, a named non-Claude client and a call without a workflow ID do not.
- An unnamed OAuth call uses the client name from its `mcp-oauth-completed` grant.
- The coachmark dismissal persists.

- [ ] **Step 1: Write the failing test**

```ts
import type { Logger } from '@n8n/backend-common';
import { EventService } from '@n8n/backend-services';
import type { Settings, SettingsRepository, User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { RelayEventMap } from '@/events/maps/relay.event-map';

import { ASSISTANT_WINDOW_MS, McpDiscoveryService } from '../mcp-discovery.service';

const START = new Date('2026-10-13T10:00:00Z').getTime();
const owner = mock<User>({ id: 'owner', role: { slug: 'global:owner' } });
const member = mock<User>({ id: 'member', role: { slug: 'global:member' } });

const at = (offsetMs: number) => vi.setSystemTime(START + offsetMs);
const flush = async () => await new Promise(setImmediate);

const workflowSaved = (
	source?: RelayEventMap['workflow-saved']['source'],
): RelayEventMap['workflow-saved'] => ({ user: owner, workflow: mock(), publicApi: false, source });

const toolCall = (overrides: Partial<RelayEventMap['mcp-tool-called']> = {}) =>
	({
		user: owner,
		toolName: 'create_workflow_from_code',
		status: 'success',
		workflowId: 'wf1',
		clientName: 'claude-code',
		authType: 'api_key',
		...overrides,
	}) as RelayEventMap['mcp-tool-called'];

function setup() {
	const rows = new Map<string, string>();
	const settings = mock<SettingsRepository>();
	settings.findByKey.mockImplementation(async (key) =>
		rows.has(key) ? mock<Settings>({ key, value: rows.get(key) }) : null,
	);
	settings.findByKeyPrefix.mockImplementation(async (prefix) =>
		[...rows]
			.filter(([key]) => key.startsWith(prefix))
			.map(([key, value]) => mock<Settings>({ key, value })),
	);
	settings.insertIfAbsent.mockImplementation(async (key, value) => {
		if (!rows.has(key)) rows.set(key, value);
		return rows.get(key) === value;
	});
	const eventService = new EventService();
	const service = new McpDiscoveryService(settings, eventService, mock<Logger>());
	service.init();
	return { rows, service, eventService };
}

describe('McpDiscoveryService', () => {
	beforeEach(() => {
		vi.useFakeTimers({ toFake: ['Date'] });
		at(0);
	});

	afterEach(() => vi.useRealTimers());

	describe('visit', () => {
		it('excludes a user who is not the owner and stores nothing', async () => {
			const { rows, service } = setup();

			expect(await service.visit(member, true)).toEqual({
				status: 'excluded',
				claudeUsed: false,
				coachmarkDismissed: false,
			});
			expect(rows.size).toBe(0);
		});

		it('excludes an owner who is not targeted and stores nothing', async () => {
			const { rows, service } = setup();

			expect((await service.visit(owner, false)).status).toBe('excluded');
			expect(rows.size).toBe(0);
		});

		it('waits until 30 minutes after the first visit', async () => {
			const { service } = setup();

			expect(await service.visit(owner, true)).toMatchObject({
				status: 'waiting',
				eligibleAt: START + ASSISTANT_WINDOW_MS,
			});
			at(ASSISTANT_WINDOW_MS - 1);
			expect((await service.visit(owner, true)).status).toBe('waiting');
		});

		it('assigns the owner at the cutoff and keeps the assignment after a plan change', async () => {
			const { service } = setup();
			await service.visit(owner, true);
			at(ASSISTANT_WINDOW_MS);

			expect(await service.visit(owner, true)).toMatchObject({
				status: 'assigned',
				eligibleAt: START + ASSISTANT_WINDOW_MS,
			});
			expect((await service.visit(owner, false)).status).toBe('assigned');
		});
	});

	describe('Assistant changes', () => {
		it('excludes the owner after an Assistant workflow save at the cutoff', async () => {
			const { service, eventService } = setup();
			await service.visit(owner, true);
			at(ASSISTANT_WINDOW_MS);

			eventService.emit('workflow-saved', workflowSaved('n8n-ai'));
			await flush();

			expect((await service.visit(owner, true)).status).toBe('excluded');
		});

		it('ignores manual saves and Assistant changes after the cutoff', async () => {
			const { service, eventService } = setup();
			await service.visit(owner, true);

			eventService.emit('workflow-saved', workflowSaved());
			await flush();
			at(ASSISTANT_WINDOW_MS + 1);
			await service.recordAssistantChange(owner.id);

			expect((await service.visit(owner, true)).status).toBe('assigned');
		});

		it('stores nothing for a user who never visited', async () => {
			const { rows, eventService } = setup();

			eventService.emit('workflow-saved', workflowSaved('n8n-ai'));
			await flush();

			expect(rows.size).toBe(0);
		});
	});

	describe('Claude use', () => {
		it.each([
			['a named Claude client', {}],
			['an unnamed API-key client', { clientName: undefined }],
			['a Claude update', { toolName: 'update_workflow' }],
		])('records use from %s', async (_, overrides) => {
			const { service, eventService } = setup();
			await service.visit(owner, true);

			eventService.emit('mcp-tool-called', toolCall(overrides));
			await flush();

			expect((await service.visit(owner, true)).claudeUsed).toBe(true);
		});

		it.each([
			['a failed call', { status: 'error' as const }],
			['a read tool', { toolName: 'search_workflows' }],
			['a named non-Claude client', { clientName: 'Cursor' }],
			['a call without a workflow', { workflowId: undefined }],
		])('ignores %s', async (_, overrides) => {
			const { service, eventService } = setup();
			await service.visit(owner, true);

			eventService.emit('mcp-tool-called', toolCall(overrides));
			await flush();

			expect((await service.visit(owner, true)).claudeUsed).toBe(false);
		});

		it('uses the client name from the OAuth grant for an unnamed OAuth call', async () => {
			const { service, eventService } = setup();
			await service.visit(owner, true);
			eventService.emit('mcp-oauth-completed', { userId: owner.id, clientId: 'c1', clientName: 'Cursor' });
			eventService.emit('mcp-oauth-completed', { userId: owner.id, clientId: 'c2', clientName: 'Claude' });
			await flush();

			eventService.emit(
				'mcp-tool-called',
				toolCall({ clientName: undefined, authType: 'oauth', clientId: 'c1' }),
			);
			await flush();
			expect((await service.visit(owner, true)).claudeUsed).toBe(false);

			eventService.emit(
				'mcp-tool-called',
				toolCall({ clientName: undefined, authType: 'oauth', clientId: 'c2' }),
			);
			await flush();
			expect((await service.visit(owner, true)).claudeUsed).toBe(true);
		});
	});

	it('keeps the coachmark dismissal', async () => {
		const { service } = setup();
		await service.visit(owner, true);

		await service.dismissCoachmark(owner.id);

		expect((await service.visit(owner, true)).coachmarkDismissed).toBe(true);
	});
});
```

- [ ] **Step 2: Run the test and make sure that it fails**

Run: `pushd packages/cli && pnpm test src/modules/mcp-discovery; popd`
Expected: FAIL with "Cannot find module '../mcp-discovery.service'".

- [ ] **Step 3: Write the service**

```ts
import { Logger } from '@n8n/backend-common';
import { EventService, type EventMap } from '@n8n/backend-services';
import { SettingsRepository } from '@n8n/db';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

/** An owner without an Assistant change in this window after the first visit becomes eligible. */
export const ASSISTANT_WINDOW_MS = 30 * 60 * 1000;

const WORKFLOW_WRITE_TOOLS = new Set(['create_workflow_from_code', 'update_workflow']);

// Claude clients report names such as "Claude", "claude-code", "Anthropic/ClaudeAI" and "Anthropic/Toolbox".
const isClaudeClient = (name: string) => /claude|anthropic/i.test(name);

export type McpDiscoveryState = {
	status: 'excluded' | 'waiting' | 'assigned';
	eligibleAt?: number;
	claudeUsed: boolean;
	coachmarkDismissed: boolean;
};

type Field =
	| 'firstSeenAt'
	| 'assistantChangedAt'
	| 'eligibleAt'
	| 'claudeUsedAt'
	| 'coachmarkDismissed'
	| `oauthClient.${string}`;

const keyPrefix = (userId: string) => `experiment.mcpDiscovery.${userId}.`;

const toNumber = (value: string | undefined) =>
	value && Number.isFinite(Number(value)) ? Number(value) : undefined;

/** Assistant history freezes at the cutoff: a later change never excludes the owner. */
function evaluate(now: number, firstSeenAt: number, assistantChangedAt?: number) {
	const eligibleAt = firstSeenAt + ASSISTANT_WINDOW_MS;
	if (assistantChangedAt !== undefined && assistantChangedAt <= eligibleAt) {
		return { status: 'excluded' as const };
	}
	return { status: now < eligibleAt ? ('waiting' as const) : ('eligible' as const), eligibleAt };
}

/**
 * Per-owner state of the "Surface MCP to Claude trial users" experiment.
 * It reads events that core already emits, so no core service depends on it.
 */
@Service()
export class McpDiscoveryService {
	constructor(
		private readonly settings: SettingsRepository,
		private readonly eventService: EventService,
		private readonly logger: Logger,
	) {}

	init() {
		this.on('workflow-saved', async ({ user, source }) => {
			if (source === 'n8n-ai') await this.recordAssistantChange(user.id);
		});
		this.on('mcp-oauth-completed', async ({ userId, clientId, clientName }) => {
			if (clientName && (await this.isParticipant(userId))) {
				await this.keepFirst(userId, `oauthClient.${clientId}`, clientName);
			}
		});
		this.on('mcp-tool-called', async (event) => await this.recordToolCall(event));
	}

	async visit(user: Pick<User, 'id' | 'role'>, targeted: boolean): Promise<McpDiscoveryState> {
		if (user.role.slug !== 'global:owner') {
			return { status: 'excluded', claudeUsed: false, coachmarkDismissed: false };
		}
		const values = await this.read(user.id);
		const base = {
			claudeUsed: values.has('claudeUsedAt'),
			coachmarkDismissed: values.has('coachmarkDismissed'),
		};

		// A saved assignment survives plan changes.
		const savedEligibleAt = toNumber(values.get('eligibleAt'));
		if (savedEligibleAt !== undefined) {
			return { ...base, status: 'assigned', eligibleAt: savedEligibleAt };
		}
		if (!targeted) return { ...base, status: 'excluded' };

		// The editor visits on its first load, so the first visit stands in for the first login.
		const firstSeenAt = toNumber(
			values.get('firstSeenAt') ??
				(await this.keepFirst(user.id, 'firstSeenAt', String(Date.now()))),
		);
		if (firstSeenAt === undefined) return { ...base, status: 'excluded' };

		const result = evaluate(Date.now(), firstSeenAt, toNumber(values.get('assistantChangedAt')));
		if (result.status !== 'eligible') return { ...base, ...result };
		const eligibleAt = toNumber(
			await this.keepFirst(user.id, 'eligibleAt', String(result.eligibleAt)),
		);
		return { ...base, status: 'assigned', eligibleAt: eligibleAt ?? result.eligibleAt };
	}

	async recordAssistantChange(userId: string) {
		// Read the time before the first await, so a slow query cannot move the change past the cutoff.
		const changedAt = String(Date.now());
		if (await this.isParticipant(userId)) {
			await this.keepFirst(userId, 'assistantChangedAt', changedAt);
		}
	}

	async dismissCoachmark(userId: string) {
		await this.keepFirst(userId, 'coachmarkDismissed', 'true');
	}

	private async recordToolCall(event: EventMap['mcp-tool-called']) {
		const { user, toolName, status, workflowId } = event;
		if (status !== 'success' || !workflowId || !WORKFLOW_WRITE_TOOLS.has(toolName)) return;
		if (!(await this.isParticipant(user.id))) return;
		// Clients on the 2025 protocol send their name only in the handshake. The OAuth grant keeps it.
		const name =
			event.clientName ??
			(event.authType === 'oauth'
				? (await this.settings.findByKey(`${keyPrefix(user.id)}oauthClient.${event.clientId}`))
						?.value
				: undefined);
		// ponytail: an unnamed client counts as Claude, because a 2025-protocol API-key caller has no name.
		// Add a handshake event if unnamed non-Claude writes show up in the data.
		if (name && !isClaudeClient(name)) return;
		await this.keepFirst(user.id, 'claudeUsedAt', String(Date.now()));
	}

	/** Only targeted owners have a first visit, so other users never get rows. */
	private async isParticipant(userId: string) {
		return (await this.settings.findByKey(`${keyPrefix(userId)}firstSeenAt`)) !== null;
	}

	/** Loads all fields of the user in one query. */
	private async read(userId: string) {
		const prefix = keyPrefix(userId);
		const rows = await this.settings.findByKeyPrefix(prefix);
		return new Map(rows.map((row) => [row.key.slice(prefix.length), row.value]));
	}

	/** Keeps the first value written for a field and returns the stored value. */
	private async keepFirst(userId: string, field: Field, value: string) {
		const key = keyPrefix(userId) + field;
		if (await this.settings.insertIfAbsent(key, value)) return value;
		return (await this.settings.findByKey(key))?.value;
	}

	/** A listener must never reject into the code path that emitted the event. */
	private on<Name extends keyof EventMap>(
		name: Name,
		handler: (event: EventMap[Name]) => Promise<void>,
	) {
		this.eventService.on(name, async (event) => {
			try {
				await handler(event);
			} catch (error) {
				this.logger.warn('Failed to record MCP discovery activity', { error });
			}
		});
	}
}
```

- [ ] **Step 4: Run the test and make sure that it passes**

Run: `pushd packages/cli && pnpm test src/modules/mcp-discovery; popd`
Expected: PASS, 16 tests.

- [ ] **Step 5: Checkpoint**

```bash
git add packages/cli/src/modules/mcp-discovery
```

### Task 3: Backend controller, module and registration

**Files:**
- Create: `packages/cli/src/modules/mcp-discovery/mcp-discovery.controller.ts`
- Create: `packages/cli/src/modules/mcp-discovery/mcp-discovery.module.ts`
- Modify: `packages/@n8n/backend-common/src/modules/modules.config.ts` (end of `MODULE_NAMES`)
- Modify: `packages/@n8n/backend-common/src/modules/module-registry.ts` (end of `defaultModules`)
- Modify: `packages/@n8n/backend-common/src/modules/__tests__/module-registry.test.ts` (both expected lists)

The controller only forwards to the service, so it gets no own test.

- [ ] **Step 1: Write the controller**

```ts
import { Z } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Body, Post, RestController } from '@n8n/decorators';
import { z } from 'zod';

import { McpDiscoveryService } from './mcp-discovery.service';

class McpDiscoveryVisitDto extends Z.class({ targeted: z.boolean() }) {}

// No scope decorator: each route reads or writes only the state of the caller.
@RestController('/mcp-discovery')
export class McpDiscoveryController {
	constructor(private readonly service: McpDiscoveryService) {}

	@Post('/visit')
	async visit(req: AuthenticatedRequest, _res: unknown, @Body payload: McpDiscoveryVisitDto) {
		return await this.service.visit(req.user, payload.targeted);
	}

	/** The editor relays Assistant agent saves, because no backend event carries their user. */
	@Post('/assistant-change')
	async assistantChange(req: AuthenticatedRequest) {
		await this.service.recordAssistantChange(req.user.id);
		return { success: true };
	}

	@Post('/coachmark-dismissed')
	async coachmarkDismissed(req: AuthenticatedRequest) {
		await this.service.dismissCoachmark(req.user.id);
		return { success: true };
	}
}
```

- [ ] **Step 2: Write the module**

```ts
import { GlobalConfig } from '@n8n/config';
import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';

/**
 * Backend of the "Surface MCP to Claude trial users" experiment.
 * Experiment cleanup: remove with surfaceMcpToClaudeTrialUsers.
 */
@BackendModule({ name: 'mcp-discovery', instanceTypes: ['main'] })
export class McpDiscoveryModule implements ModuleInterface {
	async init() {
		// The experiment targets Cloud trials only.
		if (Container.get(GlobalConfig).deployment.type !== 'cloud') return;

		await import('./mcp-discovery.controller.js');
		const { McpDiscoveryService } = await import('./mcp-discovery.service.js');
		Container.get(McpDiscoveryService).init();
	}
}
```

- [ ] **Step 3: Register the module name**

In `modules.config.ts`, add after `'scim',` at the end of `MODULE_NAMES`:

```ts
	// Experiment cleanup: remove with surfaceMcpToClaudeTrialUsers.
	'mcp-discovery',
```

In `module-registry.ts`, add after `'scim',` at the end of `defaultModules`:

```ts
		// Experiment cleanup: remove with surfaceMcpToClaudeTrialUsers.
		'mcp-discovery',
```

In `module-registry.test.ts`, add `'mcp-discovery',` after `'scim',` in both expected lists. In the second list it goes before `'type-availability-policies',`.

- [ ] **Step 4: Run the tests and the typecheck**

```bash
pushd packages/@n8n/backend-common && pnpm test src/modules/__tests__/module-registry.test.ts; popd
pushd packages/cli && pnpm test src/modules/mcp-discovery && pnpm typecheck; popd
```

Expected: PASS, and the typecheck shows no new errors.

- [ ] **Step 5: Checkpoint**

```bash
git add packages/cli/src/modules/mcp-discovery packages/@n8n/backend-common/src/modules
```

### Task 4: Shared registrations

**Files:**
- Modify: `packages/frontend/editor-ui/src/app/constants/experiments.ts` (after `MCP_JSON_NUDGE_EXPERIMENT`)
- Modify: `packages/frontend/@n8n/stores/src/constants.ts` (before `EXPERIMENT_TRIAL_INTRO_MODAL`)
- Modify: `packages/@n8n/telemetry/src/events/mcp.ts`
- Modify: `packages/frontend/@n8n/i18n/src/locales/en.json` (before `"experiments.trialIntroModal.eyebrow"`)

- [ ] **Step 1: Add the experiment constant**

```ts
// Experiment cleanup: remove with surfaceMcpToClaudeTrialUsers.
// Not in EXPERIMENTS_TO_TRACK: participation starts at eligibility, and the experiment tracks it.
export const SURFACE_MCP_TO_CLAUDE_TRIAL_USERS_EXPERIMENT = createExperiment(
	'123_surface_mcp_to_claude_trial_users',
);
```

- [ ] **Step 2: Add the store ID**

```ts
	// Experiment cleanup: remove with surfaceMcpToClaudeTrialUsers.
	EXPERIMENT_SURFACE_MCP_TO_CLAUDE_TRIAL_USERS: 'surfaceMcpToClaudeTrialUsers',
```

- [ ] **Step 3: Register the two entry events**

In `mcp.ts`, add after the `nudgeSurface` constant:

```ts
// Experiment cleanup: remove with surfaceMcpToClaudeTrialUsers.
const discoveryEntry = z.looseObject({
	variant: z.literal('variant'),
	surface: z.enum(['sidebar', 'create_menu', 'canvas', 'assistant']),
	cta_stage: z.enum(['build', 'connect', 'build_in_claude']),
});
```

Add at the start of the `defineTelemetryEvents({` object:

```ts
	// Experiment cleanup: remove with surfaceMcpToClaudeTrialUsers.
	DISCOVERY_ENTRY_VIEWED: {
		name: 'User viewed MCP discovery entry point',
		description:
			'A treatment entry point of the "Surface MCP to Claude trial users" experiment became visible. Recorded once for each placement in each editor session.',
		properties: discoveryEntry,
	},
	DISCOVERY_ENTRY_CLICKED: {
		name: 'User clicked MCP discovery entry point',
		description:
			'The user clicked a treatment entry point. Before Claude connects, it opens MCP settings. After that, it opens Claude in a new tab.',
		properties: discoveryEntry,
	},
```

- [ ] **Step 4: Add the copy block**

```json
	"experiments.surfaceMcpToClaudeTrialUsers.cta.build": "Build with Claude",
	"experiments.surfaceMcpToClaudeTrialUsers.cta.connect": "Connect Claude",
	"experiments.surfaceMcpToClaudeTrialUsers.cta.connectToN8n": "Connect to n8n",
	"experiments.surfaceMcpToClaudeTrialUsers.settings.description": "Connect AI assistants like Claude to build and run workflows in n8n. You choose which workflows and tools they can access.",
	"experiments.surfaceMcpToClaudeTrialUsers.settings.docsLeadingText": "Learn how to get started in the ",
	"experiments.surfaceMcpToClaudeTrialUsers.settings.docsLabel": "documentation",
	"experiments.surfaceMcpToClaudeTrialUsers.settings.clientTitle": "Connect your AI assistant",
	"experiments.surfaceMcpToClaudeTrialUsers.settings.clientDescription": "Choose an assistant like Claude and follow the steps to connect it to n8n.",
	"experiments.surfaceMcpToClaudeTrialUsers.settings.connectHint": "Next, connect an AI assistant like Claude to start building workflows.",
	"experiments.surfaceMcpToClaudeTrialUsers.settings.connectHintDismiss": "Got it",
```

The copy comes from the PR. Ask the `n8n:content-design` skill for a review before the PR opens.

- [ ] **Step 5: Run the telemetry tests and build the shared packages**

```bash
pushd packages/@n8n/telemetry && pnpm test && pnpm build; popd
pushd packages/frontend/@n8n/stores && pnpm build; popd
pushd packages/frontend/@n8n/i18n && pnpm build; popd
```

Expected: PASS, and the builds succeed.

- [ ] **Step 6: Checkpoint**

```bash
git add packages/frontend/editor-ui/src/app/constants/experiments.ts packages/frontend/@n8n/stores/src/constants.ts packages/@n8n/telemetry/src/events/mcp.ts packages/frontend/@n8n/i18n/src/locales/en.json
```

### Task 5: Onboarding parser

**Files:**
- Create: `packages/frontend/editor-ui/src/experiments/surfaceMcpToClaudeTrialUsers/onboarding.ts`
- Test: `packages/frontend/editor-ui/src/experiments/surfaceMcpToClaudeTrialUsers/onboarding.test.ts`

Test cases:
- For both supported surveys: Claude alone, Claude among other choices, no Claude, an empty answer, a malformed answer.
- For both supported surveys: Claude in another question does not count.
- Missing data and an unsupported survey give `false`.

- [ ] **Step 1: Write the failing test**

```ts
import { pickedClaudeInOnboarding } from './onboarding';

describe.each([
	{ surveyId: 'OArzTwNz', field: '6fe33101-6331-4088-b54f-ae4afe727f96' },
	{ surveyId: 'x0RS6StY', field: 'do_you_use_agents' },
])('pickedClaudeInOnboarding ($surveyId)', ({ surveyId, field }) => {
	it.each([
		{ answer: ['Claude (incl. Claude Code)'], expected: true },
		{ answer: ['ChatGPT', 'Claude (incl. Claude Code)', 'Cursor'], expected: true },
		{ answer: ['ChatGPT', 'Cursor'], expected: false },
		{ answer: [], expected: false },
		{ answer: 'Claude (incl. Claude Code)', expected: false },
		{ answer: undefined, expected: false },
	])('reads $answer', ({ answer, expected }) => {
		expect(pickedClaudeInOnboarding({ surveyId, [field]: answer })).toBe(expected);
	});

	it('does not read Claude from another question', () => {
		expect(pickedClaudeInOnboarding({ surveyId, referral: ['Claude (incl. Claude Code)'] })).toBe(
			false,
		);
	});
});

it.each([
	undefined,
	{},
	{ surveyId: 'ED6JPvTCMGCCYJud', do_you_use_agents: ['Claude (incl. Claude Code)'] },
])('excludes missing data and unsupported surveys: %j', (information) => {
	expect(pickedClaudeInOnboarding(information)).toBe(false);
});
```

- [ ] **Step 2: Run the test and make sure that it fails**

Run: `pushd packages/frontend/editor-ui && pnpm test src/experiments/surfaceMcpToClaudeTrialUsers/onboarding.test.ts; popd`
Expected: FAIL with "Cannot find module './onboarding'".

- [ ] **Step 3: Write the parser**

```ts
// Cloud stores Typeform answers by form ID and question ref.
const AI_TOOLS_FIELD_BY_SURVEY = new Map([
	['OArzTwNz', '6fe33101-6331-4088-b54f-ae4afe727f96'],
	['x0RS6StY', 'do_you_use_agents'],
]);

const CLAUDE_CHOICE = 'Claude (incl. Claude Code)';

/** Whether the owner picked Claude in the multi-select AI tools question of the Cloud onboarding. */
export function pickedClaudeInOnboarding(information?: Record<string, unknown>): boolean {
	const surveyId = information?.surveyId;
	const field = typeof surveyId === 'string' ? AI_TOOLS_FIELD_BY_SURVEY.get(surveyId) : undefined;
	const answer = field ? information?.[field] : undefined;
	return Array.isArray(answer) && answer.includes(CLAUDE_CHOICE);
}
```

- [ ] **Step 4: Run the test and make sure that it passes**

Run: `pushd packages/frontend/editor-ui && pnpm test src/experiments/surfaceMcpToClaudeTrialUsers/onboarding.test.ts; popd`
Expected: PASS, 17 tests.

- [ ] **Step 5: Checkpoint**

```bash
git add packages/frontend/editor-ui/src/experiments/surfaceMcpToClaudeTrialUsers
```

### Task 6: Experiment store

**Files:**
- Create: `packages/frontend/editor-ui/src/experiments/surfaceMcpToClaudeTrialUsers/stores/surfaceMcpToClaudeTrialUsers.store.ts`
- Test: `packages/frontend/editor-ui/src/experiments/surfaceMcpToClaudeTrialUsers/stores/surfaceMcpToClaudeTrialUsers.store.test.ts`

Test cases:
- If the instance has no variant (flag off or not in rollout), the store does not visit.
- `targeted` is true for a trial owner who picked Claude, and false on a paid plan.
- Participation is tracked once, at assignment, and not while waiting.
- Entry points show for treatment until Claude use, and never for control.
- The CTA stage is `build` with MCP off, `connect` with MCP on and no Claude client, and `build_in_claude` with a Claude OAuth client.
- Each placement view is tracked once, with the stage and the `$feature` property.

- [ ] **Step 1: Write the failing test**

```ts
import { createPinia, setActivePinia } from 'pinia';
import { TELEMETRY_EVENT } from '@n8n/telemetry';

import { SURFACE_MCP_TO_CLAUDE_TRIAL_USERS_EXPERIMENT as EXPERIMENT } from '@/app/constants/experiments';

const mocks = vi.hoisted(() => ({
	makeRestApiRequest: vi.fn(),
	track: vi.fn(),
	getVariant: vi.fn(),
	trackExposure: vi.fn(),
	users: { currentUser: { id: 'owner' }, isInstanceOwner: true },
	cloudPlan: {
		currentPlanData: { metadata: { group: 'trial' } },
		currentUserCloudInfo: {
			information: { surveyId: 'x0RS6StY', do_you_use_agents: ['Claude (incl. Claude Code)'] },
		},
	},
	settings: { moduleSettings: { mcp: { mcpAccessEnabled: false } } },
}));

vi.mock('@n8n/rest-api-client', () => ({ makeRestApiRequest: mocks.makeRestApiRequest }));
vi.mock('@n8n/composables/useTelemetry', () => ({ useTelemetry: () => ({ track: mocks.track }) }));
vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: () => ({ getVariant: mocks.getVariant, trackExposure: mocks.trackExposure }),
}));
vi.mock('@n8n/stores/users.store', () => ({ useUsersStore: () => mocks.users }));
vi.mock('@n8n/stores/cloudPlan.store', () => ({ useCloudPlanStore: () => mocks.cloudPlan }));
vi.mock('@n8n/stores/settings.store', () => ({ useSettingsStore: () => mocks.settings }));
vi.mock('@n8n/stores/useRootStore', () => ({ useRootStore: () => ({ restApiContext: {} }) }));

import { useSurfaceMcpToClaudeTrialUsersStore as useStore } from './surfaceMcpToClaudeTrialUsers.store';

function respond(state: Record<string, unknown>, clients: string[] = []) {
	mocks.makeRestApiRequest.mockImplementation(async (_context, _method, url: string) => {
		if (url === '/mcp-discovery/visit') {
			return { status: 'assigned', eligibleAt: 1, claudeUsed: false, coachmarkDismissed: false, ...state };
		}
		if (url === '/mcp/oauth-clients') return { data: clients.map((name) => ({ name })) };
		return { success: true };
	});
}

describe('surfaceMcpToClaudeTrialUsers store', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
		mocks.getVariant.mockReturnValue(EXPERIMENT.variant);
		mocks.cloudPlan.currentPlanData = { metadata: { group: 'trial' } };
		mocks.settings.moduleSettings.mcp.mcpAccessEnabled = false;
	});

	it('does not visit when the instance has no variant', async () => {
		mocks.getVariant.mockReturnValue(undefined);

		await useStore().refresh();

		expect(mocks.makeRestApiRequest).not.toHaveBeenCalled();
	});

	it.each([
		['a trial owner who picked Claude', 'trial', true],
		['an owner on a paid plan', 'opt-in', false],
	])('sends targeted for %s', async (_, group, targeted) => {
		mocks.cloudPlan.currentPlanData = { metadata: { group } };
		respond({ status: 'excluded' });

		await useStore().refresh();

		expect(mocks.makeRestApiRequest).toHaveBeenCalledWith({}, 'POST', '/mcp-discovery/visit', {
			targeted,
		});
	});

	it('tracks participation once, at assignment', async () => {
		const store = useStore();
		respond({ status: 'waiting' });
		await store.refresh();
		expect(mocks.track).not.toHaveBeenCalled();

		respond({ status: 'assigned' });
		await store.refresh();
		await store.refresh();

		expect(mocks.track).toHaveBeenCalledTimes(1);
		expect(mocks.track).toHaveBeenCalledWith(TELEMETRY_EVENT.PLATFORM.USER_IS_PART_OF_EXPERIMENT, {
			name: EXPERIMENT.name,
			variant: EXPERIMENT.variant,
		});
		expect(mocks.trackExposure).toHaveBeenCalledWith(EXPERIMENT.name);
	});

	it.each([
		[EXPERIMENT.variant, false, true],
		[EXPERIMENT.variant, true, false],
		[EXPERIMENT.control, false, false],
	])('shows entry points for %s with Claude use %s: %s', async (variant, claudeUsed, expected) => {
		mocks.getVariant.mockReturnValue(variant);
		respond({ claudeUsed });
		const store = useStore();

		await store.refresh();

		expect(store.shouldShowEntryPoints).toBe(expected);
	});

	it.each([
		[false, [], 'build'],
		[true, ['Cursor'], 'connect'],
		[true, ['Anthropic/ClaudeAI'], 'build_in_claude'],
	])('with MCP on %s and clients %j the stage is %s', async (enabled, clients, stage) => {
		mocks.settings.moduleSettings.mcp.mcpAccessEnabled = enabled;
		respond({}, clients);
		const store = useStore();

		await store.refresh();

		expect(store.ctaStage).toBe(stage);
	});

	it('tracks each placement view once, with the stage and the flag', async () => {
		respond({});
		const store = useStore();
		await store.refresh();
		mocks.track.mockClear();

		store.trackEntry('sidebar', 'viewed');
		store.trackEntry('sidebar', 'viewed');
		store.trackEntry('sidebar', 'clicked');

		expect(mocks.track).toHaveBeenCalledTimes(2);
		expect(mocks.track).toHaveBeenCalledWith(TELEMETRY_EVENT.MCP.DISCOVERY_ENTRY_VIEWED, {
			surface: 'sidebar',
			cta_stage: 'build',
			variant: EXPERIMENT.variant,
			[`$feature/${EXPERIMENT.name}`]: EXPERIMENT.variant,
		});
	});
});
```

- [ ] **Step 2: Run the test and make sure that it fails**

Run: `pushd packages/frontend/editor-ui && pnpm test src/experiments/surfaceMcpToClaudeTrialUsers/stores; popd`
Expected: FAIL with "Cannot find module './surfaceMcpToClaudeTrialUsers.store'".

- [ ] **Step 3: Write the store**

```ts
import type { ListOAuthClientsResponseDto } from '@n8n/api-types';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import { STORES } from '@n8n/stores';
import { useCloudPlanStore } from '@n8n/stores/cloudPlan.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useUsersStore } from '@n8n/stores/users.store';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { z } from 'zod';

import { SURFACE_MCP_TO_CLAUDE_TRIAL_USERS_EXPERIMENT as EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';
import { getExperimentTelemetryPayload } from '@/experiments/utils';

import { pickedClaudeInOnboarding } from '../onboarding';

export type ClaudeEntryPlacement = 'sidebar' | 'create_menu' | 'canvas' | 'assistant';
export type ClaudeCtaStage = 'build' | 'connect' | 'build_in_claude';

// Mirrors McpDiscoveryState in packages/cli/src/modules/mcp-discovery/mcp-discovery.service.ts.
const stateSchema = z.object({
	status: z.enum(['excluded', 'waiting', 'assigned']),
	eligibleAt: z.number().optional(),
	claudeUsed: z.boolean(),
	coachmarkDismissed: z.boolean(),
});

// Claude clients report names such as "Claude", "claude-code", "Anthropic/ClaudeAI" and "Anthropic/Toolbox".
const isClaudeClient = (name: string) => /claude|anthropic/i.test(name);

export const useSurfaceMcpToClaudeTrialUsersStore = defineStore(
	STORES.EXPERIMENT_SURFACE_MCP_TO_CLAUDE_TRIAL_USERS,
	() => {
		const rootStore = useRootStore();
		const settingsStore = useSettingsStore();
		const usersStore = useUsersStore();
		const cloudPlanStore = useCloudPlanStore();
		const posthogStore = usePostHog();
		const telemetry = useTelemetry();

		const state = ref<z.infer<typeof stateSchema>>();
		const hasConnectedClaude = ref(false);
		const viewed = new Set<ClaudeEntryPlacement>();
		let participationTracked = false;

		// PostHog assigns the variant per instance. No variant means the flag is off for this instance.
		const variant = computed(() => posthogStore.getVariant(EXPERIMENT.name));
		const isInExperiment = computed(
			() => variant.value === EXPERIMENT.control || variant.value === EXPERIMENT.variant,
		);
		const isAssigned = computed(() => isInExperiment.value && state.value?.status === 'assigned');
		const isTreatment = computed(() => isAssigned.value && variant.value === EXPERIMENT.variant);
		const shouldShowEntryPoints = computed(() => isTreatment.value && !state.value?.claudeUsed);
		const isMcpEnabled = computed(() => !!settingsStore.moduleSettings.mcp?.mcpAccessEnabled);
		const ctaStage = computed<ClaudeCtaStage>(() => {
			if (!isMcpEnabled.value) return 'build';
			return hasConnectedClaude.value ? 'build_in_claude' : 'connect';
		});
		const shouldShowConnectHint = computed(
			() =>
				shouldShowEntryPoints.value &&
				isMcpEnabled.value &&
				!hasConnectedClaude.value &&
				!state.value?.coachmarkDismissed,
		);

		async function refresh() {
			const userId = usersStore.currentUser?.id;
			if (!userId || !usersStore.isInstanceOwner || !isInExperiment.value) return;
			// The Cloud store loads the plan and the onboarding answers once at startup.
			const targeted =
				cloudPlanStore.currentPlanData?.metadata?.group === 'trial' &&
				pickedClaudeInOnboarding(cloudPlanStore.currentUserCloudInfo?.information);
			const response = await makeRestApiRequest(
				rootStore.restApiContext,
				'POST',
				'/mcp-discovery/visit',
				{ targeted },
			);
			if (usersStore.currentUser?.id !== userId) return;
			state.value = stateSchema.parse(response);
			if (!isAssigned.value) return;
			trackParticipation();
			if (shouldShowEntryPoints.value && isMcpEnabled.value) {
				hasConnectedClaude.value = await fetchHasConnectedClaude();
			}
		}

		async function fetchHasConnectedClaude() {
			const { data } = await makeRestApiRequest<ListOAuthClientsResponseDto>(
				rootStore.restApiContext,
				'GET',
				'/mcp/oauth-clients',
				{ ownership: 'mine', take: 100 },
			);
			return data.some((client) => isClaudeClient(client.name));
		}

		function trackParticipation() {
			if (participationTracked || typeof variant.value !== 'string') return;
			participationTracked = true;
			telemetry.track(TELEMETRY_EVENT.PLATFORM.USER_IS_PART_OF_EXPERIMENT, {
				name: EXPERIMENT.name,
				variant: variant.value,
			});
			posthogStore.trackExposure(EXPERIMENT.name);
		}

		function trackEntry(placement: ClaudeEntryPlacement, action: 'viewed' | 'clicked') {
			if (!isTreatment.value) return;
			if (action === 'viewed') {
				if (viewed.has(placement)) return;
				viewed.add(placement);
			}
			telemetry.track(
				action === 'viewed'
					? TELEMETRY_EVENT.MCP.DISCOVERY_ENTRY_VIEWED
					: TELEMETRY_EVENT.MCP.DISCOVERY_ENTRY_CLICKED,
				getExperimentTelemetryPayload(EXPERIMENT, EXPERIMENT.variant, {
					surface: placement,
					cta_stage: ctaStage.value,
				}),
			);
		}

		async function dismissCoachmark() {
			if (state.value) state.value.coachmarkDismissed = true;
			await makeRestApiRequest(rootStore.restApiContext, 'POST', '/mcp-discovery/coachmark-dismissed');
		}

		async function recordAssistantAgentChange() {
			await makeRestApiRequest(rootStore.restApiContext, 'POST', '/mcp-discovery/assistant-change');
		}

		function reset() {
			state.value = undefined;
			hasConnectedClaude.value = false;
			participationTracked = false;
			viewed.clear();
		}

		return {
			state,
			hasConnectedClaude,
			isAssigned,
			isTreatment,
			shouldShowEntryPoints,
			shouldShowConnectHint,
			ctaStage,
			refresh,
			trackEntry,
			dismissCoachmark,
			recordAssistantAgentChange,
			reset,
		};
	},
);
```

- [ ] **Step 4: Run the test and make sure that it passes**

Run: `pushd packages/frontend/editor-ui && pnpm test src/experiments/surfaceMcpToClaudeTrialUsers/stores; popd`
Expected: PASS, 11 tests.

- [ ] **Step 5: Checkpoint**

```bash
git add packages/frontend/editor-ui/src/experiments/surfaceMcpToClaudeTrialUsers
```

### Task 7: Enrollment composable and App.vue

**Files:**
- Create: `packages/frontend/editor-ui/src/experiments/surfaceMcpToClaudeTrialUsers/useMcpDiscoveryEnrollment.ts`
- Test: `packages/frontend/editor-ui/src/experiments/surfaceMcpToClaudeTrialUsers/useMcpDiscoveryEnrollment.test.ts`
- Modify: `packages/frontend/editor-ui/src/app/App.vue` (import near line 16, call after `useTrialIntroModalAutoOpen();`)

Test cases:
- It checks after the Cloud store is ready, and again at the cutoff.
- It relays a builder agent push while the owner waits, and ignores it otherwise.
- It expands the sidebar once at assignment.

- [ ] **Step 1: Write the failing test**

```ts
import { createTestingPinia } from '@pinia/testing';
import { effectScope } from 'vue';
import { useCloudPlanStore } from '@n8n/stores/cloudPlan.store';
import { useUsersStore } from '@n8n/stores/users.store';

import { mockedStore } from '@/__tests__/utils';
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';
import { useUIStore } from '@/app/stores/ui.store';

import { useSurfaceMcpToClaudeTrialUsersStore } from './stores/surfaceMcpToClaudeTrialUsers.store';
import { useMcpDiscoveryEnrollment } from './useMcpDiscoveryEnrollment';

const waiting = (eligibleAt: number) => ({
	status: 'waiting' as const,
	eligibleAt,
	claudeUsed: false,
	coachmarkDismissed: false,
});

describe('useMcpDiscoveryEnrollment', () => {
	let store: ReturnType<typeof mockedStore<typeof useSurfaceMcpToClaudeTrialUsersStore>>;
	let pushHandler: (message: unknown) => void;

	beforeEach(() => {
		vi.useFakeTimers();
		localStorage.clear();
		createTestingPinia();
		store = mockedStore(useSurfaceMcpToClaudeTrialUsersStore);
		mockedStore(useUsersStore).currentUser = { id: 'owner' } as never;
		mockedStore(useCloudPlanStore).state.initialized = true;
		mockedStore(usePushConnectionStore).addEventListener.mockImplementation((handler) => {
			pushHandler = handler as typeof pushHandler;
			return vi.fn();
		});
	});

	afterEach(() => vi.useRealTimers());

	function start() {
		const scope = effectScope();
		scope.run(() => useMcpDiscoveryEnrollment());
		return scope;
	}

	it('checks when the Cloud store is ready and again at the cutoff', async () => {
		store.refresh.mockImplementation(async () => {
			store.state = waiting(Date.now() + 1000);
		});

		start();
		await vi.advanceTimersByTimeAsync(0);
		expect(store.refresh).toHaveBeenCalledTimes(1);

		await vi.advanceTimersByTimeAsync(1000);
		expect(store.refresh).toHaveBeenCalledTimes(2);
	});

	it('relays a builder agent save only while the owner waits', async () => {
		start();
		await vi.advanceTimersByTimeAsync(0);
		const message = { type: 'agentUpdated', data: { agentId: 'a1', projectId: 'p1', source: 'builder' } };

		pushHandler(message);
		expect(store.recordAssistantAgentChange).not.toHaveBeenCalled();

		store.state = waiting(Date.now() + 1000);
		pushHandler({ ...message, data: { ...message.data, source: 'user' } });
		pushHandler(message);
		expect(store.recordAssistantAgentChange).toHaveBeenCalledTimes(1);
	});

	it('expands the sidebar once at assignment', async () => {
		const uiStore = mockedStore(useUIStore);
		uiStore.sidebarMenuCollapsed = true;
		start();

		store.isAssigned = true;
		await vi.advanceTimersByTimeAsync(0);
		expect(uiStore.sidebarMenuCollapsed).toBe(false);

		uiStore.sidebarMenuCollapsed = true;
		store.isAssigned = false;
		await vi.advanceTimersByTimeAsync(0);
		store.isAssigned = true;
		await vi.advanceTimersByTimeAsync(0);
		expect(uiStore.sidebarMenuCollapsed).toBe(true);
	});
});
```

- [ ] **Step 2: Run the test and make sure that it fails**

Run: `pushd packages/frontend/editor-ui && pnpm test src/experiments/surfaceMcpToClaudeTrialUsers/useMcpDiscoveryEnrollment.test.ts; popd`
Expected: FAIL with "Cannot find module './useMcpDiscoveryEnrollment'".

- [ ] **Step 3: Write the composable**

```ts
import { useStorage } from '@n8n/composables/useStorage';
import { useCloudPlanStore } from '@n8n/stores/cloudPlan.store';
import { useUsersStore } from '@n8n/stores/users.store';
import { useDocumentVisibility } from '@vueuse/core';
import { onScopeDispose, watch } from 'vue';

import { usePushConnectionStore } from '@/app/stores/pushConnection.store';
import { useUIStore } from '@/app/stores/ui.store';

import { useSurfaceMcpToClaudeTrialUsersStore } from './stores/surfaceMcpToClaudeTrialUsers.store';

const RETRY_MS = 60_000;

/** Install once in App.vue. The placements only read the store. */
export function useMcpDiscoveryEnrollment() {
	const store = useSurfaceMcpToClaudeTrialUsersStore();
	const usersStore = useUsersStore();
	const cloudPlanStore = useCloudPlanStore();
	const uiStore = useUIStore();
	const pushStore = usePushConnectionStore();
	const visibility = useDocumentVisibility();
	const sidebarExpanded = useStorage('N8N_MCP_DISCOVERY_SIDEBAR_EXPANDED');
	let timer: ReturnType<typeof setTimeout> | undefined;

	async function check() {
		clearTimeout(timer);
		try {
			await store.refresh();
		} catch {
			// The next page load tries again. Do not infer eligibility from a failed request.
			return;
		}
		const { status, eligibleAt } = store.state ?? {};
		if (status !== 'waiting' || eligibleAt === undefined) return;
		// Check again at the cutoff. A client clock ahead of the server must not cause a tight loop.
		const wait = eligibleAt - Date.now();
		timer = setTimeout(() => void check(), wait > 0 ? wait : RETRY_MS);
	}

	// The user connects and uses Claude in another tab. Check again when they come back.
	watch(visibility, (value) => {
		if (value === 'visible' && store.shouldShowEntryPoints) void check();
	});

	// No backend event carries the user of an Assistant agent save, but the open editor gets a push.
	const removePushListener = pushStore.addEventListener((message) => {
		if (
			message.type === 'agentUpdated' &&
			message.data.source === 'builder' &&
			store.state?.status === 'waiting'
		) {
			void store.recordAssistantAgentChange().catch(() => {});
		}
	});

	// Both arms start with an expanded sidebar. Expand only once, so a later collapse stays.
	watch(
		() => store.isAssigned,
		(assigned) => {
			if (!assigned || sidebarExpanded.value) return;
			sidebarExpanded.value = 'true';
			uiStore.sidebarMenuCollapsed = false;
		},
	);

	watch(
		[() => usersStore.currentUser?.id, () => cloudPlanStore.state.initialized],
		([userId, ready]) => {
			clearTimeout(timer);
			store.reset();
			if (userId && ready) void check();
		},
		{ immediate: true },
	);

	onScopeDispose(() => {
		clearTimeout(timer);
		removePushListener();
	});
}
```

- [ ] **Step 4: Run the test and make sure that it passes**

Run: `pushd packages/frontend/editor-ui && pnpm test src/experiments/surfaceMcpToClaudeTrialUsers/useMcpDiscoveryEnrollment.test.ts; popd`
Expected: PASS, 3 tests.

- [ ] **Step 5: Wire App.vue**

Add after the `useTrialIntroModalAutoOpen` import:

```ts
// Experiment cleanup: remove with surfaceMcpToClaudeTrialUsers.
import { useMcpDiscoveryEnrollment } from '@/experiments/surfaceMcpToClaudeTrialUsers/useMcpDiscoveryEnrollment';
```

Add after `useTrialIntroModalAutoOpen();`:

```ts
// Experiment cleanup: remove with surfaceMcpToClaudeTrialUsers.
useMcpDiscoveryEnrollment();
```

- [ ] **Step 6: Checkpoint**

```bash
git add packages/frontend/editor-ui/src/experiments/surfaceMcpToClaudeTrialUsers packages/frontend/editor-ui/src/app/App.vue
```

### Task 8: Entry components and three placements

**Files:**
- Create: `.../surfaceMcpToClaudeTrialUsers/useClaudeEntry.ts`
- Create: `.../surfaceMcpToClaudeTrialUsers/components/ClaudeLogo.vue`
- Create: `.../surfaceMcpToClaudeTrialUsers/components/ClaudeEntryButton.vue`
- Create: `.../surfaceMcpToClaudeTrialUsers/components/ClaudeEntry.vue`
- Test: `.../surfaceMcpToClaudeTrialUsers/components/ClaudeEntry.test.ts`
- Modify: `packages/frontend/editor-ui/src/app/components/MainSidebar.vue` (before `<BottomMenu`)
- Modify: `.../canvas/components/elements/nodes/render-types/CanvasNodeChoicePrompt.vue` (end of the `.choicePrompt` root)
- Modify: `packages/frontend/editor-ui/src/features/ai/instanceAi/InstanceAiEmptyView.vue` (after `</InstanceAiInput>` in both `centeredInput` blocks)

`@n8n/frontend-module-mcp` pulls in the MCP store. Import it only from files that load lazily: `ClaudeLogo.vue`, `ClaudeEntryButton.vue` and the click handler in `useClaudeEntry.ts`.

Test cases:
- It renders nothing while the entry points are hidden.
- Before Claude connects, a click opens MCP settings and tracks the click.
- After Claude connects, a click opens Claude in a new tab.
- Only the expanded sidebar shows "Connect to n8n", and only at the `build` stage.

- [ ] **Step 1: Write the failing test**

```ts
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';

import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';

import { useSurfaceMcpToClaudeTrialUsersStore } from '../stores/surfaceMcpToClaudeTrialUsers.store';
import ClaudeEntry from './ClaudeEntry.vue';

const push = vi.hoisted(() => vi.fn());
vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal<typeof import('vue-router')>()),
	useRouter: () => ({ push }),
}));
vi.mock('@n8n/frontend-module-mcp', () => ({
	getClientBrand: () => ({ icon: null }),
	MCP_SETTINGS_VIEW: 'McpSettings',
}));

const renderComponent = createComponentRenderer(ClaudeEntry);

describe('ClaudeEntry', () => {
	let pinia: ReturnType<typeof createTestingPinia>;
	let store: ReturnType<typeof mockedStore<typeof useSurfaceMcpToClaudeTrialUsersStore>>;

	beforeEach(() => {
		pinia = createTestingPinia();
		store = mockedStore(useSurfaceMcpToClaudeTrialUsersStore);
		store.shouldShowEntryPoints = true;
		store.ctaStage = 'connect';
		push.mockClear();
	});

	it('renders nothing while the entry points are hidden', () => {
		store.shouldShowEntryPoints = false;

		const { queryByTestId } = renderComponent({ pinia, props: { placement: 'canvas' } });

		expect(queryByTestId('claude-entry-canvas')).not.toBeInTheDocument();
	});

	it('opens MCP settings before Claude connects', async () => {
		const { findByTestId } = renderComponent({ pinia, props: { placement: 'canvas' } });

		await userEvent.click(await findByTestId('claude-entry-canvas'));

		expect(store.trackEntry).toHaveBeenCalledWith('canvas', 'clicked');
		// The click handler loads the MCP module before it navigates.
		await vi.waitFor(() => expect(push).toHaveBeenCalledWith({ name: 'McpSettings' }));
	});

	it('opens Claude in a new tab after Claude connects', async () => {
		store.ctaStage = 'build_in_claude';
		const open = vi.spyOn(window, 'open').mockReturnValue(null);
		const { findByTestId } = renderComponent({ pinia, props: { placement: 'assistant' } });

		await userEvent.click(await findByTestId('claude-entry-assistant'));

		expect(open).toHaveBeenCalledWith('https://claude.ai/new', '_blank', 'noopener,noreferrer');
		expect(push).not.toHaveBeenCalled();
	});

	it.each([
		['sidebar', false, 'build', true],
		['sidebar', true, 'build', false],
		['sidebar', false, 'connect', false],
		['canvas', false, 'build', false],
	] as const)('%s collapsed %s at %s shows the subtext: %s', async (placement, collapsed, stage, shown) => {
		store.ctaStage = stage;
		const { findByTestId, queryByText } = renderComponent({ pinia, props: { placement, collapsed } });

		await findByTestId(`claude-entry-${placement}`);

		expect(queryByText('Connect to n8n') !== null).toBe(shown);
	});
});
```

- [ ] **Step 2: Run the test and make sure that it fails**

Run: `pushd packages/frontend/editor-ui && pnpm test src/experiments/surfaceMcpToClaudeTrialUsers/components; popd`
Expected: FAIL with "Cannot find module './ClaudeEntry.vue'".

- [ ] **Step 3: Write `useClaudeEntry.ts`**

```ts
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';
import { useRouter } from 'vue-router';

import {
	useSurfaceMcpToClaudeTrialUsersStore,
	type ClaudeEntryPlacement,
} from './stores/surfaceMcpToClaudeTrialUsers.store';

const CLAUDE_NEW_CHAT_URL = 'https://claude.ai/new';

/** CTA copy and click action, shared by every placement. */
export function useClaudeEntry() {
	const store = useSurfaceMcpToClaudeTrialUsersStore();
	const i18n = useI18n();
	const router = useRouter();

	const label = computed(() =>
		i18n.baseText(
			store.ctaStage === 'connect'
				? 'experiments.surfaceMcpToClaudeTrialUsers.cta.connect'
				: 'experiments.surfaceMcpToClaudeTrialUsers.cta.build',
		),
	);
	const description = computed(() =>
		store.ctaStage === 'build'
			? i18n.baseText('experiments.surfaceMcpToClaudeTrialUsers.cta.connectToN8n')
			: undefined,
	);

	async function open(placement: ClaudeEntryPlacement) {
		store.trackEntry(placement, 'clicked');
		if (store.ctaStage === 'build_in_claude') {
			// Open the tab before any await, so the browser does not block it.
			window.open(CLAUDE_NEW_CHAT_URL, '_blank', 'noopener,noreferrer');
			return;
		}
		// Load the MCP module only on click, so it stays out of the boot chunk.
		const { MCP_SETTINGS_VIEW } = await import('@n8n/frontend-module-mcp');
		await router.push({ name: MCP_SETTINGS_VIEW });
	}

	return { label, description, open };
}
```

- [ ] **Step 4: Write `components/ClaudeLogo.vue`**

```vue
<script setup lang="ts">
import { getClientBrand } from '@n8n/frontend-module-mcp';

const ClaudeIcon = getClientBrand('Claude').icon;
</script>

<template>
	<component :is="ClaudeIcon" v-if="ClaudeIcon" :class="$style.logo" aria-hidden="true" />
</template>

<style module>
.logo {
	width: var(--claude-logo-size, var(--spacing--md));
	height: var(--claude-logo-size, var(--spacing--md));
	flex-shrink: 0;
}
</style>
```

- [ ] **Step 5: Write `components/ClaudeEntryButton.vue`**

The canvas styles copy the option, button, label and divider styles of `CanvasNodeChoicePrompt.vue`, so the host template needs no wrapper.

```vue
<script setup lang="ts">
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useIntersectionObserver } from '@vueuse/core';
import { useId, useTemplateRef } from 'vue';

import { useSurfaceMcpToClaudeTrialUsersStore } from '../stores/surfaceMcpToClaudeTrialUsers.store';
import { useClaudeEntry } from '../useClaudeEntry';
import ClaudeLogo from './ClaudeLogo.vue';

const props = defineProps<{ placement: 'sidebar' | 'canvas' | 'assistant'; collapsed?: boolean }>();

const store = useSurfaceMcpToClaudeTrialUsersStore();
const i18n = useI18n();
const { label, description, open } = useClaudeEntry();
const descriptionId = useId();
const target = useTemplateRef<HTMLElement>('target');

useIntersectionObserver(target, ([entry]) => {
	if (entry?.isIntersecting) store.trackEntry(props.placement, 'viewed');
});
</script>

<template>
	<div v-if="placement === 'canvas'" :class="$style.orDivider">
		<span :class="$style.orText">{{ i18n.baseText('generic.or') }}</span>
	</div>
	<button
		ref="target"
		type="button"
		:class="[$style.entry, $style[placement], { [$style.collapsed]: collapsed }]"
		:aria-label="label"
		:aria-describedby="placement === 'sidebar' && !collapsed && description ? descriptionId : undefined"
		:data-test-id="`claude-entry-${placement}`"
		@click.stop="open(placement)"
	>
		<span :class="$style.mark"><ClaudeLogo /></span>
		<span v-if="!collapsed" :class="$style.copy">
			<span>{{ label }}</span>
			<span
				v-if="placement === 'sidebar' && description"
				:id="descriptionId"
				:class="$style.description"
			>
				{{ description }}
			</span>
		</span>
		<N8nIcon
			v-if="placement !== 'canvas' && !collapsed"
			:icon="placement === 'assistant' ? 'arrow-right' : 'chevron-right'"
			:size="placement === 'sidebar' ? 'large' : 'small'"
		/>
	</button>
</template>

<style lang="scss" module>
.entry {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs);
	color: var(--text-color);
	background: transparent;
	border: 0;
	border-radius: var(--radius--lg);
	font: inherit;
	cursor: pointer;

	&:hover {
		background: var(--background--hover);
	}

	&:focus-visible {
		outline: var(--focus--border-width) solid var(--focus--border-color);
		outline-offset: var(--spacing--4xs);
	}
}

.mark {
	display: inline-flex;
}

.copy {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	text-align: left;
	white-space: nowrap;
}

.description {
	color: var(--text-color--subtler);
}

.sidebar {
	flex: 1;
	min-width: 0;
	justify-content: flex-start;
	gap: var(--spacing--4xs);
	margin-inline: var(--spacing--3xs);
	padding: var(--spacing--4xs);
	font-size: var(--font-size--2xs);
	--claude-logo-size: var(--spacing--sm);

	.copy {
		white-space: normal;
	}

	> :last-child {
		margin-left: auto;
	}
}

.collapsed {
	justify-content: center;

	> :last-child {
		margin: 0;
	}
}

.assistant {
	display: flex;
	width: fit-content;
	margin: var(--spacing--xs) auto 0;
	padding: var(--spacing--4xs) var(--spacing--xs);
	border: var(--border);
	border-radius: var(--radius--full);
	font-size: var(--font-size--2xs);
	--claude-logo-size: var(--spacing--sm);
}

.canvas {
	flex-direction: column;
	width: 100px;
	padding: 0;
	gap: var(--spacing--2xs);
	color: var(--color--text--shade-1);
	font-size: var(--font-size--md);
	font-weight: var(--font-weight--medium);
	line-height: var(--line-height--xl);
	--claude-logo-size: var(--spacing--2xl);

	&:hover {
		background: transparent;
	}

	.mark {
		align-items: center;
		justify-content: center;
		min-width: 100px;
		min-height: 100px;
		background: var(--color--foreground--tint-2);
		border: 2px dashed var(--color--foreground--shade-2);
		border-radius: var(--radius--lg);
	}

	&:hover .mark {
		border-color: var(--background--brand);
	}
}

.orDivider {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 100px;
	margin-bottom: calc(var(--line-height--xl) * 1em + var(--spacing--2xs));
}

.orText {
	padding: 0 var(--spacing--xs);
	color: var(--color--text);
	font-size: var(--font-size--md);
	font-weight: var(--font-weight--regular);
}
</style>
```

- [ ] **Step 6: Write `components/ClaudeEntry.vue`**

```vue
<script setup lang="ts">
import { defineAsyncComponent } from 'vue';

import { useSurfaceMcpToClaudeTrialUsersStore } from '../stores/surfaceMcpToClaudeTrialUsers.store';

defineProps<{ placement: 'sidebar' | 'canvas' | 'assistant'; collapsed?: boolean }>();

const store = useSurfaceMcpToClaudeTrialUsersStore();
// The button pulls in the MCP module, so it loads only for treatment users.
const ClaudeEntryButton = defineAsyncComponent(async () => await import('./ClaudeEntryButton.vue'));
</script>

<template>
	<ClaudeEntryButton
		v-if="store.shouldShowEntryPoints"
		:placement="placement"
		:collapsed="collapsed"
	/>
</template>
```

- [ ] **Step 7: Run the test and make sure that it passes**

Run: `pushd packages/frontend/editor-ui && pnpm test src/experiments/surfaceMcpToClaudeTrialUsers/components; popd`
Expected: PASS, 7 tests.

- [ ] **Step 8: Wire the sidebar**

In `MainSidebar.vue`, add after the `useSidebarExpandedExperiment` import:

```ts
// Experiment cleanup: remove with surfaceMcpToClaudeTrialUsers.
import ClaudeEntry from '@/experiments/surfaceMcpToClaudeTrialUsers/components/ClaudeEntry.vue';
```

Add before `<BottomMenu`:

```vue
		<!-- Experiment cleanup: remove with surfaceMcpToClaudeTrialUsers. -->
		<ClaudeEntry placement="sidebar" :collapsed="isCollapsed" />
```

- [ ] **Step 9: Wire the canvas**

In `CanvasNodeChoicePrompt.vue`, add as the first import:

```ts
// Experiment cleanup: remove with surfaceMcpToClaudeTrialUsers.
import ClaudeEntry from '@/experiments/surfaceMcpToClaudeTrialUsers/components/ClaudeEntry.vue';
```

Add after the `</template>` that closes the Build with AI block, before the `</div>` of the `.choicePrompt` root:

```vue
		<!-- Experiment cleanup: remove with surfaceMcpToClaudeTrialUsers. -->
		<ClaudeEntry placement="canvas" />
```

- [ ] **Step 10: Wire the Assistant empty state**

In `InstanceAiEmptyView.vue`, add after the `InstanceAiFreeNudge` import:

```ts
// Experiment cleanup: remove with surfaceMcpToClaudeTrialUsers.
import ClaudeEntry from '@/experiments/surfaceMcpToClaudeTrialUsers/components/ClaudeEntry.vue';
```

Add after `</InstanceAiInput>` in the `#input` slot of `InstanceAiSplitEmptyState`, and again after `</InstanceAiInput>` inside `<div ref="centeredInput">`:

```vue
						<!-- Experiment cleanup: remove with surfaceMcpToClaudeTrialUsers. -->
						<ClaudeEntry placement="assistant" />
```

The entry sits inside the block that `centeredInputRef` measures, so `updatePreviewScale` includes its height without changes.

- [ ] **Step 11: Run the host tests that render these files**

```bash
pushd packages/frontend/editor-ui
pnpm test src/app/components/MainSidebar src/features/workflows/canvas/components/elements/nodes src/features/ai/instanceAi/InstanceAiEmptyView
popd
```

Expected: PASS with no snapshot changes. The store hides the entry by default, so the host tests render no extra markup.

- [ ] **Step 12: Checkpoint**

```bash
git add packages/frontend/editor-ui/src/experiments/surfaceMcpToClaudeTrialUsers packages/frontend/editor-ui/src/app/components/MainSidebar.vue packages/frontend/editor-ui/src/features
```

### Task 9: Create menu entry

If decision 3 drops the Create menu entry, skip this task.

**Files:**
- Create: `.../surfaceMcpToClaudeTrialUsers/useClaudeCreateMenu.ts`
- Create: `.../surfaceMcpToClaudeTrialUsers/components/ClaudeCreateMenuIcon.vue`
- Test: `.../surfaceMcpToClaudeTrialUsers/useClaudeCreateMenu.test.ts`
- Modify: `packages/frontend/editor-ui/src/app/components/MainSidebarHeader.vue`

Test cases:
- The menu is unchanged while the entry points are hidden.
- Treatment adds a divider and the Claude item at the end.
- Selecting the Claude item runs the entry action. Other items go to the host handler.

- [ ] **Step 1: Write the failing test**

```ts
import { createTestingPinia } from '@pinia/testing';
import { computed } from 'vue';

import { mockedStore } from '@/__tests__/utils';

import { useSurfaceMcpToClaudeTrialUsersStore } from './stores/surfaceMcpToClaudeTrialUsers.store';
import { CLAUDE_CREATE_MENU_ID, useClaudeCreateMenu } from './useClaudeCreateMenu';

const open = vi.hoisted(() => vi.fn());
vi.mock('./useClaudeEntry', async () => {
	const { computed } = await import('vue');
	return { useClaudeEntry: () => ({ label: computed(() => 'Build with Claude'), open }) };
});

describe('useClaudeCreateMenu', () => {
	const menu = computed(() => [{ id: 'workflow', title: 'Workflow' }]);
	let store: ReturnType<typeof mockedStore<typeof useSurfaceMcpToClaudeTrialUsersStore>>;

	beforeEach(() => {
		createTestingPinia();
		store = mockedStore(useSurfaceMcpToClaudeTrialUsersStore);
		open.mockClear();
	});

	it('keeps the menu while the entry points are hidden', () => {
		store.shouldShowEntryPoints = false;

		expect(useClaudeCreateMenu(menu, vi.fn()).menu.value).toEqual(menu.value);
	});

	it('adds the Claude item for treatment users', () => {
		store.shouldShowEntryPoints = true;

		expect(useClaudeCreateMenu(menu, vi.fn()).menu.value.slice(1)).toEqual([
			{ id: 'claude-mcp-divider', isDivider: true },
			{ id: CLAUDE_CREATE_MENU_ID, title: 'Build with Claude' },
		]);
	});

	it('routes the selection', () => {
		const handleSelect = vi.fn();
		const { select } = useClaudeCreateMenu(menu, handleSelect);

		select(CLAUDE_CREATE_MENU_ID);
		select('workflow');

		expect(open).toHaveBeenCalledWith('create_menu');
		expect(handleSelect).toHaveBeenCalledWith('workflow');
		expect(handleSelect).toHaveBeenCalledTimes(1);
	});
});
```

- [ ] **Step 2: Run the test and make sure that it fails**

Run: `pushd packages/frontend/editor-ui && pnpm test src/experiments/surfaceMcpToClaudeTrialUsers/useClaudeCreateMenu.test.ts; popd`
Expected: FAIL with "Cannot find module './useClaudeCreateMenu'".

- [ ] **Step 3: Write `useClaudeCreateMenu.ts`**

```ts
import { computed, type ComputedRef } from 'vue';

import { useSurfaceMcpToClaudeTrialUsersStore } from './stores/surfaceMcpToClaudeTrialUsers.store';
import { useClaudeEntry } from './useClaudeEntry';

export const CLAUDE_CREATE_MENU_ID = 'claude-mcp';

/** Adds the Claude item to the Create menu for treatment users and routes its selection. */
export function useClaudeCreateMenu<Item>(
	menu: ComputedRef<Item[]>,
	handleSelect: (id: string) => unknown,
) {
	const store = useSurfaceMcpToClaudeTrialUsersStore();
	const { label, open } = useClaudeEntry();

	const withClaude = computed(() =>
		store.shouldShowEntryPoints
			? [
					...menu.value,
					{ id: 'claude-mcp-divider', isDivider: true as const },
					{ id: CLAUDE_CREATE_MENU_ID, title: label.value },
				]
			: menu.value,
	);

	function select(id: string) {
		if (id === CLAUDE_CREATE_MENU_ID) void open('create_menu');
		else void handleSelect(id);
	}

	return { menu: withClaude, select, appendSlotName: `item.append.${CLAUDE_CREATE_MENU_ID}` };
}
```

- [ ] **Step 4: Write `components/ClaudeCreateMenuIcon.vue`**

```vue
<script setup lang="ts">
import { useIntersectionObserver } from '@vueuse/core';
import { defineAsyncComponent, useTemplateRef } from 'vue';

import { useSurfaceMcpToClaudeTrialUsersStore } from '../stores/surfaceMcpToClaudeTrialUsers.store';

// The logo pulls in the MCP module, and the header is in the boot chunk.
const ClaudeLogo = defineAsyncComponent(async () => await import('./ClaudeLogo.vue'));
const store = useSurfaceMcpToClaudeTrialUsersStore();
const target = useTemplateRef<HTMLElement>('target');

useIntersectionObserver(target, ([entry]) => {
	if (entry?.isIntersecting) store.trackEntry('create_menu', 'viewed');
});
</script>

<template>
	<span ref="target" :class="$style.icon"><ClaudeLogo /></span>
</template>

<style module>
.icon {
	display: inline-flex;
	--claude-logo-size: var(--spacing--sm);
}

/* The dropdown renders an append slot after the title. Show the logo before it. */
:global(.el-menu-item):has(.icon) {
	gap: var(--spacing--2xs);
}

:global(.el-menu-item) > span:has(.icon) {
	order: -1;
	margin-left: 0;
}
</style>
```

- [ ] **Step 5: Run the test and make sure that it passes**

Run: `pushd packages/frontend/editor-ui && pnpm test src/experiments/surfaceMcpToClaudeTrialUsers/useClaudeCreateMenu.test.ts; popd`
Expected: PASS, 3 tests.

- [ ] **Step 6: Wire `MainSidebarHeader.vue`**

Add after the `useGlobalEntityCreation` import:

```ts
// Experiment cleanup: remove with surfaceMcpToClaudeTrialUsers.
import ClaudeCreateMenuIcon from '@/experiments/surfaceMcpToClaudeTrialUsers/components/ClaudeCreateMenuIcon.vue';
import { useClaudeCreateMenu } from '@/experiments/surfaceMcpToClaudeTrialUsers/useClaudeCreateMenu';
```

Add after the `useGlobalEntityCreation()` destructuring:

```ts
// Experiment cleanup: remove with surfaceMcpToClaudeTrialUsers. Restore `menu` and `handleMenuSelect` in the template.
const {
	menu: claudeCreateMenu,
	select: selectCreateMenuItem,
	appendSlotName: claudeAppendSlotName,
} = useClaudeCreateMenu(menu, handleMenuSelect);
```

In the `N8nNavigationDropdown` element, replace `:menu="menu"` with `:menu="claudeCreateMenu"` and `@select="handleMenuSelect"` with `@select="selectCreateMenuItem"`. Add as the first slot inside the element:

```vue
			<!-- Experiment cleanup: remove with surfaceMcpToClaudeTrialUsers. -->
			<template #[claudeAppendSlotName]><ClaudeCreateMenuIcon /></template>
```

- [ ] **Step 7: Run the header test**

Run: `pushd packages/frontend/editor-ui && pnpm test src/app/components/MainSidebarHeader; popd`
Expected: PASS without changes to the host test.

- [ ] **Step 8: Checkpoint**

```bash
git add packages/frontend/editor-ui/src/experiments/surfaceMcpToClaudeTrialUsers packages/frontend/editor-ui/src/app/components/MainSidebarHeader.vue
```

### Task 10: MCP settings page through the capability

**Files:**
- Create: `packages/frontend/@n8n/frontend-module-sdk/src/capabilities/mcpDiscoverySettings.ts`
- Modify: `packages/frontend/@n8n/frontend-module-sdk/src/capabilities/index.ts`
- Modify: `packages/frontend/@n8n/frontend-module-sdk/src/types/capability.ts`
- Create: `.../surfaceMcpToClaudeTrialUsers/components/McpConnectHint.vue`
- Test: `.../surfaceMcpToClaudeTrialUsers/components/McpConnectHint.test.ts`
- Create: `.../surfaceMcpToClaudeTrialUsers/mcpDiscoverySettings.ts`
- Modify: `packages/frontend/editor-ui/src/app/capabilities.manifest.ts`
- Modify: `packages/modules/mcp/frontend/src/SettingsMCPView.vue`

Test cases:
- The wrapper renders only its slot while the hint is off.
- The hint shows next to the slot, and "Got it" saves the dismissal.

- [ ] **Step 1: Declare the capability**

Add at the top of `types/capability.ts`:

```ts
import type { Component } from 'vue';
```

Add at the end of `types/capability.ts`:

```ts
// Experiment cleanup: remove with surfaceMcpToClaudeTrialUsers.
export interface McpDiscoverySettingsOverrides {
	description: string;
	docsLeadingText: string;
	docsLabel: string;
	clientTitle: string;
	clientDescription: string;
	connectVariant: 'solid' | 'outline';
}

// Experiment cleanup: remove with surfaceMcpToClaudeTrialUsers.
export interface McpDiscoverySettings {
	/** Treatment copy and button style. Undefined keeps the page as is. Call it inside a computed. */
	overrides(): McpDiscoverySettingsOverrides | undefined;
	/** Wraps the Connect button. It renders only its slot unless the coachmark shows. */
	connectHint: Component;
}
```

Create `capabilities/mcpDiscoverySettings.ts`:

```ts
import { declareCapability } from '../declareCapability';
import type { McpDiscoverySettings } from '../types/capability';

/**
 * Treatment changes of the "Surface MCP to Claude trial users" experiment on the
 * MCP settings page. Optional: read it with `tryUse()`.
 * Experiment cleanup: remove with surfaceMcpToClaudeTrialUsers.
 */
export const mcpDiscoverySettings =
	declareCapability<McpDiscoverySettings>('mcp-discovery-settings');
```

Add to `capabilities/index.ts`:

```ts
// Experiment cleanup: remove with surfaceMcpToClaudeTrialUsers.
export { mcpDiscoverySettings } from './mcpDiscoverySettings';
```

Build the SDK: `pushd packages/frontend/@n8n/frontend-module-sdk && pnpm build; popd`

- [ ] **Step 2: Write the failing wrapper test**

```ts
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';

import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';

import { useSurfaceMcpToClaudeTrialUsersStore } from '../stores/surfaceMcpToClaudeTrialUsers.store';
import McpConnectHint from './McpConnectHint.vue';

const renderComponent = createComponentRenderer(McpConnectHint, {
	slots: { default: '<button data-test-id="connect">Connect</button>' },
});

describe('McpConnectHint', () => {
	let pinia: ReturnType<typeof createTestingPinia>;
	let store: ReturnType<typeof mockedStore<typeof useSurfaceMcpToClaudeTrialUsersStore>>;

	beforeEach(() => {
		pinia = createTestingPinia();
		store = mockedStore(useSurfaceMcpToClaudeTrialUsersStore);
	});

	it('renders only the slot while the hint is off', () => {
		store.shouldShowConnectHint = false;

		const { getByTestId, queryByTestId } = renderComponent({ pinia });

		expect(getByTestId('connect')).toBeInTheDocument();
		expect(queryByTestId('mcp-connect-hint')).not.toBeInTheDocument();
	});

	it('shows the hint and saves the dismissal', async () => {
		store.shouldShowConnectHint = true;

		const { getByTestId, findByTestId, getByRole } = renderComponent({ pinia });

		expect(getByTestId('connect')).toBeInTheDocument();
		await findByTestId('mcp-connect-hint');
		await userEvent.click(getByRole('button', { name: 'Got it' }));
		expect(store.dismissCoachmark).toHaveBeenCalled();
	});
});
```

- [ ] **Step 3: Run the test and make sure that it fails**

Run: `pushd packages/frontend/editor-ui && pnpm test src/experiments/surfaceMcpToClaudeTrialUsers/components/McpConnectHint.test.ts; popd`
Expected: FAIL with "Cannot find module './McpConnectHint.vue'".

- [ ] **Step 4: Write `components/McpConnectHint.vue`**

```vue
<script setup lang="ts">
import { N8nButton, N8nPopover } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { ref } from 'vue';

import { useSurfaceMcpToClaudeTrialUsersStore } from '../stores/surfaceMcpToClaudeTrialUsers.store';

const store = useSurfaceMcpToClaudeTrialUsersStore();
const i18n = useI18n();
// Escape and an outside click hide the hint for this visit. "Got it" and Connect hide it for good.
const open = ref(true);

function dismiss() {
	open.value = false;
	void store.dismissCoachmark().catch(() => {});
}
</script>

<template>
	<N8nPopover
		v-if="store.shouldShowConnectHint"
		:open="open"
		side="bottom"
		align="end"
		show-arrow
		:content-class="$style.popover"
		:enable-scrolling="false"
		suppress-auto-focus
		width="calc(var(--spacing--5xl) + var(--spacing--3xl))"
		@update:open="open = $event && open"
	>
		<template #trigger>
			<span @click="dismiss"><slot /></span>
		</template>
		<template #content>
			<div :class="$style.hint" data-test-id="mcp-connect-hint">
				<p>{{ i18n.baseText('experiments.surfaceMcpToClaudeTrialUsers.settings.connectHint') }}</p>
				<N8nButton
					size="small"
					variant="outline"
					:label="i18n.baseText('experiments.surfaceMcpToClaudeTrialUsers.settings.connectHintDismiss')"
					@click="dismiss"
				/>
			</div>
		</template>
	</N8nPopover>
	<slot v-else />
</template>

<style lang="scss" module>
.popover {
	--background--surface: var(--color--neutral-black);
	--border-color: var(--color--neutral-black);
	color: var(--color--neutral-100);

	button {
		background: var(--color--neutral-100);
		border-color: var(--color--neutral-100);
		color: var(--color--neutral-black);
	}

	button:hover {
		background: var(--color--neutral-200);
		border-color: var(--color--neutral-200);
	}
}

.hint {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--xs);
	padding: var(--spacing--sm);
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--xl);

	p {
		margin: 0;
	}
}
</style>
```

- [ ] **Step 5: Run the test and make sure that it passes**

Run: `pushd packages/frontend/editor-ui && pnpm test src/experiments/surfaceMcpToClaudeTrialUsers/components/McpConnectHint.test.ts; popd`
Expected: PASS, 2 tests.

- [ ] **Step 6: Write the provider `mcpDiscoverySettings.ts`**

```ts
import { i18n } from '@n8n/i18n';

import McpConnectHint from './components/McpConnectHint.vue';
import { useSurfaceMcpToClaudeTrialUsersStore } from './stores/surfaceMcpToClaudeTrialUsers.store';

/**
 * Treatment changes on the MCP settings page. The shell provides this object to the
 * MCP module in `capabilities.manifest.ts`. The store is read on each call, because
 * the manifest loads before Pinia.
 */
export const mcpDiscoverySettings = {
	overrides: () => {
		const store = useSurfaceMcpToClaudeTrialUsersStore();
		if (!store.isTreatment) return undefined;
		return {
			description: i18n.baseText('experiments.surfaceMcpToClaudeTrialUsers.settings.description'),
			docsLeadingText: i18n.baseText(
				'experiments.surfaceMcpToClaudeTrialUsers.settings.docsLeadingText',
			),
			docsLabel: i18n.baseText('experiments.surfaceMcpToClaudeTrialUsers.settings.docsLabel'),
			clientTitle: i18n.baseText('experiments.surfaceMcpToClaudeTrialUsers.settings.clientTitle'),
			clientDescription: i18n.baseText(
				'experiments.surfaceMcpToClaudeTrialUsers.settings.clientDescription',
			),
			connectVariant: store.hasConnectedClaude ? ('outline' as const) : ('solid' as const),
		};
	},
	connectHint: McpConnectHint,
};
```

- [ ] **Step 7: Provide it in `capabilities.manifest.ts`**

Add after the `useExposeAllWorkflowsToMcpStore` import:

```ts
// Experiment cleanup: remove with surfaceMcpToClaudeTrialUsers.
import { mcpDiscoverySettings } from '@/experiments/surfaceMcpToClaudeTrialUsers/mcpDiscoverySettings';
```

Add at the end of `registerShellCapabilities`:

```ts
	// Experiment cleanup: remove with surfaceMcpToClaudeTrialUsers.
	capabilityRegistry.provide(capabilities.mcpDiscoverySettings, mcpDiscoverySettings);
```

- [ ] **Step 8: Read the capability in `SettingsMCPView.vue`**

Add after the `isExposeAllOfferEnabled` line:

```ts
// Experiment cleanup: remove with surfaceMcpToClaudeTrialUsers.
const mcpDiscovery = capabilityRegistry.tryUse(capabilities.mcpDiscoverySettings);
const discoveryOverrides = computed(() => mcpDiscovery?.overrides());
```

Replace the `N8nSettingsPageHeader` element with:

```vue
		<!-- Experiment cleanup: remove the discoveryOverrides fallbacks with surfaceMcpToClaudeTrialUsers. -->
		<N8nSettingsPageHeader
			:title="i18n.baseText('settings.mcp.page.title')"
			:description="discoveryOverrides?.description ?? i18n.baseText('settings.mcp.page.description')"
			:docs-leading-text="discoveryOverrides?.docsLeadingText"
			:docs-label="discoveryOverrides?.docsLabel"
			:docs-url="MCP_DOCS_PAGE_URL"
			data-test-id="mcp-settings-header"
		/>
```

Replace the "your client" `N8nSettingsRow` with:

```vue
					<!-- Experiment cleanup: remove the discoveryOverrides fallbacks and the wrapper with surfaceMcpToClaudeTrialUsers. -->
					<N8nSettingsRow
						:title="discoveryOverrides?.clientTitle ?? i18n.baseText('settings.mcp.yourClient.title')"
						:description="
							discoveryOverrides?.clientDescription ??
							i18n.baseText('settings.mcp.yourClient.description')
						"
					>
						<template #action>
							<component :is="mcpDiscovery?.connectHint ?? 'span'">
								<N8nButton
									:variant="discoveryOverrides?.connectVariant ?? 'outline'"
									size="medium"
									icon="mcp"
									:label="i18n.baseText('settings.mcp.yourClient.connect')"
									data-test-id="mcp-connect-client-button"
									@click="onConnectClient"
								/>
							</component>
						</template>
					</N8nSettingsRow>
```

The shell always provides the capability, so the `'span'` fallback renders only in module tests.

- [ ] **Step 9: Run the MCP module and manifest tests**

```bash
pushd packages/modules/mcp/frontend && pnpm test src/SettingsMCPView.test.ts; popd
pushd packages/frontend/editor-ui && pnpm test src/app/capabilities.manifest src/experiments/surfaceMcpToClaudeTrialUsers; popd
```

Expected: PASS without changes to the host tests.

- [ ] **Step 10: Checkpoint**

```bash
git add packages/frontend/@n8n/frontend-module-sdk packages/frontend/editor-ui/src/experiments/surfaceMcpToClaudeTrialUsers packages/frontend/editor-ui/src/app/capabilities.manifest.ts packages/modules/mcp/frontend/src/SettingsMCPView.vue
```

### Task 11: Experiment docs

**Files:**
- Create: `.../surfaceMcpToClaudeTrialUsers/spec.md`
- Create: `.../surfaceMcpToClaudeTrialUsers/setup.md`

- [ ] **Step 1: Write `spec.md`**

````markdown
# Surface MCP to Claude trial users

Experiment `123_surface_mcp_to_claude_trial_users` (GROX-640). The backend lives in
`packages/cli/src/modules/mcp-discovery`.

## Eligibility

- Only Cloud instance owners take part. PostHog selects new Cloud instances and assigns the variant per instance.
- The editor targets an owner when the Cloud plan group is `trial` and the onboarding AI tools answer includes Claude. It reads both from the data that the Cloud store loads at startup.
- The first editor visit of a targeted owner stores `firstSeenAt`. The cutoff is `firstSeenAt` plus 30 minutes.
- An Assistant workflow save (`workflow-saved` with source `n8n-ai`) or Assistant agent save (`agentUpdated` push with source `builder`) at or before the cutoff excludes the owner. Later changes do not count.
- At the cutoff, the backend stores `eligibleAt` and the owner is assigned. The assignment survives plan changes.
- At assignment, the editor sends `User is part of experiment` and `$feature_flag_called` once in each session, in both arms.

## UI

Control keeps the current UI. Treatment adds four entry points: the sidebar above the bottom menu, the Create menu, the empty canvas next to Build with AI, and the Assistant empty state below the input.

| State | CTA | Click |
| --- | --- | --- |
| MCP off | Build with Claude (sidebar subtext: Connect to n8n) | MCP settings |
| MCP on, no Claude OAuth client | Connect Claude | MCP settings |
| Claude OAuth client connected | Build with Claude | `https://claude.ai/new` in a new tab |
| First Claude workflow write | Entry points hide | |

Treatment also changes the MCP settings copy, makes the Connect button solid until Claude connects, and shows a dark coachmark. "Got it" and Connect hide the coachmark for good. Escape and an outside click hide it for the visit.

Both arms expand the sidebar once at assignment.

## Exit

A successful `create_workflow_from_code` or `update_workflow` that returns a workflow ID ends the treatment. The client must be Claude. The name comes from the call, or from the OAuth grant of the same client. A client without a name counts as Claude.

## State

The backend stores rows in `settings` with keys `experiment.mcpDiscovery.<userId>.<field>`. The fields are `firstSeenAt`, `assistantChangedAt`, `eligibleAt`, `claudeUsedAt`, `coachmarkDismissed` and `oauthClient.<clientId>`. Only targeted owners on instances with a variant get rows.

## Telemetry

- `User viewed MCP discovery entry point`: once for each placement in each session.
- `User clicked MCP discovery entry point`.

Both carry `surface`, `cta_stage`, `variant` and `$feature/123_surface_mcp_to_claude_trial_users`.

## Retirement

1. Run `rg "remove with surfaceMcpToClaudeTrialUsers"` and remove each marked edit.
2. Delete this folder and `packages/cli/src/modules/mcp-discovery`.
3. Remove the `experiments.surfaceMcpToClaudeTrialUsers.*` block from `en.json`.
4. If you want to remove the stored state, add a migration that deletes the `settings` rows with the key prefix `experiment.mcpDiscovery.`.
````

- [ ] **Step 2: Write `setup.md`**

````markdown
# Experiment setup

## PostHog

1. Use the flag `123_surface_mcp_to_claude_trial_users` with the values `control` and `variant`.
2. Aggregate by the instance group.
3. Add the Cloud deployment condition and an `instance.createdAt` filter for the rollout cutoff.
4. Split eligible instances equally between control and variant.
5. Use the default `$feature_flag_called` exposure. The editor sends it only at assignment.
6. Keep the flag off until the checks below pass.

If you turn the flag off, the treatment hides on the next page load. Saved assignments stay.

## Checks before rollout

- A Cloud trial owner with a Claude answer reaches `waiting`, then `assigned` 30 minutes after the first visit, without a page reload.
- Admins, members, owners on paid plans and owners without a Claude answer get no `settings` rows.
- An Assistant workflow build or agent build before the cutoff excludes the owner. A build after the cutoff does not.
- Control and variant keep the assignment after a reload and after an n8n restart.
- All four placements open MCP settings before Claude connects, then open Claude in a new tab.
- Only the expanded sidebar shows "Connect to n8n", and only while MCP is off.
- A Claude workflow write through OAuth hides all four placements. A failed write does not.
- The coachmark shows on MCP settings while MCP is on and Claude is not connected.
- View and click events carry `surface`, `cta_stage` and the `$feature` property.
- Keyboard navigation, a narrow window, dark mode and the collapsed sidebar work.
````

- [ ] **Step 3: Checkpoint**

```bash
git add packages/frontend/editor-ui/src/experiments/surfaceMcpToClaudeTrialUsers
```

### Task 12: Verification

- [ ] **Step 1: Run the experiment tests**

```bash
pushd packages/cli && pnpm test src/modules/mcp-discovery; popd
pushd packages/frontend/editor-ui && pnpm test src/experiments/surfaceMcpToClaudeTrialUsers; popd
```

Expected: PASS.

- [ ] **Step 2: Run the backend typecheck**

```bash
pushd packages/cli && pnpm typecheck; popd
```

Expected: no new errors. If errors show up in unrelated files, compare with a typecheck on `master`. CI runs the frontend typechecks, as `AGENTS.md` asks.

- [ ] **Step 3: Format and lint only the changed files**

```bash
git diff --name-only origin/master...HEAD -- '*.ts' '*.vue'
```

From each package, run `pnpm exec biome check --write <files>` and `pnpm exec eslint <files>` for the files that the command lists. Do not run `pnpm lint` over a whole package.

- [ ] **Step 4: Check the footprint**

```bash
git diff --stat origin/master...HEAD
git diff --name-only origin/master...HEAD | grep -v -e 'experiments/surfaceMcpToClaudeTrialUsers' -e 'modules/mcp-discovery'
rg -c "remove with surfaceMcpToClaudeTrialUsers" packages
```

Expected: the second command lists the 17 host files of the file map, and each one has a marker.

- [ ] **Step 5: Manual check on a Cloud staging instance**

Put the branch image on a Cloud staging trial instance. Then go through the checks in `setup.md`.

- [ ] **Step 6: Hand over**

Report which checks ran locally and which checks CI must do.
