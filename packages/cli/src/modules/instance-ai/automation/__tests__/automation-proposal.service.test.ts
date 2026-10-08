// Only DI tokens here. Stubs keep the large import graphs of these services out of the test.
vi.mock('@/workflows/workflow-finder.service', () => ({ WorkflowFinderService: class {} }));
vi.mock('../automation-workflow-keeper', () => ({ AutomationWorkflowKeeper: class {} }));
vi.mock('../automation-workflow-publisher', () => ({ AutomationWorkflowPublisher: class {} }));

import {
	automationProposalCardSchema,
	DEFAULT_INSTANCE_AI_PERMISSIONS,
	type InstanceAiPermissions,
} from '@n8n/api-types';
import type { UrlService } from '@n8n/backend-services';
import type { GlobalConfig } from '@n8n/config';
import { User, type WorkflowEntity } from '@n8n/db';
import { BadRequestError, LockedError } from '@n8n/errors';
import type { Scope } from '@n8n/permissions';
import { OperationalError, UnexpectedError, UserError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { WorkflowAccessError } from '@/modules/mcp/mcp.errors';
import type { CapabilityContext, CapabilitySurface } from '@/services/capabilities/capability';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { AutomationBlockedError } from '../automation-errors';
import { AutomationInstanceInfo } from '../automation-instance-info';
import { AutomationProposalService } from '../automation-proposal.service';
import type { AutomationWorkflowKeeper } from '../automation-workflow-keeper';
import type { AutomationWorkflowPublisher } from '../automation-workflow-publisher';

const SCHEDULE = 'n8n-nodes-base.scheduleTrigger';
const MANUAL = 'n8n-nodes-base.manualTrigger';
const MANUAL_CHAT = '@n8n/n8n-nodes-langchain.manualChatTrigger';
const EVALUATION = 'n8n-nodes-base.evaluationTrigger';
const SLACK = 'n8n-nodes-base.slack';
const WEBHOOK = 'n8n-nodes-base.webhook';
const READ_WRITE_FILE = 'n8n-nodes-base.readWriteFile';

const scheduleWith = (rule: Record<string, unknown>) => ({
	name: 'Every weekday',
	type: SCHEDULE,
	parameters: { rule: { interval: [rule] } },
});
const WEEKDAYS_AT_8 = scheduleWith({ field: 'cronExpression', expression: '0 8 * * 1-5' });

const user = Object.assign(new User(), { id: 'user-1' });

/** The default time zone of the instance in this test. */
const INSTANCE_ZONE = 'America/New_York';

const storedWorkflow = (overrides: Partial<WorkflowEntity> = {}) =>
	({
		id: 'wf 1',
		name: 'Digest builder',
		nodes: [
			{ ...WEEKDAYS_AT_8, disabled: false },
			{ name: 'Send digest', type: SLACK },
		],
		versionId: 'v-2',
		activeVersionId: null,
		isArchived: false,
		settings: { availableInMCP: true },
		shared: [{ role: 'workflow:owner', project: { id: 'p-1', name: 'Ops', type: 'team' } }],
		...overrides,
	}) as unknown as WorkflowEntity;

const manualNodes = [{ name: 'Click', type: MANUAL }] as WorkflowEntity['nodes'];

const scheduleNodes = (rule: Record<string, unknown>) =>
	[scheduleWith(rule), { name: 'Send digest', type: SLACK }] as unknown as WorkflowEntity['nodes'];

const cronRuleNodes = (expression: string) =>
	scheduleNodes({ field: 'cronExpression', expression });

const webhookNode = { name: 'Hook', type: WEBHOOK } as WorkflowEntity['nodes'][number];

/** Two rules, so no single cron says when the workflow runs. */
const twoRuleNodes = [
	{
		name: 'Every weekday',
		type: SCHEDULE,
		parameters: {
			rule: {
				interval: [
					{ field: 'days', triggerAtHour: 8 },
					{ field: 'days', triggerAtHour: 17 },
				],
			},
		},
	},
] as unknown as WorkflowEntity['nodes'];

const differs = (given: string, used: string) =>
	`Ignored the cron expression "${given}", because the schedule trigger uses the cron expression "${used}".`;

const request = { workflowId: 'wf 1', title: 'Morning digest', why: ['Every weekday'] };

const ALL_SCOPES: Scope[] = [
	'workflow:read',
	'workflow:update',
	'workflow:publish',
	'workflow:delete',
];

const assistantWith = (modes: Partial<InstanceAiPermissions>): CapabilityContext => ({
	user,
	surface: 'assistant',
	permissions: { ...DEFAULT_INSTANCE_AI_PERMISSIONS, ...modes },
});

describe('AutomationProposalService', () => {
	const finder = mock<WorkflowFinderService>();
	const keeper = mock<AutomationWorkflowKeeper>();
	const publisher = mock<AutomationWorkflowPublisher>();
	const urlService = mock<UrlService>();
	const globalConfig = mock<GlobalConfig>({ generic: { timezone: INSTANCE_ZONE } });
	const instance = new AutomationInstanceInfo(urlService, globalConfig);
	const service = new AutomationProposalService(finder, keeper, publisher, instance);
	const assistant: CapabilityContext = { user, surface: 'assistant' };

	/** Access as stored: the workflow for the scopes that the user holds, null otherwise. */
	const grant = (workflow: WorkflowEntity, scopes: Scope[] = ALL_SCOPES) => {
		const allowed = (wanted: Scope[]) => wanted.every((scope) => scopes.includes(scope));
		finder.findWorkflowForUser.mockImplementation(async (_id, _user, wanted) =>
			allowed(wanted) ? workflow : null,
		);
		finder.findWorkflowHeadForUser.mockImplementation(async (_id, _user, wanted) =>
			allowed(wanted)
				? {
						versionId: workflow.versionId,
						activeVersionId: workflow.activeVersionId,
						updatedAt: new Date(),
					}
				: null,
		);
	};

	/** The scopes of each full load of the workflow, with its nodes and sharings. */
	const workflowLoads = () => finder.findWorkflowForUser.mock.calls.map(([, , scopes]) => scopes);
	/** The scopes of each light check that reads only the head of the workflow. */
	const scopeChecks = () => finder.findWorkflowHeadForUser.mock.calls.map(([, , scopes]) => scopes);

	const nothingChanged = () =>
		keeper.keep.mock.calls.length === 0 && publisher.activate.mock.calls.length === 0;

	beforeEach(() => {
		vi.resetAllMocks();
		urlService.getInstanceBaseUrl.mockReturnValue('http://n8n.local');
		keeper.keep.mockImplementation(async (_user, workflow) => workflow.versionId);
		publisher.assertEditable.mockResolvedValue(undefined);
		publisher.activate.mockResolvedValue(true);
	});

	describe('propose', () => {
		it('builds a card that offers to turn on a schedule workflow', async () => {
			grant(storedWorkflow());

			const proposal = await service.propose({ ...request, cron: '0 8 * * 1-5' }, assistant);

			expect(proposal.workflowName).toBe('Digest builder');
			expect(automationProposalCardSchema.parse(proposal.card)).toEqual(proposal.card);
			expect(proposal.card).toMatchObject({
				workflowId: 'wf 1',
				versionId: 'v-2',
				title: 'Morning digest',
				why: ['Every weekday'],
				trigger: { kind: 'schedule', cron: '0 8 * * 1-5', timezone: INSTANCE_ZONE },
				recommended: {
					targetId: 'local',
					kind: 'local',
					reasons: ['always-on-trigger', 'no-cloud-linked'],
				},
				visibleTo: { projectId: 'p-1', projectName: 'Ops', projectType: 'team' },
				archived: false,
				active: false,
				canActivate: true,
				offered: { target: ['local'], activate: [true, false] },
			});
			expect(workflowLoads()).toEqual([['workflow:update']]);
			expect(scopeChecks()).toEqual([['workflow:publish']]);
			expect(nothingChanged()).toBe(true);
		});

		it('shows the cron rule of the Schedule Trigger, not the cron of the model', async () => {
			grant(storedWorkflow({ nodes: cronRuleNodes('0 7 * * *') }));

			const { card } = await service.propose({ ...request, cron: '0 8 * * 1-5' }, assistant);

			expect(card.trigger).toEqual({
				kind: 'schedule',
				cron: '0 7 * * *',
				timezone: INSTANCE_ZONE,
			});
		});

		it('shows the time zone of the workflow settings with the schedule', async () => {
			grant(storedWorkflow({ settings: { timezone: 'Asia/Kolkata' } }));

			const { card } = await service.propose(request, assistant);

			expect(card.trigger).toEqual({
				kind: 'schedule',
				cron: '0 8 * * 1-5',
				timezone: 'Asia/Kolkata',
			});
		});

		it('shows no schedule when the time zone of the workflow does not exist', async () => {
			grant(storedWorkflow({ settings: { timezone: 'Mars/Olympus_Mons' } }));

			const { card } = await service.propose(request, assistant);

			expect(card.trigger).toEqual({ kind: 'schedule' });
		});

		it.each([
			['every day at 8', { field: 'days', triggerAtHour: 8 }, '0 17 * * *', '0 8 * * *'],
			['every minute', { field: 'minutes', minutesInterval: 1 }, '0 9 * * 1', '* * * * *'],
			['every hour by default', { field: 'hours' }, undefined, '0 * * * *'],
		])(
			'shows the schedule of an interval rule (%s), not the cron of the model',
			async (_label, rule, given, shown) => {
				grant(storedWorkflow({ nodes: scheduleNodes(rule) }));

				const { card } = await service.propose({ ...request, cron: given }, assistant);

				expect(card.trigger).toEqual({ kind: 'schedule', cron: shown, timezone: INSTANCE_ZONE });
			},
		);

		it.each([
			['two rules', twoRuleNodes],
			['a rule that n8n runs with skips', scheduleNodes({ field: 'days', daysInterval: 2 })],
			['the legacy cron node', [{ name: 'Old', type: 'n8n-nodes-base.cron' }]],
		])('never shows the cron of the model for a trigger with %s', async (_label, nodes) => {
			grant(storedWorkflow({ nodes: nodes as WorkflowEntity['nodes'] }));

			const { card } = await service.propose({ ...request, cron: '0 8 * * 1-5' }, assistant);

			expect(card.trigger).toEqual({ kind: 'schedule' });
		});

		it.each<[string, CapabilityContext, Scope[]]>([
			['an admin blocked publishing', assistantWith({ publishWorkflow: 'blocked' }), ALL_SCOPES],
			['the user cannot publish', assistant, ['workflow:update']],
		])('offers only saving when %s', async (_label, context, scopes) => {
			grant(storedWorkflow(), scopes);

			const { card } = await service.propose(request, context);

			expect(card.canActivate).toBe(false);
			expect(card.offered.activate).toEqual([false]);
		});

		it.each<[string, Partial<InstanceAiPermissions>]>([
			['publishing needs approval', { publishWorkflow: 'require_approval' }],
			['an admin always allows publishing', { publishWorkflow: 'always_allow' }],
			['an admin blocked only other actions', { deleteWorkflow: 'blocked' }],
		])('offers to turn the workflow on when %s', async (_label, modes) => {
			grant(storedWorkflow());

			const { card } = await service.propose(request, assistantWith(modes));

			expect(card.offered.activate).toEqual([true, false]);
		});

		it('ignores the admin permission modes of the Assistant on MCP', async () => {
			grant(storedWorkflow());
			const mcp: CapabilityContext = {
				user,
				surface: 'mcp',
				permissions: { ...DEFAULT_INSTANCE_AI_PERMISSIONS, publishWorkflow: 'blocked' },
			};

			const { card } = await service.propose(request, mcp);

			expect(card.canActivate).toBe(true);
		});

		it('offers only saving for a manual workflow, without asking for the publish scope', async () => {
			grant(storedWorkflow({ nodes: manualNodes }));

			const { card } = await service.propose(request, assistant);

			expect(card.trigger).toEqual({ kind: 'manual' });
			expect(card.canActivate).toBe(false);
			expect(card.recommended.reasons).toEqual(['manual-only']);
			expect(workflowLoads()).toEqual([['workflow:update']]);
			expect(scopeChecks()).toEqual([]);
		});

		it.each([
			['a manual chat trigger', MANUAL_CHAT],
			['an evaluation trigger', EVALUATION],
		])(
			'does not call %s an always-on trigger, because it cannot start the workflow',
			async (_label, type) => {
				const nodes = [
					{ name: 'Start', type },
					{ name: 'Click', type: MANUAL },
					{ name: 'Send', type: SLACK },
				] as WorkflowEntity['nodes'];
				grant(storedWorkflow({ nodes }));

				const { card } = await service.propose(request, assistant);

				expect(card.canActivate).toBe(false);
				expect(card.recommended.reasons).toEqual(['manual-only']);
			},
		);

		it('recommends this computer with the reason of a local-only node', async () => {
			const nodes = [
				{ name: 'Every weekday', type: SCHEDULE },
				{ name: 'Write report', type: READ_WRITE_FILE },
			] as WorkflowEntity['nodes'];
			grant(storedWorkflow({ nodes }));

			const { card } = await service.propose(request, assistant);

			expect(card.recommended).toEqual({
				targetId: 'local',
				kind: 'local',
				reasons: ['needs-local-files'],
			});
		});

		it('does not count disabled nodes for the recommendation', async () => {
			const nodes = [
				{ name: 'Every weekday', type: SCHEDULE },
				{ name: 'Write report', type: READ_WRITE_FILE, disabled: true },
			] as WorkflowEntity['nodes'];
			grant(storedWorkflow({ nodes }));

			const { card } = await service.propose(request, assistant);

			expect(card.recommended.reasons).toEqual(['always-on-trigger', 'no-cloud-linked']);
		});

		it('refuses a workflow that the user cannot update', async () => {
			grant(storedWorkflow(), ['workflow:read', 'workflow:publish']);

			await expect(service.propose(request, assistant)).rejects.toThrow(WorkflowAccessError);
		});

		it('refuses on MCP a workflow that is not available in MCP', async () => {
			grant(storedWorkflow({ settings: {} }));

			await expect(service.propose(request, { user, surface: 'mcp' })).rejects.toMatchObject({
				reason: 'not_available_in_mcp',
			});
		});

		describe('for an archived workflow', () => {
			it('says that keeping it restores it', async () => {
				grant(storedWorkflow({ isArchived: true }));

				const { card } = await service.propose(request, assistant);

				expect(card.archived).toBe(true);
				expect(scopeChecks()).toContainEqual(['workflow:delete']);
			});

			it('refuses when an admin blocked restoring workflows', async () => {
				grant(storedWorkflow({ isArchived: true }));

				const result = service.propose(request, assistantWith({ deleteWorkflow: 'blocked' }));

				await expect(result).rejects.toThrow(AutomationBlockedError);
				await expect(result).rejects.toThrow(
					'"Digest builder" is archived, and an admin has blocked restoring workflows for the n8n Assistant. Nothing was changed.',
				);
			});

			it('refuses when the user cannot restore it', async () => {
				grant(storedWorkflow({ isArchived: true }), ['workflow:update', 'workflow:publish']);

				const result = service.propose(request, assistant);

				await expect(result).rejects.toThrow(UserError);
				await expect(result).rejects.toThrow(
					'"Digest builder" is archived, and you do not have permission to restore it. Ask the owner of the workflow to restore it. Nothing was changed.',
				);
			});

			it('does not check restoring for a workflow that is not archived', async () => {
				grant(storedWorkflow(), ['workflow:update', 'workflow:publish']);

				await service.propose(request, assistantWith({ deleteWorkflow: 'blocked' }));

				expect(scopeChecks()).not.toContainEqual(['workflow:delete']);
			});
		});
	});

	describe('apply', () => {
		it('keeps the workflow without turning it on', async () => {
			const workflow = storedWorkflow();
			grant(workflow);

			const result = await service.apply({ ...request, activate: false }, assistant);

			expect(result).toStrictEqual({
				workflowId: 'wf 1',
				url: 'http://n8n.local/workflow/wf%201',
				active: false,
				kept: true,
			});
			expect(keeper.keep).toHaveBeenCalledWith(user, workflow);
			expect(publisher.activate).not.toHaveBeenCalled();
		});

		it.each<[CapabilitySurface, string]>([
			['assistant', 'n8n-ai'],
			['mcp', 'n8n-mcp'],
		])('keeps and then turns on the workflow on the %s surface', async (surface, source) => {
			grant(storedWorkflow());
			const order: string[] = [];
			keeper.keep.mockImplementation(async () => {
				order.push('keep');
				return 'v-2';
			});
			publisher.activate.mockImplementation(async () => {
				order.push('activate');
				return true;
			});

			const result = await service.apply({ ...request, activate: true }, { user, surface });

			expect(result).toStrictEqual({
				workflowId: 'wf 1',
				url: 'http://n8n.local/workflow/wf%201',
				active: true,
				kept: true,
			});
			expect(publisher.activate).toHaveBeenCalledWith(user, 'wf 1', { source, versionId: 'v-2' });
			expect(order).toEqual(['keep', 'activate']);
		});

		it('publishes the version that restoring the workflow saved', async () => {
			grant(storedWorkflow({ isArchived: true }));
			keeper.keep.mockResolvedValue('v-restored');

			await service.apply({ ...request, activate: true, versionId: 'v-2' }, assistant);

			expect(publisher.activate).toHaveBeenCalledWith(user, 'wf 1', {
				source: 'n8n-ai',
				versionId: 'v-restored',
			});
		});

		describe('version that the user agreed to', () => {
			it('turns on the workflow when the saved version is the agreed one', async () => {
				grant(storedWorkflow());

				await service.apply({ ...request, activate: true, versionId: 'v-2' }, assistant);

				expect(publisher.activate).toHaveBeenCalledTimes(1);
			});

			it('refuses to turn on a workflow that changed after the card and changes nothing', async () => {
				grant(storedWorkflow({ versionId: 'v-3' }));

				const result = service.apply({ ...request, activate: true, versionId: 'v-2' }, assistant);

				await expect(result).rejects.toThrow(UserError);
				await expect(result).rejects.toThrow(
					'"Digest builder" changed after the automation was proposed, so it was not turned on. Nothing was changed. Propose it again to turn on the current version.',
				);
				expect(nothingChanged()).toBe(true);
			});

			it('keeps a changed workflow when the user does not turn it on', async () => {
				grant(storedWorkflow({ versionId: 'v-3' }));

				const result = await service.apply(
					{ ...request, activate: false, versionId: 'v-2' },
					assistant,
				);

				expect(result).toMatchObject({ kept: true, active: false });
				expect(keeper.keep).toHaveBeenCalledTimes(1);
			});

			// Archiving saves a new version, so only a card that showed the archive has its version.
			it.each([true, false])(
				'refuses to restore a workflow archived after the card (activate: %s) and changes nothing',
				async (activate) => {
					grant(storedWorkflow({ isArchived: true, versionId: 'v-3' }));

					const result = service.apply({ ...request, activate, versionId: 'v-2' }, assistant);

					await expect(result).rejects.toThrow(UserError);
					await expect(result).rejects.toThrow(
						'"Digest builder" was archived or changed after the automation was proposed, so it was not restored. Nothing was changed. Propose it again to keep it.',
					);
					expect(nothingChanged()).toBe(true);
				},
			);

			it('restores a workflow that was archived when the card showed it', async () => {
				const workflow = storedWorkflow({ isArchived: true, versionId: 'v-2' });
				grant(workflow);

				const result = await service.apply(
					{ ...request, activate: false, versionId: 'v-2' },
					assistant,
				);

				expect(result).toMatchObject({ kept: true });
				expect(keeper.keep).toHaveBeenCalledWith(user, workflow);
			});
		});

		it('checks the editor lock before the first change and changes nothing', async () => {
			grant(storedWorkflow({ isArchived: true }));
			const locked = new LockedError('Cannot modify workflow while it is being edited');
			publisher.assertEditable.mockRejectedValue(locked);

			await expect(service.apply({ ...request, activate: true }, assistant)).rejects.toBe(locked);

			expect(publisher.assertEditable).toHaveBeenCalledWith('wf 1');
			expect(nothingChanged()).toBe(true);
		});

		it('does not check the editor lock when the workflow is only kept', async () => {
			grant(storedWorkflow());

			await service.apply({ ...request, activate: false }, assistant);

			expect(publisher.assertEditable).not.toHaveBeenCalled();
			expect(keeper.keep).toHaveBeenCalledTimes(1);
		});

		it('loads the full workflow once and checks other scopes with light reads', async () => {
			grant(storedWorkflow({ isArchived: true }));

			await service.apply({ ...request, activate: true }, assistant);

			expect(workflowLoads()).toEqual([['workflow:update']]);
			expect(scopeChecks()).toEqual([['workflow:delete'], ['workflow:publish']]);
		});

		it('refuses to turn on a workflow without a publish scope and changes nothing', async () => {
			grant(storedWorkflow(), ['workflow:update']);

			const result = service.apply({ ...request, activate: true }, assistant);

			await expect(result).rejects.toThrow(UserError);
			await expect(result).rejects.toThrow(
				'You do not have permission to turn on "Digest builder". Ask the owner of the workflow to turn it on. Nothing was changed.',
			);
			expect(nothingChanged()).toBe(true);
		});

		it('refuses to turn on a workflow that only a person can start and changes nothing', async () => {
			grant(storedWorkflow({ nodes: manualNodes }));

			const result = service.apply({ ...request, activate: true }, assistant);

			await expect(result).rejects.toThrow(UserError);
			await expect(result).rejects.toThrow(
				'"Digest builder" has no trigger that starts it on its own, so it cannot be turned on. Nothing was changed.',
			);
			expect(nothingChanged()).toBe(true);
		});

		it('keeps a manual workflow when the user saves it', async () => {
			grant(storedWorkflow({ nodes: manualNodes }), ['workflow:update']);

			await expect(service.apply(request, assistant)).resolves.toMatchObject({
				active: false,
				kept: true,
			});
			expect(keeper.keep).toHaveBeenCalledTimes(1);
		});

		it('does not publish again when the saved version is live', async () => {
			grant(storedWorkflow({ activeVersionId: 'v-2' }), ['workflow:update']);

			const result = await service.apply({ ...request, activate: true }, assistant);

			expect(result).toMatchObject({ active: true, kept: true });
			expect(publisher.activate).not.toHaveBeenCalled();
		});

		it('publishes the saved version when an older version is live', async () => {
			grant(storedWorkflow({ activeVersionId: 'v-1' }));

			await service.apply({ ...request, activate: true }, assistant);

			expect(publisher.activate).toHaveBeenCalledTimes(1);
		});

		it('reports a live older version when the user saves without turning it on', async () => {
			grant(storedWorkflow({ activeVersionId: 'v-1' }), ['workflow:update']);

			await expect(service.apply(request, assistant)).resolves.toMatchObject({ active: true });
			expect(publisher.activate).not.toHaveBeenCalled();
		});

		describe('when turning the workflow on fails', () => {
			it.each([
				['a request error', new BadRequestError('Webhook path is already in use')],
				['an editor lock', new LockedError('The workflow is open in the editor')],
				['a transient problem', new OperationalError('The database timed out')],
				['a refusal', new UserError('Not allowed')],
			])('keeps the workflow and reports %s', async (_label, error) => {
				grant(storedWorkflow());
				publisher.activate.mockRejectedValue(error);

				const result = await service.apply({ ...request, activate: true }, assistant);

				expect(result).toStrictEqual({
					workflowId: 'wf 1',
					url: 'http://n8n.local/workflow/wf%201',
					active: false,
					kept: true,
					error: `Saved "Digest builder", but could not turn it on: ${error.message}`,
				});
				expect(keeper.keep).toHaveBeenCalledTimes(1);
			});

			it('reads again whether a version is still live', async () => {
				const before = storedWorkflow({ activeVersionId: 'v-1' });
				grant(before);
				publisher.activate.mockImplementation(async () => {
					// A late failure stops the version that was live before.
					grant(storedWorkflow({ activeVersionId: null }));
					throw new BadRequestError('The trigger could not start');
				});

				const result = await service.apply({ ...request, activate: true }, assistant);

				expect(result).toMatchObject({ active: false, kept: true });
				expect(scopeChecks().at(-1)).toEqual(['workflow:read']);
			});

			it('reports the older version that stays live after an early failure', async () => {
				grant(storedWorkflow({ activeVersionId: 'v-1' }));
				publisher.activate.mockRejectedValue(new BadRequestError('Webhook path is in use'));

				const result = await service.apply({ ...request, activate: true }, assistant);

				expect(result).toMatchObject({ active: true, kept: true });
			});

			it.each([
				['a plain error', new Error('Cannot read properties of undefined')],
				['an unexpected error', new UnexpectedError('A bug')],
			])('lets %s reach error reporting', async (_label, error) => {
				grant(storedWorkflow());
				publisher.activate.mockRejectedValue(error);

				await expect(service.apply({ ...request, activate: true }, assistant)).rejects.toBe(error);
			});
		});

		it('does not turn on a workflow that it could not keep', async () => {
			grant(storedWorkflow({ isArchived: true }));
			keeper.keep.mockRejectedValue(new UserError('This n8n instance is read-only'));

			await expect(service.apply({ ...request, activate: true }, assistant)).rejects.toThrow(
				'This n8n instance is read-only',
			);
			expect(publisher.activate).not.toHaveBeenCalled();
		});

		it.each([
			[
				'a cron that is not valid',
				storedWorkflow(),
				'0 25 * * *',
				`${differs('0 25 * * *', '0 8 * * 1-5')} The cron expression "0 25 * * *" is not a valid five-field cron expression.`,
			],
			[
				'a cron for a schedule that another trigger shares',
				storedWorkflow({ nodes: [...cronRuleNodes('0 7 * * *'), webhookNode] }),
				'0 7 * * *',
				'Ignored the cron expression "0 7 * * *", because another trigger also starts the workflow. The card shows a schedule only when the schedule trigger alone starts the workflow.',
			],
			[
				'a cron for a workflow with a time zone that does not exist',
				storedWorkflow({ settings: { timezone: 'Mars/Olympus_Mons' } }),
				'0 8 * * 1-5',
				'Ignored the cron expression "0 8 * * 1-5", because the time zone in the workflow settings is not valid.',
			],
			[
				'a cron that differs from the schedule rule',
				storedWorkflow({ nodes: cronRuleNodes('0 7 * * *') }),
				'0 8 * * *',
				differs('0 8 * * *', '0 7 * * *'),
			],
			[
				'a cron that differs from an interval rule',
				storedWorkflow({ nodes: scheduleNodes({ field: 'days', triggerAtHour: 8 }) }),
				'0 17 * * *',
				differs('0 17 * * *', '0 8 * * *'),
			],
			[
				'a cron for a trigger without one schedule',
				storedWorkflow({ nodes: twoRuleNodes }),
				'0 8 * * *',
				'Ignored the cron expression "0 8 * * *". The card shows only a schedule that it reads from the trigger, and no single five-field cron expression says when this schedule trigger runs.',
			],
		])('returns a warning for %s', async (_label, workflow, cron, warning) => {
			grant(workflow);

			const result = await service.apply({ ...request, cron }, assistant);

			expect(result.warnings).toEqual([warning]);
		});

		it('refuses a workflow that the user cannot update and changes nothing', async () => {
			grant(storedWorkflow(), ['workflow:read', 'workflow:publish']);

			await expect(service.apply({ ...request, activate: true }, assistant)).rejects.toThrow(
				WorkflowAccessError,
			);
			expect(nothingChanged()).toBe(true);
		});

		describe('admin permission modes', () => {
			it('refuses to turn on a workflow when an admin blocked publishing', async () => {
				grant(storedWorkflow());

				const result = service.apply(
					{ ...request, activate: true },
					assistantWith({ publishWorkflow: 'blocked' }),
				);

				await expect(result).rejects.toThrow(AutomationBlockedError);
				await expect(result).rejects.toThrow(
					'An admin has blocked turning on workflows for the n8n Assistant. Nothing was changed.',
				);
				expect(finder.findWorkflowForUser).not.toHaveBeenCalled();
				expect(nothingChanged()).toBe(true);
			});

			it('keeps the workflow when an admin blocked publishing and the user saves', async () => {
				grant(storedWorkflow());

				const result = await service.apply(
					{ ...request, activate: false },
					assistantWith({ publishWorkflow: 'blocked' }),
				);

				expect(result).toMatchObject({ kept: true, active: false });
			});

			it('turns on a workflow on MCP, where the admin modes do not apply', async () => {
				grant(storedWorkflow());

				const { permissions } = assistantWith({ publishWorkflow: 'blocked' });

				await service.apply({ ...request, activate: true }, { user, surface: 'mcp', permissions });

				expect(publisher.activate).toHaveBeenCalledTimes(1);
			});

			it('refuses to restore an archived workflow when an admin blocked restoring', async () => {
				grant(storedWorkflow({ isArchived: true }));

				const result = service.apply(request, assistantWith({ deleteWorkflow: 'blocked' }));

				await expect(result).rejects.toThrow(AutomationBlockedError);
				expect(nothingChanged()).toBe(true);
			});

			it('refuses to restore an archived workflow without the delete scope', async () => {
				grant(storedWorkflow({ isArchived: true }), ['workflow:update', 'workflow:publish']);

				await expect(service.apply(request, assistant)).rejects.toThrow(
					'you do not have permission to restore it',
				);
				expect(nothingChanged()).toBe(true);
			});
		});
	});
});
