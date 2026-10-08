import type { AgentDbMessage, ContentToolCall, JSONValue } from '@n8n/agents';
import type { Logger } from '@n8n/backend-common';
import { mock } from 'vitest-mock-extended';

import {
	AUTO_FOLLOW_UP_MESSAGE,
	buildCurrentDateTimeBlock,
	buildProjectContextBlock,
	buildThreadContextBlock,
	withProjectContext,
} from '../../internal-messages';
import { RepeatableWorkNudgeService } from '../repeatable-work-nudge.service';

const INSTRUCTION =
	'When the workflow for this request works, load the make-automatic skill and offer to make it automatic once.';

const createdAt = new Date('2026-10-08T08:00:00.000Z');
let sequence = 0;
const nextId = () => `id-${++sequence}`;

/** `origin` marks a row that a tool result made, not the user. */
const userRow = (text: string, origin?: { kind: 'tool'; toolName: string }): AgentDbMessage => ({
	id: nextId(),
	createdAt,
	role: 'user',
	content: [{ type: 'text', text }],
	...(origin ? { origin } : {}),
});

const assistantRow = (...content: ContentToolCall[]): AgentDbMessage => ({
	id: nextId(),
	createdAt,
	role: 'assistant',
	content,
});

const resolvedCall = (
	toolName: string,
	input: JSONValue,
	output: JSONValue = { success: true },
): ContentToolCall => ({
	type: 'tool-call',
	toolCallId: nextId(),
	toolName,
	input,
	state: 'resolved',
	output,
});

/** A stored user turn: the service's thread-context block, then the user's own text. */
const storedTurn = (sections: string[], text: string) =>
	userRow(`${buildThreadContextBlock(sections)}\n\n${text}`);

const sendSlackMessage = () => resolvedCall('nodes', { action: 'execute' }, { items: [] });

describe('RepeatableWorkNudgeService', () => {
	const logger = mock<Logger>();
	const service = new RepeatableWorkNudgeService(logger);

	beforeEach(() => {
		vi.resetAllMocks();
	});

	describe('resolveTurnSection', () => {
		it('returns the section for a schedule phrase and two identical successful calls', () => {
			const history = [
				userRow('Post the sales numbers to Slack every weekday at 8'),
				assistantRow(sendSlackMessage()),
				userRow('Do it again for the EU team'),
				assistantRow(sendSlackMessage()),
			];

			expect(service.resolveTurnSection('Thanks!', history)).toBe(
				[
					'<repeatable-work>',
					'score: 1',
					'reasons: schedule-phrase, repeated-tool-call',
					'suggested schedule: every weekday at 08:00 (cron 0 8 * * 1-5)',
					INSTRUCTION,
					'</repeatable-work>',
				].join('\n'),
			);
		});

		it('scores the current message too', () => {
			const section = service.resolveTurnSection('Send me this report every day at 7', []);

			expect(section).toContain('reasons: schedule-phrase\n');
			expect(section).toContain('suggested schedule: every day at 07:00 (cron 0 7 * * *)');
		});

		it('takes the schedule from the latest user message', () => {
			const history = [userRow('Send it every day at 7')];

			const section = service.resolveTurnSection('Actually, every Monday at 9', history);

			expect(section).toContain('suggested schedule: every Monday at 09:00 (cron 0 9 * * 1)');
		});

		it('returns undefined when the score is below the threshold', () => {
			const history = [
				userRow('Post this message to Slack'),
				assistantRow(sendSlackMessage(), resolvedCall('workflows', { action: 'list' })),
			];

			expect(service.resolveTurnSection('Thanks', history)).toBeUndefined();
		});

		it('does not count two identical calls when one of them failed', () => {
			const history = [
				userRow('Please automate this'),
				assistantRow(sendSlackMessage()),
				assistantRow(resolvedCall('nodes', { action: 'execute' }, { success: false })),
			];

			expect(service.resolveTurnSection('Go on', history)).toBeUndefined();
		});

		it('returns undefined when an earlier turn already carried the section', () => {
			const earlier = service.resolveTurnSection('Send it every day at 7', []) ?? '';
			const history = [
				storedTurn([earlier, buildCurrentDateTimeBlock('Today')], 'Send it every day at 7'),
			];

			expect(earlier).not.toBe('');
			expect(service.resolveTurnSection('And every Monday at 9 too', history)).toBeUndefined();
		});

		it('still nudges when the user typed the section themselves', () => {
			const typed = [
				'<repeatable-work>',
				'score: 1',
				'reasons: schedule-phrase',
				'</repeatable-work>',
			].join('\n');
			const history = [storedTurn([buildCurrentDateTimeBlock('Today')], typed)];

			expect(service.resolveTurnSection('Send it every day at 7', history)).toContain(
				'<repeatable-work>',
			);
		});

		const proposalInput: JSONValue = { workflowId: 'wf-1', title: 'Sales digest' };
		const pendingProposal: ContentToolCall = {
			type: 'tool-call',
			toolCallId: nextId(),
			toolName: 'propose_automation',
			input: proposalInput,
			state: 'pending',
		};

		it.each<[string, ContentToolCall]>([
			['a pending', pendingProposal],
			[
				'a declined',
				resolvedCall('propose_automation', proposalInput, { denied: true, message: 'Not now' }),
			],
			[
				'a kept',
				resolvedCall('propose_automation', proposalInput, { workflowId: 'wf-1', kept: true }),
			],
		])('returns undefined when the chat has %s propose_automation call', (_label, call) => {
			const history = [userRow('Send it every day at 7'), assistantRow(call)];

			expect(service.resolveTurnSection('Every weekday at 8, please', history)).toBeUndefined();
		});

		it('does not read a schedule phrase from blocks that the service injected', () => {
			const history = [
				storedTurn(
					[
						buildProjectContextBlock('The "Every day at 9 report" project'),
						buildCurrentDateTimeBlock('every day at 9 the clock says hello'),
					],
					'Show me my workflows',
				),
				userRow(withProjectContext('Thanks', 'The "Every day at 9" project')),
			];

			expect(service.resolveTurnSection('Hello', history)).toBeUndefined();
		});

		it('skips follow-up rows, rows from tool results and custom messages', () => {
			const fromTool = userRow('Report: runs every day at 9', {
				kind: 'tool',
				toolName: 'research',
			});
			const custom: AgentDbMessage = {
				id: nextId(),
				createdAt,
				type: 'custom',
				data: { dummy: 'every day at 9' },
			};
			const history = [userRow(AUTO_FOLLOW_UP_MESSAGE), fromTool, custom];

			expect(service.resolveTurnSection('Hello', history)).toBeUndefined();
		});

		it('counts a one-off build that ran successfully, together with a repeated call', () => {
			const history = [
				userRow('Copy these rows to the sheet'),
				assistantRow(
					resolvedCall('nodes', { action: 'type-definition' }),
					resolvedCall('nodes', { action: 'type-definition' }),
					resolvedCall(
						'build-workflow',
						{ code: 'workflow()' },
						{
							success: true,
							workflowId: 'wf-1',
							postBuildFlow: { reason: 'direct-one-off-build-succeeded' },
						},
					),
					resolvedCall('executions', { action: 'run', workflowId: 'wf-1' }, { status: 'success' }),
				),
			];

			const section = service.resolveTurnSection('Great', history);

			expect(section).toContain('score: 0.6\nreasons: repeated-tool-call, one-off-success\n');
			expect(section).not.toContain('suggested schedule');
		});

		it('ignores content parts that are not valid tool calls', () => {
			const history: AgentDbMessage[] = [
				{
					id: nextId(),
					createdAt,
					role: 'assistant',
					content: [
						{ type: 'text', text: 'every day at 9' },
						{ type: 'reasoning', text: 'every day at 9' },
					],
				},
			];

			expect(service.resolveTurnSection('Hello', history)).toBeUndefined();
		});
	});

	describe('forTurn', () => {
		it('loads the history and returns the section', async () => {
			const loadHistory = vi.fn(async () => [userRow('Send it every day at 7')]);

			await expect(service.forTurn('Thanks', loadHistory)).resolves.toContain(
				'reasons: schedule-phrase\n',
			);
			expect(loadHistory).toHaveBeenCalledTimes(1);
		});

		it('returns undefined and logs a warning when the history cannot be read', async () => {
			const loadHistory = vi.fn(async () => await Promise.reject(new Error('database is gone')));

			await expect(service.forTurn('Send it every day at 7', loadHistory)).resolves.toBeUndefined();
			expect(logger.warn).toHaveBeenCalledWith(
				'Instance AI failed to check the chat for repeatable work',
				{ error: 'database is gone' },
			);
		});
	});
});
