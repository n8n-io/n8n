import type { User, UserRepository } from '@n8n/db';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import type { AgentExecutionService } from '../../agent-execution.service';
import type { AgentCheckpoint } from '../../entities/agent-checkpoint.entity';
import type { AgentExecution } from '../../entities/agent-execution.entity';
import type { AgentExecutionThread } from '../../entities/agent-execution-thread.entity';
import type { AgentCheckpointRepository } from '../../repositories/agent-checkpoint.repository';
import { SystemAgentRegistry } from '../system-agent-registry';
import { findSuspendedToolCall, SystemAgentThreadGuard } from '../system-agent-thread-guard';
import type { SystemAgentProvider, SystemAgentSharingPolicy } from '../system-agent.types';

const AGENT_ID = 'test-assistant';

const makeUser = (id: string, firstName: string, lastName: string) =>
	mock<User>({ id, firstName, lastName, disabled: false });
const owner = makeUser('owner-1', 'Ada', 'Lovelace');
const teammate = makeUser('teammate-1', 'Grace', 'Hopper');

function makeThread(overrides: Partial<AgentExecutionThread> = {}): AgentExecutionThread {
	return mock<AgentExecutionThread>({
		id: 'thread-1',
		agentId: AGENT_ID,
		projectId: 'project-1',
		accessScope: 'project',
		ownerId: owner.id,
		...overrides,
	});
}

function suspendedState(toolCallId = 'tc-1', status = 'suspended') {
	return JSON.stringify({
		status,
		pendingToolCalls: {
			[toolCallId]: {
				toolCallId,
				toolName: 'deploy_workflow',
				input: { workflowId: 'workflow-1' },
				suspended: true,
				suspendPayload: { requestId: 'r-1', message: 'Deploy?' },
				resumeSchema: {},
				runId: 'run-1',
			},
		},
	});
}

function makeCheckpoint(overrides: Partial<AgentCheckpoint> = {}): AgentCheckpoint {
	return mock<AgentCheckpoint>({
		runId: 'run-1',
		agentId: AGENT_ID,
		threadId: 'thread-1',
		expired: false,
		state: suspendedState(),
		...overrides,
	});
}

function setup(options: { sharing?: boolean } = {}) {
	const registry = new SystemAgentRegistry();
	const checkpoints = mock<AgentCheckpointRepository>();
	const executions = mock<AgentExecutionService>();
	const users = mock<UserRepository>();
	const sharing = mock<SystemAgentSharingPolicy>();
	const provider = mock<SystemAgentProvider>({ agentId: AGENT_ID, name: 'Test Assistant' });
	Object.defineProperty(provider, 'sharing', {
		value: options.sharing === false ? undefined : sharing,
	});
	provider.authorize.mockResolvedValue(true);
	registry.register(provider);

	const thread = makeThread();
	executions.findThreadById.mockResolvedValue(thread);
	checkpoints.findByRunIdAndAgentId.mockResolvedValue(makeCheckpoint());
	users.findByIdWithRole.mockResolvedValue(owner);
	sharing.canRead.mockResolvedValue(true);
	sharing.authorizeAnswer.mockImplementation(async (_user, _thread, _tool, data) => ({
		restricted: data,
	}));

	const guard = new SystemAgentThreadGuard(registry, checkpoints, executions, users);
	return { guard, checkpoints, executions, users, sharing, provider, thread };
}

const answerFrom = (user: User, overrides: Record<string, unknown> = {}) => ({
	agentId: AGENT_ID,
	user,
	projectId: 'project-1',
	runId: 'run-1',
	toolCallId: 'tc-1',
	resumeData: { approved: true },
	...overrides,
});

describe('findSuspendedToolCall', () => {
	it('finds the suspended call of a parked checkpoint', () => {
		expect(findSuspendedToolCall(makeCheckpoint(), 'tc-1')).toMatchObject({
			toolCallId: 'tc-1',
			toolName: 'deploy_workflow',
		});
	});

	it.each([
		['no checkpoint', null],
		['an expired checkpoint', makeCheckpoint({ expired: true })],
		['a checkpoint without state', makeCheckpoint({ state: null })],
		['a running checkpoint', makeCheckpoint({ state: suspendedState('tc-1', 'running') })],
		['a checkpoint that waits for another call', makeCheckpoint({ state: suspendedState('tc-2') })],
		['a state that is not JSON', makeCheckpoint({ state: '{not json' })],
	])('finds nothing for %s', (_label, checkpoint) => {
		expect(findSuspendedToolCall(checkpoint, 'tc-1')).toBeUndefined();
	});

	it('finds nothing for a call that does not wait any more', () => {
		const state = JSON.stringify({
			status: 'suspended',
			pendingToolCalls: {
				'tc-1': { toolCallId: 'tc-1', toolName: 'x', input: {}, suspended: false },
			},
		});
		expect(findSuspendedToolCall(makeCheckpoint({ state }), 'tc-1')).toBeUndefined();
	});
});

describe('SystemAgentThreadGuard.checkSend', () => {
	it('checks nothing for a new session', async () => {
		const { guard, executions } = setup();

		await expect(guard.checkSend({ agentId: AGENT_ID, user: teammate })).resolves.toBeUndefined();
		expect(executions.findThreadById).not.toHaveBeenCalled();
	});

	it('lets the owner and a session id that has no thread yet through', async () => {
		const { guard, executions } = setup();

		await expect(
			guard.checkSend({ agentId: AGENT_ID, user: owner, sessionId: 'thread-1' }),
		).resolves.toBeUndefined();
		executions.findThreadById.mockResolvedValueOnce(null);
		await expect(
			guard.checkSend({ agentId: AGENT_ID, user: teammate, sessionId: 'new' }),
		).resolves.toBeUndefined();
	});

	it('answers a reader with the error of the sharing policy', async () => {
		const { guard, sharing, thread } = setup();
		const error = new ForbiddenError('Only Ada Lovelace can send messages here.');
		sharing.sendError.mockResolvedValue(error);

		await expect(
			guard.checkSend({ agentId: AGENT_ID, user: teammate, sessionId: 'thread-1' }),
		).rejects.toBe(error);
		expect(sharing.canRead).toHaveBeenCalledWith(teammate, thread);
	});

	it('answers 404 to a user who cannot read the thread', async () => {
		const { guard, sharing } = setup();
		sharing.canRead.mockResolvedValue(false);

		await expect(
			guard.checkSend({ agentId: AGENT_ID, user: teammate, sessionId: 'thread-1' }),
		).rejects.toThrow(NotFoundError);
		expect(sharing.sendError).not.toHaveBeenCalled();
	});

	it('answers 404 for a thread of another agent without asking the policy', async () => {
		const { guard, sharing, executions } = setup();
		executions.findThreadById.mockResolvedValue(makeThread({ agentId: 'other-agent' }));

		await expect(
			guard.checkSend({ agentId: AGENT_ID, user: teammate, sessionId: 'thread-1' }),
		).rejects.toThrow(NotFoundError);
		expect(sharing.canRead).not.toHaveBeenCalled();
	});

	it('answers 404 when the agent has no sharing policy', async () => {
		const { guard } = setup({ sharing: false });

		await expect(
			guard.checkSend({ agentId: AGENT_ID, user: teammate, sessionId: 'thread-1' }),
		).rejects.toThrow(NotFoundError);
	});
});

describe('SystemAgentThreadGuard.checkAnswer', () => {
	it('lets the owner answer with the answer as it is', async () => {
		const { guard, sharing, users } = setup();

		await expect(guard.checkAnswer(answerFrom(owner))).resolves.toEqual({
			agentId: AGENT_ID,
			threadId: 'thread-1',
			runId: 'run-1',
			toolCallId: 'tc-1',
			resumeData: { approved: true },
			runAs: owner,
			answeredBy: { id: 'owner-1', name: 'Ada Lovelace' },
		});
		expect(sharing.authorizeAnswer).not.toHaveBeenCalled();
		expect(users.findByIdWithRole).not.toHaveBeenCalled();
	});

	it('runs the answer of a teammate as the owner, with the answer the policy returns', async () => {
		const { guard, sharing, users, thread, provider } = setup();

		const answer = await guard.checkAnswer(answerFrom(teammate));

		expect(sharing.authorizeAnswer).toHaveBeenCalledWith(
			teammate,
			thread,
			{
				toolName: 'deploy_workflow',
				input: { workflowId: 'workflow-1' },
				suspendPayload: { requestId: 'r-1', message: 'Deploy?' },
			},
			{ approved: true },
		);
		expect(users.findByIdWithRole).toHaveBeenCalledWith('owner-1');
		expect(provider.authorize).toHaveBeenCalledWith(owner, 'project-1');
		expect(answer).toMatchObject({
			resumeData: { restricted: { approved: true } },
			runAs: owner,
			answeredBy: { id: 'teammate-1', name: 'Grace Hopper' },
		});
	});

	it('passes on the error of the policy for a teammate who may not answer', async () => {
		const { guard, sharing, users } = setup();
		sharing.authorizeAnswer.mockRejectedValue(
			new ForbiddenError('Only editors in Finance can approve this.'),
		);

		await expect(guard.checkAnswer(answerFrom(teammate))).rejects.toThrow(
			'Only editors in Finance can approve this.',
		);
		expect(users.findByIdWithRole).not.toHaveBeenCalled();
	});

	it.each([
		['a disabled owner', { ...owner, disabled: true }, true],
		['an owner who lost access to the project', owner, false],
		['a deleted owner', null, true],
	])('refuses a teammate answer for %s', async (_label, stored, authorized) => {
		const { guard, users, provider } = setup();
		users.findByIdWithRole.mockResolvedValue(stored as User | null);
		provider.authorize.mockResolvedValue(authorized);

		const refusal = guard.checkAnswer(answerFrom(teammate));
		await expect(refusal).rejects.toThrow(ForbiddenError);
		await expect(refusal).rejects.toThrow('The owner of this chat can no longer run it');
	});

	it('answers 404 to a user who cannot read the thread, before any other check', async () => {
		const { guard, sharing, executions } = setup();
		sharing.canRead.mockResolvedValue(false);

		await expect(
			guard.checkAnswer(answerFrom(teammate, { projectId: 'other', toolCallId: 'gone' })),
		).rejects.toThrow(NotFoundError);
		expect(executions.getThreadDetail).not.toHaveBeenCalled();
	});

	it.each([
		['an unknown run', () => null],
		['a checkpoint without thread', () => makeCheckpoint({ threadId: null })],
	])('answers 404 for %s', async (_label, checkpoint) => {
		const { guard, checkpoints } = setup();
		checkpoints.findByRunIdAndAgentId.mockResolvedValue(checkpoint());

		await expect(guard.checkAnswer(answerFrom(owner))).rejects.toThrow(NotFoundError);
	});

	it('answers 404 for an agent id without a provider or a thread of another agent', async () => {
		const { guard, executions } = setup();

		await expect(guard.checkAnswer(answerFrom(owner, { agentId: 'unknown' }))).rejects.toThrow(
			NotFoundError,
		);
		executions.findThreadById.mockResolvedValue(makeThread({ agentId: 'other-agent' }));
		await expect(guard.checkAnswer(answerFrom(owner))).rejects.toThrow(NotFoundError);
	});

	it('answers 400 when the request names another project than the thread', async () => {
		const { guard } = setup();

		await expect(guard.checkAnswer(answerFrom(owner, { projectId: 'project-2' }))).rejects.toThrow(
			BadRequestError,
		);
	});

	it('answers 409 with the name of the user who answered a card that waits no more', async () => {
		const { guard, checkpoints, executions, thread } = setup();
		checkpoints.findByRunIdAndAgentId.mockResolvedValue(
			makeCheckpoint({ expired: true, state: null }),
		);
		const answered = (name: string, toolCallId = 'tc-1') => ({
			type: 'hitl-response' as const,
			toolCallId,
			response: { approved: true },
			timestamp: 1,
			respondedBy: { id: `${name}-id`, name },
		});
		executions.getThreadDetail.mockResolvedValue({
			thread,
			executions: [
				{ timeline: [answered('Ada Lovelace'), answered('Other', 'tc-2')] } as AgentExecution,
				{ timeline: null } as AgentExecution,
				{ timeline: [answered('Grace Hopper')] } as AgentExecution,
			],
		});

		const error = await guard.checkAnswer(answerFrom(owner)).catch((caught: unknown) => caught);

		expect(error).toBeInstanceOf(ConflictError);
		expect(error).toMatchObject({
			message: 'This request was already answered',
			meta: { answeredBy: { name: 'Grace Hopper' } },
		});
		expect(executions.getThreadDetail).toHaveBeenCalledWith(
			'thread-1',
			'project-1',
			AGENT_ID,
			'owner-1',
		);
	});

	it('answers 409 without a name when no recorded answer names a user', async () => {
		const { guard, checkpoints, executions, thread } = setup();
		checkpoints.findByRunIdAndAgentId.mockResolvedValue(
			makeCheckpoint({ state: suspendedState('tc-9') }),
		);
		executions.getThreadDetail.mockResolvedValue({
			thread,
			executions: [
				{
					timeline: [{ type: 'hitl-response', toolCallId: 'tc-1', response: {}, timestamp: 1 }],
				} as AgentExecution,
			],
		});

		const error = await guard.checkAnswer(answerFrom(owner)).catch((caught: unknown) => caught);

		expect(error).toBeInstanceOf(ConflictError);
		expect((error as ConflictError).meta).toBeUndefined();
	});
});
