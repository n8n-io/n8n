import type { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';
import type { z } from 'zod';

import type { CredentialsService } from '@/credentials/credentials.service';
import type { AgentSessionDetail } from '@/modules/agents/agent-context.contracts';
import type { AgentContextService } from '@/modules/agents/agent-context.service';

import type { AgentOnlineCheckHistoryRepository } from '../agent-online-check-history.repository';
import type { EvalAgentExecutionService } from '@/modules/instance-ai/eval/agent-execution.service';
import { AgentOnlineChecksService } from '../agent-online-checks.service';

const { generate, structuredOutput } = vi.hoisted(() => ({
	generate: vi.fn(),
	structuredOutput: vi.fn(),
}));

vi.mock('@/credentials/credentials.service', () => ({
	CredentialsService: class {},
}));
vi.mock('@/modules/agents/agent-context.service', () => ({
	AgentContextService: class {},
}));
vi.mock('@/modules/agents/json-config/model-config', () => ({
	resolveCredentialAwareModelConfig: vi.fn().mockResolvedValue({ id: 'openai/test-model' }),
}));
vi.mock('@/modules/agents/utils/agent-credential-provider', () => ({
	createAgentCredentialProvider: vi.fn(),
}));
vi.mock('../agent-online-check-history.repository', () => ({
	AgentOnlineCheckHistoryRepository: class {},
}));
vi.mock('@/modules/instance-ai/eval/agent-execution.service', () => ({
	EvalAgentExecutionService: class {},
}));
vi.mock('@n8n/agents', () => ({
	Agent: class {
		model() {
			return this;
		}
		instructions() {
			return this;
		}
		structuredOutput(schema: z.ZodType) {
			structuredOutput(schema);
			return this;
		}
		generate = generate;
	},
}));

describe('AgentOnlineChecksService', () => {
	const context = mock<AgentContextService>();
	const logger = mock<Logger>();
	const user = mock<User>();
	const history = mock<AgentOnlineCheckHistoryRepository>();
	const service = new AgentOnlineChecksService(
		context,
		mock<CredentialsService>(),
		logger,
		history,
		mock<EvalAgentExecutionService>(),
	);

	beforeEach(() => {
		vi.clearAllMocks();
		history.findSessionCase.mockResolvedValue(null);
		history.findCase.mockResolvedValue(null);
		context.readOnlineRubric.mockResolvedValue(null);
		context.readArtifact.mockResolvedValue({
			config: {
				name: 'Outreach',
				model: 'openai/test-model',
				credential: 'credential-1',
				instructions: 'Keep the response playful.',
			},
			skills: {},
			configHash: 'hash',
		});
		context.createReader.mockReturnValue({
			lookup: vi.fn().mockResolvedValue({ sessions: [] }),
		} as ReturnType<AgentContextService['createReader']>);
	});

	it('reports a returned model error instead of showing only built-in checks', async () => {
		const error = new Error('Model request failed');
		generate.mockResolvedValue({ finishReason: 'error', error });

		await expect(service.run(user, 'project-1', 'agent-1')).rejects.toThrow(
			'Could not generate checks',
		);
		expect(logger.warn).toHaveBeenCalledWith('[AgentOnlineChecks] Model call failed', {
			error: error.message,
		});
		expect(context.createReader).not.toHaveBeenCalled();
	});

	it('rejects unreadable output before checking sessions', async () => {
		generate.mockResolvedValue({ structuredOutput: {} });

		await expect(service.run(user, 'project-1', 'agent-1')).rejects.toThrow(
			'Could not generate checks',
		);
		expect(context.createReader).not.toHaveBeenCalled();
	});

	it('generates a tone check with a required nullable applicability field', async () => {
		const check = {
			question: 'Was the response playful?',
			reason: 'The author requests a playful tone.',
			quote: 'Keep the response playful.',
			appliesWhen: null,
		};
		generate.mockResolvedValue({ structuredOutput: { checks: [check] } });

		const report = await service.run(user, 'project-1', 'agent-1');

		expect(context.saveOnlineRubric).toHaveBeenCalledWith(
			user,
			'project-1',
			'agent-1',
			expect.objectContaining({ checks: report.checks }),
		);
		expect(report.checks).toContainEqual(
			expect.objectContaining({ kind: 'promise', question: check.question }),
		);
		const schema: z.ZodType = structuredOutput.mock.calls[0][0];
		expect(schema.safeParse({ checks: [check] }).success).toBe(true);
		const { appliesWhen: _, ...missingField } = check;
		expect(schema.safeParse({ checks: [missingField] }).success).toBe(false);
	});
	it('reuses a saved rubric without generating it again', async () => {
		const rubric = { checks: [], generatedAt: new Date().toISOString() };
		context.readOnlineRubric.mockResolvedValue(rubric);
		const report = await service.run(user, 'project-1', 'agent-1');
		expect(report.checks).toEqual(rubric.checks);
		expect(generate).not.toHaveBeenCalled();
		expect(context.saveOnlineRubric).not.toHaveBeenCalled();
	});
	it('reads only the selected session and removes duplicate IDs', async () => {
		context.readOnlineRubric.mockResolvedValue({
			checks: [],
			generatedAt: new Date().toISOString(),
		});
		context.createReader.mockReturnValue({
			lookup: vi.fn().mockResolvedValue({
				sessions: [
					{ threadId: 'thread-1', title: 'First', origin: 'chat', updatedAt: '2026-10-29' },
					{ threadId: 'thread-2', title: 'Second', origin: 'chat', updatedAt: '2026-10-29' },
				],
			}),
		} as ReturnType<AgentContextService['createReader']>);
		context.readSession.mockResolvedValue(
			mock<AgentSessionDetail>({
				executions: [
					{
						id: 'turn',
						status: 'success',
						userMessage: 'Hi',
						timeline: [],
						model: null,
						duration: 0,
						totalTokens: null,
						error: null,
					},
				],
			}),
		);
		const report = await service.run(user, 'project-1', 'agent-1', ['thread-2', 'thread-2']);
		expect(context.readSession).toHaveBeenCalledExactlyOnceWith(
			user,
			'project-1',
			'agent-1',
			'thread-2',
		);
		expect(report.sessions.map((session) => session.threadId)).toEqual(['thread-2']);
	});

	it('rejects an empty selection instead of checking all sessions', async () => {
		await expect(service.run(user, 'project-1', 'agent-1', [])).rejects.toThrow(
			'Select between 1 and 10 sessions',
		);
		expect(context.readSession).not.toHaveBeenCalled();
	});

	it('reports a session without recorded messages as unavailable', async () => {
		context.readOnlineRubric.mockResolvedValue({
			checks: [],
			generatedAt: new Date().toISOString(),
		});
		context.readSession.mockResolvedValue(mock<AgentSessionDetail>({ executions: [] }));
		await expect(service.run(user, 'project-1', 'agent-1', ['thread-1'])).rejects.toThrow(
			'no recorded messages',
		);
	});
	it('offers only sessions with finished recorded runs', async () => {
		const finished = {
			threadId: 'finished',
			title: 'Finished',
			origin: 'chat',
			updatedAt: '2026-10-29',
			status: 'succeeded',
		};
		context.createReader.mockReturnValue({
			lookup: vi.fn().mockResolvedValue({
				sessions: [
					finished,
					{ ...finished, threadId: 'empty', status: null },
					{ ...finished, threadId: 'running', status: 'running' },
				],
			}),
		} as ReturnType<AgentContextService['createReader']>);
		expect(
			(await service.listSessions(user, 'project-1', 'agent-1')).map((session) => session.threadId),
		).toEqual(['finished']);
	});

	it('does not judge a selected session that is still running', async () => {
		context.readOnlineRubric.mockResolvedValue({
			checks: [],
			generatedAt: new Date().toISOString(),
		});
		context.readSession.mockResolvedValue(
			mock<AgentSessionDetail>({
				executions: [
					{
						id: 'turn',
						status: 'running',
						userMessage: 'Hi',
						timeline: [],
						model: null,
						duration: 0,
						totalTokens: null,
						error: null,
					},
				],
			}),
		);
		await expect(service.run(user, 'project-1', 'agent-1', ['thread-1'])).rejects.toThrow(
			'still running',
		);
		expect(generate).not.toHaveBeenCalled();
	});
});

describe('saved session assessments', () => {
	const context = mock<AgentContextService>();
	const history = mock<AgentOnlineCheckHistoryRepository>();
	const user = mock<User>({ id: 'reader' });
	const service = new AgentOnlineChecksService(
		context,
		mock<CredentialsService>(),
		mock<Logger>(),
		history,
		mock<EvalAgentExecutionService>(),
	);
	beforeEach(() => {
		vi.clearAllMocks();
		context.readArtifact.mockResolvedValue({
			config: { name: 'Agent', model: 'openai/test', credential: 'cred' },
			skills: {},
			configHash: 'new-config',
		});
		context.readOnlineRubric.mockResolvedValue({ checks: [], generatedAt: '2026-10-29T12:00:00Z' });
	});
	it('rechecks the saved conversation without reading or executing the live session', async () => {
		const turns = [{ userMessage: 'Saved input', reply: 'Saved reply', timeline: [] }];
		history.findCase.mockResolvedValue({
			id: 1,
			agentId: 'agent',
			threadId: null,
			ownerId: 'reader',
			title: 'Old session',
			turns,
		} as Awaited<ReturnType<typeof history.findCase>>);
		await service.recheckCase(user, 'project', 'agent', 1);
		expect(context.readSession).not.toHaveBeenCalled();
		expect(history.saveAssessment).toHaveBeenCalledWith(
			expect.objectContaining({
				caseId: 1,
				turns,
				configHash: 'new-config',
				rubric: { checks: [], generatedAt: '2026-10-29T12:00:00Z' },
			}),
		);
	});
	it('refuses a case that is absent or inaccessible', async () => {
		history.findCase.mockResolvedValue(null);
		await expect(service.recheckCase(user, 'project', 'agent', 2)).rejects.toThrow(
			'Test case not found',
		);
		expect(history.findCase).toHaveBeenCalledWith('agent', 2, 'reader');
		expect(history.saveAssessment).not.toHaveBeenCalled();
	});
	it('checks project access before reading case history', async () => {
		context.readOnlineRubric.mockRejectedValueOnce(new Error('No access'));
		await expect(service.listCaseResults(user, 'wrong', 'agent', 1, 20, 0)).rejects.toThrow(
			'No access',
		);
		expect(history.listResults).not.toHaveBeenCalled();
	});
});

describe('rubric review', () => {
	const context = mock<AgentContextService>();
	const history = mock<AgentOnlineCheckHistoryRepository>();
	const user = mock<User>({ id: 'reviewer' });
	const service = new AgentOnlineChecksService(
		context,
		mock<CredentialsService>(),
		mock<Logger>(),
		history,
		mock<EvalAgentExecutionService>(),
	);
	const check = {
		id: 'promise:1',
		kind: 'promise' as const,
		question: 'Was the tone formal?',
		reason: 'Use the requested tone',
		source: { field: 'instructions' as const, quote: 'Be formal' },
	};
	beforeEach(() => {
		vi.clearAllMocks();
		context.readOnlineRubric.mockResolvedValue({
			checks: [check],
			generatedAt: '2026-10-29T12:00:00Z',
		});
	});
	it('edits only the saved rule and preserves its source and earlier generation date', async () => {
		const rubric = await service.updateCheck(user, 'project', 'agent', check.id, {
			question: 'Was the response professional?',
			reason: 'Use professional language',
			appliesWhen: 'The agent replies to a customer',
		});
		expect(rubric.generatedAt).toBe('2026-10-29T12:00:00Z');
		expect(rubric.checks[0]).toEqual({
			...check,
			question: 'Was the response professional?',
			reason: 'Use professional language',
			appliesWhen: 'The agent replies to a customer',
		});
		expect(context.saveOnlineRubric).toHaveBeenCalledWith(user, 'project', 'agent', rubric);
		expect(history.saveAssessment).not.toHaveBeenCalled();
	});
	it('keeps built-in rules read-only', async () => {
		context.readOnlineRubric.mockResolvedValue({
			checks: [{ ...check, kind: 'tool' }],
			generatedAt: 'date',
		});
		await expect(
			service.updateCheck(user, 'project', 'agent', check.id, {
				question: 'Changed',
				reason: 'Changed',
				appliesWhen: null,
			}),
		).rejects.toThrow('Built-in checks');
		expect(context.saveOnlineRubric).not.toHaveBeenCalled();
	});
	it('checks assessment access before saving feedback', async () => {
		history.findAssessment.mockResolvedValue(null);
		await expect(
			service.reviewCheck(user, 'project', 'agent', 10, check.id, 'good'),
		).rejects.toThrow('Assessment not found');
		expect(history.recordReview).not.toHaveBeenCalled();
	});
	it('refuses feedback for a check outside the assessment', async () => {
		history.findAssessment.mockResolvedValue({
			id: 10,
			caseId: 1,
			checkedAt: 'date',
			rubric: { checks: [check], generatedAt: 'date' },
			configHash: 'hash',
			verdicts: [{ checkId: check.id, status: 'fail', reason: 'Evidence' }],
		});
		await expect(
			service.reviewCheck(user, 'project', 'agent', 10, 'other', 'good'),
		).rejects.toThrow('Check not found');
		expect(history.recordReview).not.toHaveBeenCalled();
	});
	it('records human feedback without changing the judge verdict', async () => {
		const result = {
			id: 10,
			caseId: 1,
			checkedAt: 'date',
			rubric: { checks: [check], generatedAt: 'date' },
			configHash: 'hash',
			verdicts: [{ checkId: check.id, status: 'fail' as const, reason: 'Evidence' }],
		};
		history.findAssessment.mockResolvedValue(result);
		await service.reviewCheck(user, 'project', 'agent', 10, check.id, 'good');
		expect(history.recordReview).toHaveBeenCalledWith(10, user.id, check.id, 'good');
		expect(result.verdicts[0].status).toBe('fail');
	});
});

describe('monitoring approval', () => {
	const context = mock<AgentContextService>();
	const user = mock<User>({ id: 'builder' });
	const service = new AgentOnlineChecksService(
		context,
		mock<CredentialsService>(),
		mock<Logger>(),
		mock<AgentOnlineCheckHistoryRepository>(),
		mock<EvalAgentExecutionService>(),
	);
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('saves the checks with an approval date and keeps them unchanged', async () => {
		const rubric = { checks: [], generatedAt: '2026-10-29T12:00:00Z' };
		context.readOnlineRubric.mockResolvedValue(rubric);
		const approved = await service.approveRubric(user, 'project', 'agent');
		expect(approved).toEqual({ ...rubric, approvedAt: expect.any(String) });
		expect(context.saveOnlineRubric).toHaveBeenCalledWith(user, 'project', 'agent', approved);
	});

	it('refuses approval before checks exist', async () => {
		context.readOnlineRubric.mockResolvedValue(null);
		await expect(service.approveRubric(user, 'project', 'agent')).rejects.toThrow(
			'Write checks for this agent before you approve them.',
		);
		expect(context.saveOnlineRubric).not.toHaveBeenCalled();
	});
});
