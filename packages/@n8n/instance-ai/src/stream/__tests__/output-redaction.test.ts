import type { InstanceAiEvent } from '@n8n/api-types';

import type { Logger } from '../../logger';
import { OutputRedactor } from '../output-redaction';

function createLogger() {
	return { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } as unknown as Logger;
}

function createRedactor(logger = createLogger()) {
	return new OutputRedactor({ logger, threadId: 'thread-1', runId: 'run-1', agentId: 'agent-1' });
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

	it('redacts a conservative PII email', () => {
		const redactor = createRedactor();
		const emitted = [
			...redactor.processEvent(textDelta('email me at jane@example.com ok')),
			...redactor.flush(),
		];
		expect(collectText(emitted)).toBe('email me at [REDACTED] ok');
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

	it('logs a filtering summary with category counts and no values', () => {
		const logger = createLogger();
		const redactor = createRedactor(logger);
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
});
