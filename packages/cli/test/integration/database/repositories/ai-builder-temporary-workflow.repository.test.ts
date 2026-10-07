import { createTeamProject, createWorkflow, testDb, testModules } from '@n8n/backend-test-utils';
import { AiBuilderTemporaryWorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { randomUUID } from 'node:crypto';

import { AgentExecutionThreadRepository } from '@/modules/agents/repositories/agent-execution-thread.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';

describe('AiBuilderTemporaryWorkflowRepository.findThreadIdForWorkflow', () => {
	let markers: AiBuilderTemporaryWorkflowRepository;

	beforeAll(async () => {
		// The marker refers to an Agents session, so the Agents tables must exist.
		await testModules.loadModules(['agents']);
		await testDb.init();
		markers = Container.get(AiBuilderTemporaryWorkflowRepository);
	});
	afterAll(async () => await testDb.terminate());

	const createSession = async (projectId: string) => {
		const agents = Container.get(AgentRepository);
		const threads = Container.get(AgentExecutionThreadRepository);
		const agent = await agents.save(
			agents.create({
				id: randomUUID(),
				name: 'Agent',
				projectId,
				integrations: [],
				tools: {},
				skills: {},
			}),
		);
		const id = randomUUID();
		await threads.save(
			threads.create({
				id,
				agentId: agent.id,
				agentName: agent.name,
				projectId,
				accessScope: 'project',
				ownerId: null,
				parentThreadId: null,
			}),
		);
		return id;
	};

	it('returns the chat that marked the workflow', async () => {
		const project = await createTeamProject();
		const workflow = await createWorkflow({}, project);
		const other = await createWorkflow({}, project);
		const threadId = await createSession(project.id);
		const otherThreadId = await createSession(project.id);
		await markers.mark(workflow.id, threadId);
		await markers.mark(other.id, otherThreadId);

		expect(await markers.findThreadIdForWorkflow(workflow.id)).toBe(threadId);
	});

	it('returns null when the workflow has no marker', async () => {
		const project = await createTeamProject();
		const workflow = await createWorkflow({}, project);
		const threadId = await createSession(project.id);
		await markers.mark(workflow.id, threadId);
		await markers.unmark(workflow.id);

		expect(await markers.findThreadIdForWorkflow(workflow.id)).toBeNull();
		expect(await markers.findThreadIdForWorkflow(randomUUID())).toBeNull();
	});
});
