import type { RedactionOptions } from '@n8n/agents';
import type { InstanceAiEvent } from '@n8n/api-types';

import type { Logger } from '../../logger';
import { OutputRedactor } from '../output-redaction';

function createLogger() {
	return { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } as unknown as Logger;
}

function createRedactor(logger = createLogger(), options?: RedactionOptions | false) {
	return new OutputRedactor({
		logger,
		threadId: 'thread-1',
		runId: 'run-1',
		agentId: 'agent-1',
		...(options !== undefined ? { options } : {}),
	});
}

function textDelta(text: string): InstanceAiEvent {
	return { type: 'text-delta', runId: 'run-1', agentId: 'agent-1', payload: { text } };
}

function collectText(events: InstanceAiEvent[]): string {
	return events.map((e) => ('payload' in e && 'text' in e.payload ? e.payload.text : '')).join('');
}

describe('OutputRedactor', () => {
	it('redacts a secret split across two text deltas', () => {
		const redactor = createRedactor();
		const emitted = [
			...redactor.processEvent(textDelta('your key is sk-ant-')),
			...redactor.processEvent(textDelta('api03-aaaaaaaaaaaaaaaa, keep it safe')),
			...redactor.flush(),
		];
		const out = collectText(emitted);
		expect(out).toBe('your key is [REDACTED], keep it safe');
		expect(out).not.toContain('sk-ant-');
	});

	it('redacts a PII email when the email category is enabled', () => {
		const redactor = createRedactor(createLogger(), { detect: ['email'] });
		const emitted = [
			...redactor.processEvent(textDelta('email me at jane@example.com ok')),
			...redactor.flush(),
		];
		expect(collectText(emitted)).toBe('email me at [REDACTED] ok');
	});

	it('redacts credit cards by default but leaves email untouched', () => {
		const redactor = createRedactor();
		const emitted = [
			...redactor.processEvent(textDelta('card 4111 1111 1111 1111 mail jane@example.com')),
			...redactor.flush(),
		];
		const out = collectText(emitted);
		expect(out).toBe('card [REDACTED] mail jane@example.com');
	});

	it('passes non-sensitive prose through unchanged', () => {
		const redactor = createRedactor();
		const text = 'The workflow completed and produced three items successfully.';
		const emitted = [...redactor.processEvent(textDelta(text)), ...redactor.flush()];
		expect(collectText(emitted)).toBe(text);
	});

	it('preserves responseId on flushed delta text', () => {
		const redactor = createRedactor();
		const emitted = [
			...redactor.processEvent({
				type: 'text-delta',
				runId: 'run-1',
				agentId: 'agent-1',
				responseId: 'run-1:step:1',
				payload: { text: 'hello there' },
			}),
			...redactor.flush(),
		];
		expect(emitted).toHaveLength(1);
		expect(emitted[0]).toMatchObject({ type: 'text-delta', responseId: 'run-1:step:1' });
	});

	it('redacts secrets nested inside tool-call args', () => {
		const redactor = createRedactor();
		const event: InstanceAiEvent = {
			type: 'tool-call',
			runId: 'run-1',
			agentId: 'agent-1',
			payload: {
				toolCallId: 'tc-1',
				toolName: 'http_request',
				args: { headers: { authorization: 'Bearer abcdef1234567890' } },
			},
		};
		const [out] = redactor.processEvent(event);
		expect(JSON.stringify(out)).toContain('[REDACTED]');
		expect(JSON.stringify(out)).not.toContain('abcdef1234567890');
		// Identifier fields are preserved.
		expect(out).toMatchObject({ payload: { toolCallId: 'tc-1', toolName: 'http_request' } });
	});

	it('redacts secrets nested inside a tool-result', () => {
		const redactor = createRedactor();
		const event: InstanceAiEvent = {
			type: 'tool-result',
			runId: 'run-1',
			agentId: 'agent-1',
			payload: {
				toolCallId: 'tc-1',
				result: { headers: { authorization: 'Bearer abcdef1234567890' } },
			},
		};
		const [out] = redactor.processEvent(event);
		expect(JSON.stringify(out)).toContain('[REDACTED]');
		expect(JSON.stringify(out)).not.toContain('abcdef1234567890');
	});

	it('redacts confirmation card display text', () => {
		const redactor = createRedactor(createLogger(), { detect: ['email'] });
		const event: InstanceAiEvent = {
			type: 'confirmation-request',
			runId: 'run-1',
			agentId: 'agent-1',
			payload: {
				requestId: 'req-1',
				toolCallId: 'tc-1',
				toolName: 'ask',
				args: {},
				severity: 'warning',
				message: 'What to do with jane@example.com?',
				introMessage: 'I noticed jane@example.com in your request.',
				questions: [
					{
						id: 'q1',
						question: 'Where should jane@example.com be used?',
						type: 'single',
						options: ['Reply-to jane@example.com', 'Skip'],
					},
				],
				tasks: { tasks: [{ id: 't1', description: 'Email jane@example.com', status: 'todo' }] },
				planItems: [
					{
						id: 'p1',
						title: 'Notify jane@example.com',
						kind: 'task',
						spec: 'Send to jane@example.com',
						deps: [],
					},
				],
			},
		};

		const [out] = redactor.processEvent(event);
		const serialized = JSON.stringify(out);
		expect(serialized).not.toContain('jane@example.com');
		expect(serialized).toContain('[REDACTED]');
		// Control/identifier fields are preserved so suspend/resume keeps working.
		expect(out).toMatchObject({ payload: { requestId: 'req-1', toolCallId: 'tc-1' } });
	});

	it('logs a filtering summary with category counts and no values', () => {
		const logger = createLogger();
		const redactor = createRedactor(logger, { secrets: true, detect: ['email'] });
		redactor.processEvent(
			textDelta('key sk-ant-api03-aaaaaaaaaaaaaaaa and mail jane@example.com here'),
		);
		redactor.flush();

		expect(logger.info).toHaveBeenCalledWith(
			'Instance AI redacted sensitive content from agent output',
			expect.objectContaining({
				threadId: 'thread-1',
				runId: 'run-1',
				agentId: 'agent-1',
				count: 2,
				categories: { secret: 1, email: 1 },
			}),
		);
		const meta = vi.mocked(logger.info).mock.calls[0][1];
		expect(JSON.stringify(meta)).not.toContain('sk-ant-');
		expect(JSON.stringify(meta)).not.toContain('jane@example.com');
	});

	it('does not log when nothing is redacted', () => {
		const logger = createLogger();
		const redactor = createRedactor(logger);
		redactor.processEvent(textDelta('all clear, nothing sensitive here at all'));
		redactor.flush();
		expect(logger.info).not.toHaveBeenCalled();
	});

	describe('when disabled (options: false)', () => {
		function createDisabled(logger = createLogger()) {
			return new OutputRedactor({
				logger,
				threadId: 'thread-1',
				runId: 'run-1',
				agentId: 'agent-1',
				options: false,
			});
		}

		it('passes events through untouched, including secrets', () => {
			const redactor = createDisabled();
			const input = textDelta('your key is sk-ant-api03-aaaaaaaaaaaaaaaa here');
			const emitted = [...redactor.processEvent(input), ...redactor.flush()];
			expect(emitted).toEqual([input]);
		});

		it('does not log a filtering summary', () => {
			const logger = createLogger();
			const redactor = createDisabled(logger);
			redactor.processEvent(textDelta('key sk-ant-api03-aaaaaaaaaaaaaaaa'));
			redactor.flush();
			expect(logger.info).not.toHaveBeenCalled();
		});
	});
});
