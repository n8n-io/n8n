/**
 * An agent turn keeps a copy of the output of the workflow executions that its
 * workflow tools start. The thread API must redact that copy for each reader
 * the same way the executions API redacts the source execution.
 */
import {
	createTeamProject,
	createWorkflow,
	linkUserToProject,
	testDb,
} from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { stringify } from 'flatted';
import { createRunExecutionData, type IWorkflowBase } from 'n8n-workflow';
import { generateNanoId } from '@n8n/utils/generate-nano-id';
import { v4 as uuid } from 'uuid';

import { AgentChatAttachment } from '@/modules/agents/entities/agent-chat-attachment.entity';
import { AgentExecutionThreadRepository } from '@/modules/agents/repositories/agent-execution-thread.repository';
import { AgentExecutionRepository } from '@/modules/agents/repositories/agent-execution.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import type { TimelineEvent } from '@/modules/agents/execution-recorder';

import { createAgent } from '../shared/db/agents';
import { createExecution } from '../shared/db/executions';
import { createMember, createOwner } from '../shared/db/users';
import { setupTestServer } from '../shared/utils';

const MARKER = ['MARKER', 'RUNTIME', 'VALUE'].join('-');

const testServer = setupTestServer({
	endpointGroups: ['executions'],
	modules: ['agents', 'redaction'],
	enabledFeatures: ['feat:dataRedaction', 'feat:projectRole:admin', 'feat:projectRole:viewer'],
});

let owner: User;
let viewer: User;
let projectAdmin: User;
let project: Project;
let agentId: string;

beforeAll(async () => {
	owner = await createOwner();
});

beforeEach(async () => {
	testServer.license.reset();
	testServer.license.enable('feat:dataRedaction');
	testServer.license.enable('feat:projectRole:admin');
	testServer.license.enable('feat:projectRole:viewer');

	project = await createTeamProject('Agent redaction', owner);
	viewer = await createMember();
	projectAdmin = await createMember();
	await linkUserToProject(viewer, project, 'project:viewer');
	await linkUserToProject(projectAdmin, project, 'project:admin');

	agentId = (await createAgent({ id: uuid(), name: 'Agent', projectId: project.id })).id;
});

afterEach(async () => {
	await Container.get(DataSource).getRepository(AgentChatAttachment).delete({});
	await Container.get(AgentExecutionRepository).delete({});
	await Container.get(AgentExecutionThreadRepository).delete({});
	await Container.get(AgentRepository).delete({});
	await testDb.truncate(['ExecutionEntity', 'SharedWorkflow', 'WorkflowEntity']);
});

async function createToolWorkflow(redactionPolicy: 'all' | 'none') {
	return await createWorkflow({ name: 'Tool workflow', settings: { redactionPolicy } }, project);
}

async function createToolExecution(workflow: IWorkflowBase) {
	const data = createRunExecutionData({
		resultData: {
			runData: {
				Generate: [
					{
						startTime: 0,
						executionIndex: 0,
						executionTime: 0,
						executionStatus: 'success',
						source: [],
						data: { main: [[{ json: { result_value: MARKER } }]] },
					},
				],
			},
		},
	});
	return await createExecution({ data: stringify(data), mode: 'integrated' }, workflow);
}

/** A task thread with a turn that ran the workflow tool, and a later turn. */
async function createTaskThread(workflowId: string, executionId: string) {
	const threadId = `task-${uuid()}`;
	const threads = Container.get(AgentExecutionThreadRepository);
	await threads.save(
		threads.create({
			id: threadId,
			agentId,
			agentName: 'Agent',
			projectId: project.id,
			accessScope: 'project',
			ownerId: null,
		}),
	);

	const toolTurn: TimelineEvent[] = [
		{
			type: 'tool-call',
			kind: 'workflow',
			name: 'run_wf',
			toolCallId: 'call-1',
			input: {},
			output: { executionId, status: 'success', data: { Generate: [{ result_value: MARKER }] } },
			startTime: 1,
			endTime: 2,
			success: true,
			workflowId,
			workflowExecutionId: executionId,
		},
		{ type: 'text', content: `The workflow returned ${MARKER}.`, timestamp: 3 },
	];
	const laterTurn: TimelineEvent[] = [
		{ type: 'text', content: `As before, the value is ${MARKER}.`, timestamp: 5 },
	];

	const executions = Container.get(AgentExecutionRepository);
	const turns = [
		{ timeline: toolTurn, createdAt: new Date('2026-11-26T10:00:00.000Z') },
		{ timeline: laterTurn, createdAt: new Date('2026-11-26T10:05:00.000Z') },
	];
	for (const { timeline, createdAt } of turns) {
		const id = uuid();
		await executions.save(executions.create({ id, threadId, status: 'success', timeline }));
		// Turns of a real thread are minutes apart. Saved in one tick, they would tie on createdAt.
		await executions.update({ id }, { createdAt });
	}
	return threadId;
}

async function saveThread(threadId: string, parentThreadId: string | null = null) {
	const threads = Container.get(AgentExecutionThreadRepository);
	await threads.save(
		threads.create({
			id: threadId,
			agentId,
			agentName: 'Agent',
			projectId: project.id,
			accessScope: 'project',
			ownerId: null,
			parentThreadId,
		}),
	);
}

async function saveTurn(
	threadId: string,
	timeline: TimelineEvent[],
	createdAt: Date,
	parentExecutionId: string | null = null,
) {
	const executions = Container.get(AgentExecutionRepository);
	const id = uuid();
	await executions.save(
		executions.create({ id, threadId, status: 'success', timeline, parentExecutionId }),
	);
	await executions.update({ id }, { createdAt });
	return id;
}

async function saveFile(threadId: string, source: string, createdAt: Date) {
	const files = Container.get(DataSource).getRepository(AgentChatAttachment);
	const id = generateNanoId();
	await files.save(
		files.create({
			id,
			agentId,
			projectId: project.id,
			threadId,
			createdByThreadId: threadId,
			resourceId: null,
			binaryDataId: `filesystem-v2:agents/${agentId}/attachments/${id}/binary_data/${id}`,
			fileName: `${source}-file.txt`,
			mimeType: 'text/plain',
			fileSizeBytes: 4,
			source,
		}),
	);
	await files.update({ id }, { createdAt });
	return id;
}

const threadUrl = (threadId: string) =>
	`/projects/${project.id}/agents/v2/${agentId}/threads/${threadId}`;

describe('GET /projects/:projectId/agents/v2/:agentId/threads/:threadId', () => {
	it('should redact workflow tool output and later replies for a project viewer', async () => {
		const workflow = await createToolWorkflow('all');
		const execution = await createToolExecution(workflow);
		const threadId = await createTaskThread(workflow.id, execution.id);

		const response = await testServer.authAgentFor(viewer).get(threadUrl(threadId)).expect(200);

		expect(JSON.stringify(response.body)).not.toContain(MARKER);
		const turns = response.body.data.executions;
		expect(turns).toHaveLength(2);
		for (const turn of turns) {
			expect(turn.redaction).toEqual({
				isRedacted: true,
				reason: 'workflow_redaction_policy',
				canReveal: false,
			});
		}
		expect(turns[0].timeline[0]).toMatchObject({
			type: 'tool-call',
			name: 'run_wf',
			workflowExecutionId: execution.id,
			redacted: true,
		});
	});

	it('should redact the source execution for the same viewer (control)', async () => {
		const workflow = await createToolWorkflow('all');
		const execution = await createToolExecution(workflow);

		const response = await testServer
			.authAgentFor(viewer)
			.get(`/executions/${execution.id}`)
			.expect(200);

		expect(JSON.stringify(response.body)).not.toContain(MARKER);
	});

	it('should redact by default for a project admin and allow a reveal', async () => {
		const workflow = await createToolWorkflow('all');
		const execution = await createToolExecution(workflow);
		const threadId = await createTaskThread(workflow.id, execution.id);

		const response = await testServer
			.authAgentFor(projectAdmin)
			.get(threadUrl(threadId))
			.expect(200);

		expect(JSON.stringify(response.body)).not.toContain(MARKER);
		expect(response.body.data.executions[0].redaction.canReveal).toBe(true);
	});

	it('should not redact when the tool workflow does not redact its execution data', async () => {
		const workflow = await createToolWorkflow('none');
		const execution = await createToolExecution(workflow);
		const threadId = await createTaskThread(workflow.id, execution.id);

		const response = await testServer.authAgentFor(viewer).get(threadUrl(threadId)).expect(200);

		expect(JSON.stringify(response.body)).toContain(MARKER);
		expect(response.body.data.executions[0].redaction).toBeUndefined();
	});

	it('should redact for a viewer when the source execution was pruned and the workflow still redacts', async () => {
		const workflow = await createToolWorkflow('all');
		const threadId = await createTaskThread(workflow.id, '999999');

		const response = await testServer.authAgentFor(viewer).get(threadUrl(threadId)).expect(200);

		expect(JSON.stringify(response.body)).not.toContain(MARKER);
	});
});

describe('GET /projects/:projectId/agents/v2/:agentId/chat/:threadId/messages', () => {
	it('should redact workflow tool output in the chat history for a project viewer', async () => {
		const workflow = await createToolWorkflow('all');
		const execution = await createToolExecution(workflow);
		const threadId = await createTaskThread(workflow.id, execution.id);

		const response = await testServer
			.authAgentFor(viewer)
			.get(`/projects/${project.id}/agents/v2/${agentId}/chat/${threadId}/messages`);

		// The history route may refuse a viewer outright. Either outcome keeps the turn content hidden.
		expect(JSON.stringify(response.body)).not.toContain(MARKER);
	});
});

describe('reveal of redacted agent turns', () => {
	it('should return the turns unredacted for a project admin who asks for a reveal', async () => {
		const workflow = await createToolWorkflow('all');
		const execution = await createToolExecution(workflow);
		const threadId = await createTaskThread(workflow.id, execution.id);

		const response = await testServer
			.authAgentFor(projectAdmin)
			.get(threadUrl(threadId))
			.query({ redactExecutionData: 'false' })
			.expect(200);

		expect(JSON.stringify(response.body)).toContain(MARKER);
		expect(response.body.data.executions[0].redaction).toBeUndefined();
	});

	it('should refuse a reveal for a project viewer', async () => {
		const workflow = await createToolWorkflow('all');
		const execution = await createToolExecution(workflow);
		const threadId = await createTaskThread(workflow.id, execution.id);

		const response = await testServer
			.authAgentFor(viewer)
			.get(threadUrl(threadId))
			.query({ redactExecutionData: 'false' });

		expect(response.status).toBe(403);
		expect(JSON.stringify(response.body)).not.toContain(MARKER);
	});
});

describe('chat messages of redacted agent turns', () => {
	it('should report the redaction in the messages response for a project admin', async () => {
		const workflow = await createToolWorkflow('all');
		const execution = await createToolExecution(workflow);
		const threadId = await createTaskThread(workflow.id, execution.id);

		const response = await testServer
			.authAgentFor(projectAdmin)
			.get(`/projects/${project.id}/agents/v2/${agentId}/chat/${threadId}/messages`)
			.expect(200);

		expect(JSON.stringify(response.body)).not.toContain(MARKER);
		expect(response.body.data.redaction).toEqual({ isRedacted: true, canReveal: true });
	});
});

describe('files of redacted agent turns', () => {
	async function threadWithFiles() {
		const workflow = await createToolWorkflow('all');
		const execution = await createToolExecution(workflow);
		const threadId = `task-${uuid()}`;
		await saveThread(threadId);
		await saveTurn(threadId, [], new Date('2026-11-26T09:00:00.000Z'));
		await saveTurn(
			threadId,
			[
				{
					type: 'tool-call',
					kind: 'workflow',
					name: 'run_wf',
					toolCallId: 'call-1',
					input: {},
					output: { executionId: execution.id },
					startTime: 1,
					endTime: 2,
					success: true,
					workflowId: workflow.id,
					workflowExecutionId: execution.id,
				},
			],
			new Date('2026-11-26T10:00:00.000Z'),
		);
		const earlierToolFile = await saveFile(threadId, 'tool', new Date('2026-11-26T09:00:05.000Z'));
		const laterToolFile = await saveFile(threadId, 'tool', new Date('2026-11-26T10:00:05.000Z'));
		const laterUpload = await saveFile(threadId, 'chat', new Date('2026-11-26T10:10:00.000Z'));
		return { threadId, earlierToolFile, laterToolFile, laterUpload };
	}

	it('should leave out generated files from redacted turns in the files list', async () => {
		const { threadId, earlierToolFile, laterToolFile, laterUpload } = await threadWithFiles();

		const response = await testServer
			.authAgentFor(viewer)
			.get(`/projects/${project.id}/agents/v2/${agentId}/chat/${threadId}/files`)
			.expect(200);

		const ids = response.body.data.files.map((file: { fileId: string }) => file.fileId);
		expect(ids).toEqual(expect.arrayContaining([earlierToolFile, laterUpload]));
		expect(ids).not.toContain(laterToolFile);
	});

	it('should not find a generated file of a redacted turn on download', async () => {
		const { threadId, laterToolFile } = await threadWithFiles();

		await testServer
			.authAgentFor(viewer)
			.get(`/projects/${project.id}/agents/v2/${agentId}/chat/attachments/${laterToolFile}`)
			.query({ threadId })
			.expect(404);
	});
});

describe('turns that delegate to a sub-agent', () => {
	it('should redact a turn whose sub-agent ran a redacted workflow tool', async () => {
		const workflow = await createToolWorkflow('all');
		const execution = await createToolExecution(workflow);
		const threadId = `task-${uuid()}`;
		const childThreadId = `sub-${uuid()}`;
		await saveThread(threadId);
		await saveThread(childThreadId, threadId);
		const parentTurn = await saveTurn(
			threadId,
			[{ type: 'text', content: `The sub-agent reported ${MARKER}.`, timestamp: 3 }],
			new Date('2026-11-26T10:00:00.000Z'),
		);
		await saveTurn(
			childThreadId,
			[
				{
					type: 'tool-call',
					kind: 'workflow',
					name: 'run_wf',
					toolCallId: 'call-1',
					input: {},
					output: { executionId: execution.id, data: { Generate: [{ result_value: MARKER }] } },
					startTime: 1,
					endTime: 2,
					success: true,
					workflowId: workflow.id,
					workflowExecutionId: execution.id,
				},
			],
			new Date('2026-11-26T10:00:01.000Z'),
			parentTurn,
		);

		const response = await testServer.authAgentFor(viewer).get(threadUrl(threadId)).expect(200);

		expect(JSON.stringify(response.body)).not.toContain(MARKER);
		expect(response.body.data.executions[0].redaction).toMatchObject({ isRedacted: true });
	});
});
