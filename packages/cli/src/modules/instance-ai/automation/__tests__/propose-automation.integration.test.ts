import { randomUUID } from 'node:crypto';

import type { BuiltTool, InterruptibleToolContext } from '@n8n/agents';
import { InstanceAiConfirmRequestDto, automationProposalCardSchema } from '@n8n/api-types';
import { LicenseState } from '@n8n/backend-common';
import {
	createWorkflowWithHistory,
	mockInstance,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import { CacheService } from '@n8n/backend-services';
import type { EventService } from '@n8n/backend-services';
import { GlobalConfig } from '@n8n/config';
import {
	AiBuilderTemporaryWorkflowRepository,
	ProjectRepository,
	type User,
	type WorkflowEntity,
	WorkflowRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { buildResumeData, toConfirmationData } from '@n8n/instance-ai/confirmation-payload';
import { DataSource } from '@n8n/typeorm';
import { isRecord } from '@n8n/utils/is-record';
import { type INode, jsonParse } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';
import type z from 'zod';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { CollaborationState } from '@/collaboration/collaboration.state';
import { License } from '@/license';
import { Push } from '@/push';
import { Telemetry } from '@/telemetry';
import { WorkflowService } from '@/workflows/workflow.service';
import { createOwner } from '@test-integration/db/users';
import * as utils from '@test-integration/utils';

import { AgentExecutionThread } from '../../../agents/entities/agent-execution-thread.entity';
import { AgentResourceEntity } from '../../../agents/entities/agent-resource.entity';
import { AgentThreadEntity } from '../../../agents/entities/agent-thread.entity';
import { AgentRepository } from '../../../agents/repositories/agent.repository';
import { draftChatMemoryResourceId } from '../../../agents/utils/agent-memory-scope';
import { ASSISTANT_AGENT_ID, ASSISTANT_AGENT_NAME } from '../../assistant-turn-options';
import { toAssistantTool } from '../../capabilities/assistant-capability-bridge';
import { WorkflowProvenanceRepository } from '../../provenance/workflow-provenance.repository';
import { proposeAutomationCapability } from '../propose-automation.capability';

const SCHEDULE_NODES: INode[] = [
	{
		id: randomUUID(),
		name: 'Every weekday',
		type: 'n8n-nodes-base.scheduleTrigger',
		typeVersion: 1.2,
		position: [0, 0],
		parameters: { rule: { interval: [{ field: 'cronExpression', expression: '0 8 * * 1-5' }] } },
	},
	{
		id: randomUUID(),
		name: 'Prepare digest',
		type: 'n8n-nodes-base.set',
		typeVersion: 1,
		position: [200, 0],
		parameters: {},
	},
];
const SCHEDULE_CONNECTIONS = {
	'Every weekday': { main: [[{ node: 'Prepare digest', type: 'main' as const, index: 0 }]] },
};

/**
 * `propose_automation` on real services in SQLite: AutomationWorkflowKeeper and
 * AutomationTemporaryMarker keep the workflow (restore, provenance row, marker removed), and
 * WorkflowService publishes it. Only trigger registration (ActiveWorkflowManager), telemetry and
 * push are stubbed.
 */
describe('propose_automation (integration)', () => {
	mockInstance(ActiveWorkflowManager);
	mockInstance(Telemetry);
	mockInstance(Push, new Push(mock(), mock(), mock(), mock(), mock()));

	let owner: User;
	let threadId: string;
	let workflowRepository: WorkflowRepository;
	let temporaryWorkflows: AiBuilderTemporaryWorkflowRepository;
	let provenance: WorkflowProvenanceRepository;

	beforeAll(async () => {
		// The instance-ai entities reference Agents tables, so load the agents module too.
		await testModules.loadModules(['agents', 'instance-ai']);
		await testDb.init();
		await utils.initNodeTypes();
		Container.get(LicenseState).setLicenseProvider(Container.get(License));
		await Container.get(CacheService).init();
		await Container.get(AgentRepository).ensureInstanceAgent(
			ASSISTANT_AGENT_ID,
			ASSISTANT_AGENT_NAME,
		);
		workflowRepository = Container.get(WorkflowRepository);
		temporaryWorkflows = Container.get(AiBuilderTemporaryWorkflowRepository);
		provenance = Container.get(WorkflowProvenanceRepository);
		owner = await createOwner();
		threadId = await createAssistantThread(owner);
	});

	afterEach(async () => {
		await provenance.clear();
		await testDb.truncate(['WorkflowEntity', 'SharedWorkflow', 'WorkflowHistory']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	/** An Assistant chat of the user, as the AI-temporary marker needs one. */
	async function createAssistantThread(user: User): Promise<string> {
		const dataSource = Container.get(DataSource);
		const id = randomUUID();
		const resourceId = draftChatMemoryResourceId(user.id);
		await dataSource.getRepository(AgentResourceEntity).insert({ id: resourceId, metadata: null });
		await dataSource
			.getRepository(AgentThreadEntity)
			.insert({ id, resourceId, title: null, metadata: null });
		const project = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(user.id);
		await dataSource.getRepository(AgentExecutionThread).insert({
			id,
			agentId: ASSISTANT_AGENT_ID,
			agentName: ASSISTANT_AGENT_NAME,
			ownerId: user.id,
			accessScope: 'user',
			projectId: project.id,
			title: 'Morning digest',
			parentThreadId: null,
		});
		return id;
	}

	/** A workflow that the Assistant built in the chat and has not kept yet. */
	async function createTemporaryWorkflow(attributes: Partial<WorkflowEntity> = {}) {
		const workflow = await createWorkflowWithHistory(
			{
				name: 'Digest builder',
				nodes: SCHEDULE_NODES,
				connections: SCHEDULE_CONNECTIONS,
				...attributes,
			},
			owner,
		);
		await temporaryWorkflows.mark(workflow.id, threadId);
		return workflow;
	}

	const buildTool = () =>
		toAssistantTool(proposeAutomationCapability, { user: owner }, mock<EventService>()).tool;

	const callTool = async (tool: BuiltTool, args: unknown, ctx: InterruptibleToolContext) => {
		if (!tool.handler) throw new Error('The tool has no handler');
		return await tool.handler(args, ctx);
	};

	/** Shows the card, then answers it as the chat does: through the confirm DTO. */
	const proposeAndAnswer = async (
		workflowId: string,
		confirmation: unknown,
		beforeAnswer?: () => Promise<void>,
	) => {
		const args = {
			workflowId,
			title: 'Morning digest',
			why: ['Every weekday'],
			cron: '0 8 * * 1-5',
		};
		const suspend = vi.fn(async (_payload: unknown) => ({ suspended: true }) as never);
		await callTool(buildTool(), args, { suspend, resumeData: undefined });
		const payload: unknown = suspend.mock.calls[0]?.[0];
		const card = automationProposalCardSchema.parse(
			isRecord(payload) ? payload.automationProposal : undefined,
		);
		await beforeAnswer?.();

		const tool = buildTool();
		const resumeData = (tool.resumeSchema as z.ZodType).parse(
			buildResumeData(toConfirmationData(InstanceAiConfirmRequestDto.parse(confirmation))),
		);
		const output = await callTool(tool, args, {
			suspend: vi.fn(),
			resumeData,
			suspendPayload: jsonParse<unknown>(JSON.stringify(payload)),
		});
		return { card, output };
	};

	const stored = async (workflowId: string) =>
		await workflowRepository.findOneByOrFail({ id: workflowId });

	it('turns on a temporary schedule workflow, records its chat and removes the marker', async () => {
		const workflow = await createTemporaryWorkflow();

		const { card, output } = await proposeAndAnswer(workflow.id, {
			kind: 'capabilityDecision',
			approved: true,
			values: { target: 'local', activate: true },
		});

		expect(card).toMatchObject({
			workflowId: workflow.id,
			versionId: workflow.versionId,
			trigger: {
				kind: 'schedule',
				cron: '0 8 * * 1-5',
				timezone: Container.get(GlobalConfig).generic.timezone,
			},
			stepCount: 2,
			canActivate: true,
			archived: false,
			visibleTo: { projectType: 'personal' },
			offered: { target: ['local'], activate: [true, false] },
		});
		expect(output).toMatchObject({ workflowId: workflow.id, active: true, kept: true });
		const after = await stored(workflow.id);
		expect(after.activeVersionId).toBe(workflow.versionId);
		expect(after.active).toBe(true);
		expect(await provenance.findForWorkflow(workflow.id)).toMatchObject({
			workflowId: workflow.id,
			threadId,
			createdByUserId: owner.id,
		});
		expect(await temporaryWorkflows.existsForWorkflow(workflow.id)).toBe(false);
	});

	it('keeps a workflow without turning it on', async () => {
		const workflow = await createTemporaryWorkflow();

		const { output } = await proposeAndAnswer(workflow.id, {
			kind: 'capabilityDecision',
			approved: true,
			values: { target: 'local', activate: false },
		});

		expect(output).toMatchObject({ active: false, kept: true });
		expect((await stored(workflow.id)).activeVersionId).toBeNull();
		expect(await provenance.findForWorkflow(workflow.id)).toMatchObject({ threadId });
		expect(await temporaryWorkflows.existsForWorkflow(workflow.id)).toBe(false);
	});

	it('changes nothing when the user says "Not now"', async () => {
		const workflow = await createTemporaryWorkflow();

		const { output } = await proposeAndAnswer(workflow.id, {
			kind: 'capabilityDecision',
			approved: false,
		});

		expect(output).toMatchObject({ denied: true });
		expect((await stored(workflow.id)).activeVersionId).toBeNull();
		expect(await provenance.findForWorkflow(workflow.id)).toBeNull();
		expect(await temporaryWorkflows.existsForWorkflow(workflow.id)).toBe(true);
	});

	it('does not turn on a workflow that changed after the card, and changes nothing', async () => {
		const workflow = await createTemporaryWorkflow();

		const result = proposeAndAnswer(
			workflow.id,
			{ kind: 'capabilityDecision', approved: true, values: { target: 'local', activate: true } },
			async () => {
				// Another save of the draft gives the workflow a new saved version.
				await workflowRepository.update(workflow.id, { versionId: randomUUID() });
			},
		);

		await expect(result).rejects.toThrow('changed after the automation was proposed');
		expect((await stored(workflow.id)).activeVersionId).toBeNull();
		expect(await provenance.findForWorkflow(workflow.id)).toBeNull();
		expect(await temporaryWorkflows.existsForWorkflow(workflow.id)).toBe(true);
	});

	it('shows the schedule that n8n reads from an interval rule, not the cron of the model', async () => {
		const [scheduleNode, ...otherNodes] = SCHEDULE_NODES;
		const dailyAt8 = { rule: { interval: [{ field: 'days', triggerAtHour: 8 }] } };
		const workflow = await createTemporaryWorkflow({
			nodes: [{ ...scheduleNode, parameters: dailyAt8 }, ...otherNodes],
			settings: { timezone: 'Asia/Kolkata' },
		});

		const { card, output } = await proposeAndAnswer(workflow.id, {
			kind: 'capabilityDecision',
			approved: true,
			values: { target: 'local', activate: false },
		});

		expect(card.trigger).toEqual({ kind: 'schedule', cron: '0 8 * * *', timezone: 'Asia/Kolkata' });
		expect(output).toMatchObject({
			kept: true,
			warnings: [
				'Ignored the cron expression "0 8 * * 1-5", because the schedule trigger uses the cron expression "0 8 * * *".',
			],
		});
	});

	it('does not restore a workflow that was archived after the card, and changes nothing', async () => {
		const workflow = await createTemporaryWorkflow();

		const result = proposeAndAnswer(
			workflow.id,
			{ kind: 'capabilityDecision', approved: true, values: { target: 'local', activate: false } },
			async () => {
				await Container.get(WorkflowService).archive(owner, workflow.id);
			},
		);

		await expect(result).rejects.toThrow(
			'was archived or changed after the automation was proposed',
		);
		expect((await stored(workflow.id)).isArchived).toBe(true);
		expect(await provenance.findForWorkflow(workflow.id)).toBeNull();
		expect(await temporaryWorkflows.existsForWorkflow(workflow.id)).toBe(true);
	});

	it('keeps nothing when "Turn it on" meets a workflow that someone edits', async () => {
		const workflow = await createTemporaryWorkflow({ isArchived: true });
		const collaborationState = Container.get(CollaborationState);

		try {
			const result = proposeAndAnswer(
				workflow.id,
				{ kind: 'capabilityDecision', approved: true, values: { target: 'local', activate: true } },
				async () => {
					await collaborationState.setWriteLock(workflow.id, 'editor-tab', owner.id);
				},
			);

			await expect(result).rejects.toThrow('being edited by a user in the editor');
			const after = await stored(workflow.id);
			expect(after.isArchived).toBe(true);
			expect(after.activeVersionId).toBeNull();
			expect(await temporaryWorkflows.existsForWorkflow(workflow.id)).toBe(true);
			expect(await provenance.findForWorkflow(workflow.id)).toBeNull();
		} finally {
			await collaborationState.releaseWriteLock(workflow.id);
		}
	});

	it('restores an archived workflow and turns it on', async () => {
		const workflow = await createWorkflowWithHistory(
			{
				name: 'Old digest',
				nodes: SCHEDULE_NODES,
				connections: SCHEDULE_CONNECTIONS,
				isArchived: true,
			},
			owner,
		);

		const { card, output } = await proposeAndAnswer(workflow.id, {
			kind: 'capabilityDecision',
			approved: true,
			values: { target: 'local', activate: true },
		});

		expect(card.archived).toBe(true);
		expect(output).toMatchObject({ active: true, kept: true });
		const after = await stored(workflow.id);
		expect(after.isArchived).toBe(false);
		// Restoring saves a new version with the same content. That version goes live.
		expect(after.versionId).not.toBe(workflow.versionId);
		expect(after.activeVersionId).toBe(after.versionId);
	});
});
