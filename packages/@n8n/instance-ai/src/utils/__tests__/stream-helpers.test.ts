import { isRecord, parseSuspension, asResumable, resumeStream } from '../stream-helpers';

describe('isRecord', () => {
	it('returns true for plain objects', () => {
		expect(isRecord({})).toBe(true);
		expect(isRecord({ key: 'value' })).toBe(true);
	});

	it('returns false for null', () => {
		expect(isRecord(null)).toBe(false);
	});

	it('returns false for arrays', () => {
		expect(isRecord([])).toBe(false);
		expect(isRecord([1, 2])).toBe(false);
	});

	it('returns false for primitives', () => {
		expect(isRecord('string')).toBe(false);
		expect(isRecord(42)).toBe(false);
		expect(isRecord(true)).toBe(false);
		expect(isRecord(undefined)).toBe(false);
	});
});

describe('parseSuspension', () => {
	it('returns null for non-object chunk', () => {
		expect(parseSuspension(null)).toBeNull();
		expect(parseSuspension('string')).toBeNull();
		expect(parseSuspension(42)).toBeNull();
	});

	it('returns null for non-suspension chunk type', () => {
		expect(parseSuspension({ type: 'text-delta', payload: {} })).toBeNull();
	});

	it('parses basic suspension with toolCallId and requestId', () => {
		const chunk = {
			type: 'tool-call-suspended',
			payload: {
				toolCallId: 'tc-1',
				toolName: 'setup-credentials',
				suspendPayload: {
					requestId: 'req-1',
				},
			},
		};

		expect(parseSuspension(chunk)).toEqual({
			toolCallId: 'tc-1',
			requestId: 'req-1',
			toolName: 'setup-credentials',
		});
	});

	it('parses native agent suspension chunks', () => {
		const chunk = {
			type: 'tool-call-suspended',
			toolCallId: 'tc-1',
			toolName: 'setup-credentials',
			suspendPayload: {
				requestId: 'req-1',
			},
		};

		expect(parseSuspension(chunk)).toEqual({
			toolCallId: 'tc-1',
			requestId: 'req-1',
			toolName: 'setup-credentials',
		});
	});

	it('falls back to toolCallId when requestId is missing', () => {
		const chunk = {
			type: 'tool-call-suspended',
			payload: {
				toolCallId: 'tc-1',
				suspendPayload: {},
			},
		};

		expect(parseSuspension(chunk)).toEqual({
			toolCallId: 'tc-1',
			requestId: 'tc-1',
			toolName: undefined,
		});
	});

	it('returns null when both toolCallId and requestId are empty', () => {
		const chunk = {
			type: 'tool-call-suspended',
			payload: {
				toolCallId: '',
				suspendPayload: { requestId: '' },
			},
		};

		expect(parseSuspension(chunk)).toBeNull();
	});

	it('handles missing payload gracefully', () => {
		const chunk = { type: 'tool-call-suspended' };
		expect(parseSuspension(chunk)).toBeNull();
	});

	it('handles non-object suspendPayload', () => {
		const chunk = {
			type: 'tool-call-suspended',
			payload: {
				toolCallId: 'tc-1',
				suspendPayload: 'invalid',
			},
		};

		expect(parseSuspension(chunk)).toEqual({
			toolCallId: 'tc-1',
			requestId: 'tc-1',
			toolName: undefined,
		});
	});
});

describe('asResumable', () => {
	it('casts agent to Resumable interface', () => {
		const agent = { resumeStream: jest.fn() };
		const resumable = asResumable(agent);
		expect(resumable.resumeStream).toBe(agent.resumeStream);
	});
});

describe('resumeStream', () => {
	it('uses Mastra-style resumeStream when available', async () => {
		const resumed = { runId: 'run-2' };
		const agent = { resumeStream: jest.fn().mockResolvedValue(resumed) };

		await expect(resumeStream(agent, { approved: true }, { runId: 'run-1' })).resolves.toBe(
			resumed,
		);
		expect(agent.resumeStream).toHaveBeenCalledWith({ approved: true }, { runId: 'run-1' });
	});

	it('uses native agent resume in stream mode when resumeStream is absent', async () => {
		const resumed = { runId: 'run-2' };
		const agent = { resume: jest.fn().mockResolvedValue(resumed) };

		await expect(resumeStream(agent, { approved: true }, { runId: 'run-1' })).resolves.toBe(
			resumed,
		);
		expect(agent.resume).toHaveBeenCalledWith('stream', { approved: true }, { runId: 'run-1' });
	});

	it('throws when the agent cannot resume streams', async () => {
		await expect(resumeStream({}, { approved: true }, { runId: 'run-1' })).rejects.toThrow(
			'Agent does not support stream resume',
		);
	});
});
