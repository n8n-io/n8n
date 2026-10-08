// The provider only converts card answers here. Keep the Assistant runtime out of this test.
vi.mock('../../instance-ai.service', () => ({ InstanceAiService: class {} }));
vi.mock('@/permissions.ee/check-access', () => ({ userHasScopes: vi.fn() }));
// Only DI tokens. The test gives the real proposal service mocks of these services.
vi.mock('@/workflows/workflow-finder.service', () => ({ WorkflowFinderService: class {} }));
vi.mock('@/workflows/workflow.service', () => ({ WorkflowService: class {} }));
vi.mock('@/collaboration/collaboration.service', () => ({ CollaborationService: class {} }));
vi.mock('../../provenance/workflow-provenance.service', () => ({
	WorkflowProvenanceService: class {},
}));

import type { BuiltTool, InterruptibleToolContext } from '@n8n/agents';
import {
	automationProposalCardSchema,
	confirmationRequestPayloadSchema,
	DEFAULT_INSTANCE_AI_PERMISSIONS,
	InstanceAiConfirmRequestDto,
	sharedCardRule,
	type InstanceAiPermissionMode,
	type InstanceAiPermissions,
} from '@n8n/api-types';
import type { EventService } from '@n8n/backend-services';
import { BadRequestError } from '@n8n/errors';
import { isRecord } from '@n8n/utils/is-record';
import fc from 'fast-check';
import { jsonParse, UserError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';
import type z from 'zod';

import { BLOCKED_MESSAGE, DENIED_MESSAGE } from '@/services/capabilities/capability-confirmation';

import { AssistantAgentProvider } from '../../assistant-agent.provider';
import { toAssistantTool } from '../../capabilities/assistant-capability-bridge';
import {
	applyAutomationAnswer,
	proposeAutomationCapability,
} from '../propose-automation.capability';
import {
	BASE_URL,
	createAutomationWorld,
	HTTP_REQUEST,
	INSTANCE_TIMEZONE,
	makeUser,
	manualNodes,
	RESTORED_VERSION_ID,
	storedWorkflow,
	THREAD_ID,
} from './propose-automation.test-helpers';

const SUSPENDED = { suspended: true };
const user = makeUser('alice');
const input = {
	workflowId: 'wf-1',
	title: 'Morning digest',
	why: ['You asked for it every weekday'],
	cron: '0 8 * * 1-5',
};

const withModes = (modes: Partial<InstanceAiPermissions>): InstanceAiPermissions => ({
	...DEFAULT_INSTANCE_AI_PERMISSIONS,
	...modes,
});

const turnOn = {
	kind: 'capabilityDecision',
	approved: true,
	values: { target: 'local', activate: true },
};
const saveOnly = {
	kind: 'capabilityDecision',
	approved: true,
	values: { target: 'local', activate: false },
};
const notNow = { kind: 'capabilityDecision', approved: false };

const kept = (active: boolean) => ({
	workflowId: 'wf-1',
	url: `${BASE_URL}/workflow/wf-1`,
	active,
	kept: true,
});

describe('propose_automation on the n8n Assistant', () => {
	const world = createAutomationWorld();
	const provider = new AssistantAgentProvider(mock(), mock(), mock(), mock());
	let eventService: ReturnType<typeof mock<EventService>>;

	const buildTool = (permissions?: InstanceAiPermissions) =>
		toAssistantTool(proposeAutomationCapability, { user, permissions }, eventService).tool;

	const callTool = async (tool: BuiltTool, args: unknown, ctx: InterruptibleToolContext) => {
		if (!tool.handler) throw new Error('The tool has no handler');
		return await tool.handler(args, ctx);
	};

	/** The first call of the tool, as the runtime makes it. */
	const firstCall = async (tool: BuiltTool, args: unknown = input) => {
		const suspend = vi.fn(async (_payload: unknown) => SUSPENDED as never);
		const output = await callTool(tool, args, { suspend, resumeData: undefined });
		return { output, suspend, payload: suspend.mock.calls[0]?.[0] };
	};

	/**
	 * Suspends, then answers the card the way the chat does: the body goes through the real
	 * `normalizeResumeData` and the resume schema, and a tool built again (as after a reload)
	 * resumes with the suspend payload restored from the JSON checkpoint.
	 */
	const answerCard = async (
		confirmation: unknown,
		options: {
			args?: unknown;
			before?: InstanceAiPermissions;
			after?: InstanceAiPermissions;
			beforeAnswer?: () => void;
		} = {},
	) => {
		const args = options.args ?? input;
		const { payload } = await firstCall(buildTool(options.before), args);
		expect(payload).toBeDefined();
		options.beforeAnswer?.();
		const suspendPayload = jsonParse<unknown>(JSON.stringify(payload));
		const tool = buildTool(options.after ?? options.before);
		const resumeData = (tool.resumeSchema as z.ZodType).parse(
			provider.normalizeResumeData(confirmation),
		);
		return await callTool(tool, args, { suspend: vi.fn(), resumeData, suspendPayload });
	};

	const cardOf = (payload: unknown) =>
		automationProposalCardSchema.parse(isRecord(payload) ? payload.automationProposal : undefined);

	/** The status of each `mcp-tool-called` audit event. */
	const auditStatus = () =>
		eventService.emit.mock.calls.map(([, event]) => {
			const payload: unknown = event;
			return isRecord(payload) ? payload.status : undefined;
		});

	beforeEach(() => {
		world.reset();
		eventService = mock<EventService>();
	});

	describe('tool', () => {
		it('stays loaded and asks before it acts', () => {
			const { tool, alwaysLoaded } = toAssistantTool(
				proposeAutomationCapability,
				{ user },
				eventService,
			);

			expect(alwaysLoaded).toBe(true);
			expect(tool.name).toBe('propose_automation');
			expect(tool.suspendSchema).toBeDefined();
			expect(tool.resumeSchema).toBeDefined();
			expect(tool.description).toContain('Do not call it for a one-off job');
			expect(tool.description).toContain('The user answers on a card');
			expect(tool.description).not.toContain('Set activate to true');
		});
	});

	describe('first call', () => {
		it('suspends with a valid automation card and changes nothing', async () => {
			const { output, suspend, payload } = await firstCall(buildTool());

			expect(output).toBe(SUSPENDED);
			expect(suspend).toHaveBeenCalledTimes(1);
			const card = cardOf(payload);
			expect(card).toStrictEqual({
				workflowId: 'wf-1',
				versionId: 'v-1',
				title: 'Morning digest',
				why: ['You asked for it every weekday'],
				trigger: { kind: 'schedule', cron: '0 8 * * 1-5', timezone: INSTANCE_TIMEZONE },
				steps: [
					{ name: 'Every weekday', type: 'n8n-nodes-base.scheduleTrigger' },
					{ name: 'Send digest', type: 'n8n-nodes-base.slack' },
				],
				stepCount: 2,
				recommended: {
					targetId: 'local',
					kind: 'local',
					reasons: ['always-on-trigger', 'no-cloud-linked'],
				},
				targets: [{ id: 'local', kind: 'local', status: 'online' }],
				visibleTo: { projectId: 'p-1', projectName: 'Ops', projectType: 'team' },
				sharedWith: { projects: [], total: 0 },
				archived: false,
				active: false,
				hasUnpublishedChanges: false,
				canActivate: true,
				offered: { target: ['local'], activate: [true, false] },
			});
			expect(payload).toMatchObject({
				message: 'Want "Morning digest" to run automatically?',
				severity: 'info',
				resourceName: 'Digest builder',
				offered: card.offered,
			});
			expect(world.nothingChanged()).toBe(true);
			expect(eventService.emit).not.toHaveBeenCalled();
		});

		it('sends a payload that the frontend parses with the automation card', async () => {
			const { payload } = await firstCall(buildTool());

			const parsed = confirmationRequestPayloadSchema.partial().passthrough().parse(payload);

			expect(parsed.automationProposal).toEqual(cardOf(payload));
		});

		it('asks to keep a manual workflow and offers only saving', async () => {
			world.grant(storedWorkflow({ nodes: manualNodes }));

			const { payload } = await firstCall(buildTool());

			expect(payload).toMatchObject({
				message: 'Keep "Morning digest" as a workflow?',
				offered: { target: ['local'], activate: [false] },
			});
			expect(cardOf(payload)).toMatchObject({ trigger: { kind: 'manual' }, canActivate: false });
		});

		it('ignores the activation and the version that the model sends', async () => {
			const { payload } = await firstCall(buildTool(), {
				...input,
				activate: true,
				versionId: 'v-model',
			});

			expect(cardOf(payload)).toMatchObject({ versionId: 'v-1', canActivate: true });
			expect(world.nothingChanged()).toBe(true);
		});

		// A teammate in a shared chat answers this card only with the scopes of the card rule.
		it.each([
			['turns it on', turnOn, false, ['workflow:update', 'workflow:publish']],
			['saves it', saveOnly, false, ['workflow:update']],
			['declines it', notNow, false, ['workflow:update']],
			['keeps an archived workflow', saveOnly, true, ['workflow:update', 'workflow:delete']],
		] as const)(
			'gives the real card a teammate rule when the answer %s',
			async (_label, answer, isArchived, scopes) => {
				world.grant(storedWorkflow({ isArchived }));
				const tool = buildTool();
				const { payload } = await firstCall(tool);
				const card = {
					toolName: tool.name,
					input,
					suspendPayload: jsonParse(JSON.stringify(payload)),
				};

				expect(sharedCardRule(card, InstanceAiConfirmRequestDto.parse(answer), 'p-1')).toEqual({
					scopes,
					target: { type: 'workflow', id: 'wf-1' },
				});
			},
		);

		it('fails for a workflow that the user cannot update, without a card', async () => {
			world.grant(storedWorkflow(), ['workflow:read']);
			const suspend = vi.fn();

			const result = callTool(buildTool(), input, { suspend, resumeData: undefined });

			await expect(result).rejects.toThrow(UserError);
			await expect(result).rejects.toThrow("Workflow not found or you don't have permission");
			expect(suspend).not.toHaveBeenCalled();
			expect(world.nothingChanged()).toBe(true);
		});
	});

	describe('answers', () => {
		it('"Turn it on" restores, keeps and turns on the workflow', async () => {
			world.grant(storedWorkflow({ isArchived: true }));

			const output = await answerCard(turnOn);

			expect(output).toEqual(kept(true));
			expect(world.workflowService.unarchive).toHaveBeenCalledWith(user, 'wf-1');
			expect(world.provenance.record).toHaveBeenCalledWith('wf-1', THREAD_ID, 'alice');
			expect(world.temporaryWorkflows.unmark).toHaveBeenCalledWith('wf-1');
			// Restoring saves a new version with the same content. That version goes live.
			expect(world.workflowService.activateWorkflow).toHaveBeenCalledWith(user, 'wf-1', {
				source: 'n8n-ai',
				versionId: RESTORED_VERSION_ID,
			});
			expect(world.collaborationService.broadcastWorkflowUpdate).toHaveBeenCalledWith(
				'wf-1',
				'alice',
			);
			expect(eventService.emit).toHaveBeenCalledWith(
				'mcp-tool-called',
				expect.objectContaining({ toolName: 'propose_automation', status: 'success' }),
			);
		});

		it('"Turn it on" publishes the version that the card showed', async () => {
			const output = await answerCard(turnOn);

			expect(output).toEqual(kept(true));
			expect(world.workflowService.unarchive).not.toHaveBeenCalled();
			expect(world.workflowService.activateWorkflow).toHaveBeenCalledWith(user, 'wf-1', {
				source: 'n8n-ai',
				versionId: 'v-1',
			});
		});

		it('"Save, but leave it off" keeps the workflow without turning it on', async () => {
			const output = await answerCard(saveOnly);

			expect(output).toEqual(kept(false));
			expect(world.provenance.record).toHaveBeenCalledWith('wf-1', THREAD_ID, 'alice');
			expect(world.temporaryWorkflows.unmark).toHaveBeenCalledWith('wf-1');
			expect(world.workflowService.activateWorkflow).not.toHaveBeenCalled();
		});

		it('"Not now" changes nothing', async () => {
			const output = await answerCard(notNow);

			expect(output).toEqual({ denied: true, message: DENIED_MESSAGE });
			expect(world.nothingChanged()).toBe(true);
			expect(eventService.emit).not.toHaveBeenCalled();
		});

		it('rejects "Turn it on" when the card offered only saving, before anything changes', async () => {
			world.grant(storedWorkflow({ nodes: manualNodes }));

			const result = answerCard(turnOn);

			await expect(result).rejects.toThrow(UserError);
			await expect(result).rejects.toThrow('did not offer this value for "activate"');
			expect(world.nothingChanged()).toBe(true);
		});

		it('rejects a target that the card did not offer, before anything changes', async () => {
			const result = answerCard({
				kind: 'capabilityDecision',
				approved: true,
				values: { target: 'cloud-1', activate: true },
			});

			await expect(result).rejects.toThrow('did not offer this value for "target"');
			expect(world.nothingChanged()).toBe(true);
		});

		it('keeps without turning on after a plain approval, also when the model asked to turn it on', async () => {
			const output = await answerCard(
				{ kind: 'approval', approved: true },
				{ args: { ...input, activate: true } },
			);

			expect(output).toMatchObject({ active: false, kept: true });
			expect(world.workflowService.activateWorkflow).not.toHaveBeenCalled();
		});

		it('refuses "Turn it on" when the workflow changed after the card, and changes nothing', async () => {
			const changed = storedWorkflow({
				versionId: 'v-2',
				nodes: [
					{ name: 'Every weekday', type: 'n8n-nodes-base.scheduleTrigger' },
					{ name: 'Call API', type: HTTP_REQUEST },
				] as ReturnType<typeof storedWorkflow>['nodes'],
			});

			const result = answerCard(turnOn, { beforeAnswer: () => world.grant(changed) });

			await expect(result).rejects.toThrow(UserError);
			await expect(result).rejects.toThrow(
				'"Digest builder" changed after the automation was proposed, so it was not turned on.',
			);
			expect(world.nothingChanged()).toBe(true);
		});

		it('publishes the version of the checkpoint, not a version that the model sends', async () => {
			const output = await answerCard(turnOn, { args: { ...input, versionId: 'v-model' } });

			expect(output).toEqual(kept(true));
			expect(world.workflowService.activateWorkflow).toHaveBeenCalledWith(user, 'wf-1', {
				source: 'n8n-ai',
				versionId: 'v-1',
			});
		});

		it('returns a tool error and leaves the workflow off when the publish scope is gone', async () => {
			const result = answerCard(turnOn, {
				beforeAnswer: () => world.grant(storedWorkflow(), ['workflow:read', 'workflow:update']),
			});

			await expect(result).rejects.toThrow(UserError);
			await expect(result).rejects.toThrow(
				'You do not have permission to turn on "Digest builder"',
			);
			expect(world.nothingChanged()).toBe(true);
			expect(auditStatus()).toEqual(['error']);
		});

		it('keeps the workflow and reports why it could not be turned on', async () => {
			world.workflowService.activateWorkflow.mockRejectedValue(
				new BadRequestError('The webhook path is already in use'),
			);

			const output = await answerCard(turnOn);

			expect(output).toEqual({
				...kept(false),
				error:
					'Saved "Digest builder", but could not turn it on: The webhook path is already in use',
			});
			expect(world.temporaryWorkflows.unmark).toHaveBeenCalledTimes(1);
		});

		it('fails the call on an unexpected error while it turns the workflow on', async () => {
			world.workflowService.activateWorkflow.mockRejectedValue(new Error('A bug'));

			await expect(answerCard(turnOn)).rejects.toThrow('A bug');
			expect(auditStatus()).toEqual(['error']);
		});
	});

	describe('admin permission modes', () => {
		it('offers only saving when an admin blocked publishing', async () => {
			const { payload } = await firstCall(buildTool(withModes({ publishWorkflow: 'blocked' })));

			expect(cardOf(payload)).toMatchObject({
				canActivate: false,
				offered: { target: ['local'], activate: [false] },
			});
		});

		it('still shows the card and saves when an admin blocked publishing and the model asked to turn it on', async () => {
			const blocked = withModes({ publishWorkflow: 'blocked' });
			const args = { ...input, activate: true };

			const { payload } = await firstCall(buildTool(blocked), args);
			const output = await answerCard(saveOnly, { before: blocked, args });

			expect(cardOf(payload).offered.activate).toEqual([false]);
			expect(output).toEqual(kept(false));
		});

		it.each([
			['without an activation from the model', input],
			['when the model asked to turn it on', { ...input, activate: true }],
		])(
			'refuses without a card when an admin blocked workflow changes, %s',
			async (_label, args) => {
				const { output, suspend } = await firstCall(
					buildTool(withModes({ updateWorkflow: 'blocked' })),
					args,
				);

				expect(output).toEqual({ denied: true, message: BLOCKED_MESSAGE });
				expect(suspend).not.toHaveBeenCalled();
				expect(world.nothingChanged()).toBe(true);
			},
		);

		it('refuses "Turn it on" when an admin blocked publishing while the card waited', async () => {
			const output = await answerCard(turnOn, {
				before: withModes({ publishWorkflow: 'always_allow' }),
				after: withModes({ publishWorkflow: 'blocked' }),
			});

			expect(output).toEqual({
				denied: true,
				message:
					'An admin has blocked turning on workflows for the n8n Assistant. Nothing was changed.',
			});
			expect(world.nothingChanged()).toBe(true);
		});

		it('refuses every answer when an admin blocked workflow changes while the card waited', async () => {
			const output = await answerCard(saveOnly, {
				before: withModes({}),
				after: withModes({ updateWorkflow: 'blocked' }),
			});

			expect(output).toEqual({ denied: true, message: BLOCKED_MESSAGE });
			expect(world.nothingChanged()).toBe(true);
		});

		it('refuses to restore an archived workflow when an admin blocked restoring', async () => {
			world.grant(storedWorkflow({ isArchived: true }));
			const suspend = vi.fn();

			const result = callTool(buildTool(withModes({ deleteWorkflow: 'blocked' })), input, {
				suspend,
				resumeData: undefined,
			});

			await expect(result).rejects.toThrow(
				'"Digest builder" is archived, and an admin has blocked restoring workflows for the n8n Assistant. Nothing was changed.',
			);
			expect(suspend).not.toHaveBeenCalled();
			expect(world.nothingChanged()).toBe(true);
		});

		it('refuses to restore an archived workflow when an admin blocked restoring while the card waited', async () => {
			world.grant(storedWorkflow({ isArchived: true }));

			const output = await answerCard(saveOnly, {
				before: withModes({}),
				after: withModes({ deleteWorkflow: 'blocked' }),
			});

			expect(output).toMatchObject({ denied: true });
			expect(world.nothingChanged()).toBe(true);
		});

		it('shows the card also when an admin always allows these actions', async () => {
			const tool = buildTool(
				withModes({ updateWorkflow: 'always_allow', publishWorkflow: 'always_allow' }),
			);

			const { output } = await firstCall(tool);

			expect(output).toBe(SUSPENDED);
			expect(world.nothingChanged()).toBe(true);
		});
	});

	describe('applyAutomationAnswer', () => {
		const args = { ...input, why: input.why, activate: true, versionId: 'v-model' };
		const checkpoint = {
			requestId: 'r-1',
			message: 'Want it?',
			severity: 'info' as const,
			offered: { target: ['local'], activate: [true, false] },
			automationProposal: { versionId: 'v-card' },
		};

		it('takes the activation from the answer and the version from the card', () => {
			expect(
				applyAutomationAnswer(args, { approved: true, values: { activate: false } }, checkpoint),
			).toEqual({ ...args, target: 'local', activate: false, versionId: 'v-card' });
		});

		it.each([
			['no values', { approved: true }],
			['values that are not a record', { approved: true, values: 'activate' }],
			['an activation that is not true', { approved: true, values: { activate: 'true' } }],
		])('does not turn the workflow on for an answer with %s', (_label, answer) => {
			expect(applyAutomationAnswer(args, answer, checkpoint).activate).toBe(false);
		});

		it('fails for a checkpoint without the version of the card', () => {
			const { automationProposal: _, ...withoutCard } = checkpoint;

			expect(() =>
				applyAutomationAnswer(args, { approved: true, values: { activate: true } }, withoutCard),
			).toThrow('The confirmation card of this call is missing');
		});
	});

	describe('answers (property)', () => {
		const activateValue = fc.option(fc.boolean(), { nil: undefined });
		const scenario = fc.record({
			canStart: fc.boolean(),
			approved: fc.boolean(),
			chosen: activateValue,
			target: fc.constantFrom('local', 'cloud-1', undefined),
			modelAsked: activateValue,
			publishMode: fc.constantFrom<InstanceAiPermissionMode>(
				'require_approval',
				'always_allow',
				'blocked',
			),
		});

		it('turns the workflow on only when the user chose it on a card that offered it', async () => {
			await fc.assert(
				fc.asyncProperty(scenario, async (run) => {
					const { canStart, approved, chosen, target, modelAsked, publishMode } = run;
					world.reset();
					eventService = mock<EventService>();
					world.grant(storedWorkflow(canStart ? {} : { nodes: manualNodes }));
					const values = {
						...(chosen === undefined ? {} : { activate: chosen }),
						...(target === undefined ? {} : { target }),
					};
					const canTurnOn = canStart && publishMode !== 'blocked';
					const offered = (target ?? 'local') === 'local' && (chosen !== true || canTurnOn);

					const output = await answerCard(
						{ kind: 'capabilityDecision', approved, values },
						{
							args: { ...input, activate: modelAsked },
							before: withModes({ publishWorkflow: publishMode }),
						},
					).catch((error: unknown) => error);

					const expectActivation = approved && offered && chosen === true;
					expect(world.workflowService.activateWorkflow.mock.calls.length).toBe(
						expectActivation ? 1 : 0,
					);
					if (approved && !offered) expect(output).toBeInstanceOf(UserError);
					if (approved && offered) expect(output).toMatchObject({ kept: true });
					if (!approved) expect(world.nothingChanged()).toBe(true);
				}),
				{ numRuns: 80 },
			);
		});
	});
});
