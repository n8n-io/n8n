import type { AiEvent, IDataObject, IExecuteFunctions, ISupplyDataFunctions } from 'n8n-workflow';
import type { Mock, Mocked } from 'vitest';

import { logAiEvent } from 'src/utils/log-ai-event';

describe('logAiEvent', () => {
	let mockExecuteFunctions: Mocked<IExecuteFunctions | ISupplyDataFunctions>;
	let mockLogger: { debug: Mock };

	beforeEach(() => {
		mockLogger = {
			debug: vi.fn(),
		};

		mockExecuteFunctions = {
			logAiEvent: vi.fn(),
			logger: mockLogger,
		} as unknown as Mocked<IExecuteFunctions | ISupplyDataFunctions>;
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('successful logging', () => {
		it('should log AI event without data', () => {
			const event: AiEvent = 'ai-llm-generated-output';

			logAiEvent(mockExecuteFunctions, event);

			expect(mockExecuteFunctions.logAiEvent).toHaveBeenCalledWith(event, undefined);
			expect(mockExecuteFunctions.logAiEvent).toHaveBeenCalledTimes(1);
		});

		it('should log AI event with data object', () => {
			const event: AiEvent = 'ai-llm-generated-output';
			const data: IDataObject = { response: 'test response', tokens: 100 };

			logAiEvent(mockExecuteFunctions, event, data);

			expect(mockExecuteFunctions.logAiEvent).toHaveBeenCalledWith(event, JSON.stringify(data));
			expect(mockExecuteFunctions.logAiEvent).toHaveBeenCalledTimes(1);
		});

		it('should sanitize credential-shaped values on tool-called events', () => {
			logAiEvent(mockExecuteFunctions, 'ai-tool-called', {
				query: { api_key: 'sk-live-abcdef123456' },
				response: 'authorization: Bearer eyJhbGciOiJIUzI1NiJ9',
			});

			const payload = mockExecuteFunctions.logAiEvent.mock.calls[0][1];
			expect(payload).toContain('api_key');
			expect(payload).toContain('[REDACTED]');
			expect(payload).not.toContain('sk-live-abcdef123456');
			expect(payload).not.toContain('eyJhbGciOiJIUzI1NiJ9');
		});

		it('should sanitize credential-shaped values inside stringified JSON responses', () => {
			logAiEvent(mockExecuteFunctions, 'ai-tool-called', {
				query: 'test query',
				response: JSON.stringify({ api_key: 'sk-live-abcdef123456' }, null, 2),
			});

			const payload = mockExecuteFunctions.logAiEvent.mock.calls[0][1];
			expect(payload).toContain('[REDACTED]');
			expect(payload).not.toContain('sk-live-abcdef123456');
		});

		it('should replace object-valued credential properties instead of restoring them', () => {
			logAiEvent(mockExecuteFunctions, 'ai-tool-called', {
				query: { api_key: { nested: 'sk-live-abcdef123456' } },
				response: { client_secret: ['cs-live-abcdef'] },
			});

			const payload = mockExecuteFunctions.logAiEvent.mock.calls[0][1];
			expect(payload).toContain('[REDACTED]');
			expect(payload).not.toContain('sk-live-abcdef123456');
			expect(payload).not.toContain('cs-live-abcdef');
		});

		it('should sanitize unlabeled credential formats in tool-called events', () => {
			logAiEvent(mockExecuteFunctions, 'ai-tool-called', {
				query: 'lookup user',
				response: 'the run used sk-abc123DEF456ghi789jkl012',
			});

			const payload = mockExecuteFunctions.logAiEvent.mock.calls[0][1];
			expect(payload).toContain('[REDACTED]');
			expect(payload).not.toContain('sk-abc123DEF456ghi789jkl012');
		});

		it('should sanitize composite credential field names in tool-called events', () => {
			logAiEvent(mockExecuteFunctions, 'ai-tool-called', {
				query: { accessKeyId: 'AKIAIOSFODNN7EXAMPLE' },
				response: { secretAccessKey: 'wJalrXUtnFEMI/K7MDENG', Cookie: 'session=abc123' },
			});

			const payload = mockExecuteFunctions.logAiEvent.mock.calls[0][1];
			expect(payload).toContain('[REDACTED]');
			expect(payload).not.toContain('AKIAIOSFODNN7EXAMPLE');
			expect(payload).not.toContain('wJalrXUtnFEMI/K7MDENG');
			expect(payload).not.toContain('session=abc123');
		});

		it('should preserve Date serialization in tool-called events', () => {
			logAiEvent(mockExecuteFunctions, 'ai-tool-called', {
				query: 'lookup user',
				response: {
					createdAt: new Date('2026-08-25T12:00:00.000Z'),
					message: 'ok',
				},
			});

			const payload = mockExecuteFunctions.logAiEvent.mock.calls[0][1];
			expect(payload).toContain('2026-08-25T12:00:00.000Z');
			expect(payload).toContain('"message":"ok"');
		});

		it('should preserve custom toJSON serialization in tool-called events', () => {
			logAiEvent(mockExecuteFunctions, 'ai-tool-called', {
				query: 'lookup user',
				response: {
					toJSON() {
						return { status: 'ok', issuedAt: new Date('2020-01-01T00:00:00.000Z') };
					},
				},
			});

			const payload = mockExecuteFunctions.logAiEvent.mock.calls[0][1];
			expect(payload).toContain('"status":"ok"');
			expect(payload).toContain('2020-01-01T00:00:00.000Z');
		});

		it('should leave other events unsanitized', () => {
			const data: IDataObject = { response: 'api_key: sk-live-abcdef123456' };

			logAiEvent(mockExecuteFunctions, 'ai-llm-generated-output', data);

			expect(mockExecuteFunctions.logAiEvent).toHaveBeenCalledWith(
				'ai-llm-generated-output',
				JSON.stringify(data),
			);
		});

		it('should log different AI event types', () => {
			const events: AiEvent[] = ['ai-llm-generated-output', 'ai-llm-errored', 'ai-tool-called'];
			const data: IDataObject = { test: 'data' };

			events.forEach((event) => {
				logAiEvent(mockExecuteFunctions, event, data);
			});

			expect(mockExecuteFunctions.logAiEvent).toHaveBeenCalledTimes(3);
		});
	});

	it('should catch error and log debug message when logAiEvent throws', () => {
		const event: AiEvent = 'ai-llm-generated-output';
		const error = new Error('Logging failed');

		mockExecuteFunctions.logAiEvent.mockImplementation(() => {
			throw error;
		});

		// Should not throw
		expect(() => logAiEvent(mockExecuteFunctions, event)).not.toThrow();
		expect(mockLogger.debug).toHaveBeenCalledWith(`Error logging AI event: ${event}`);
	});

	it('should handle JSON.stringify errors gracefully', () => {
		const event: AiEvent = 'ai-llm-generated-output';
		const circularData: IDataObject = {};
		circularData.self = circularData; // Create circular reference

		// Should not throw
		expect(() => logAiEvent(mockExecuteFunctions, event, circularData)).not.toThrow();
		expect(mockLogger.debug).toHaveBeenCalledWith(`Error logging AI event: ${event}`);
	});
});
