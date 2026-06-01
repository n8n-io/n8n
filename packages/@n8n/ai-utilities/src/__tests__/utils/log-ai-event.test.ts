import type { AiEvent, IDataObject, IExecuteFunctions, ISupplyDataFunctions } from 'n8n-workflow';

import { logAiEvent } from 'src/utils/log-ai-event';

describe('logAiEvent', () => {
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions | ISupplyDataFunctions>;
	let mockLogger: { debug: jest.Mock };

	beforeEach(() => {
		mockLogger = {
			debug: jest.fn(),
		};

		mockExecuteFunctions = {
			logAiEvent: jest.fn(),
			logger: mockLogger,
		} as unknown as jest.Mocked<IExecuteFunctions | ISupplyDataFunctions>;
	});

	afterEach(() => {
		jest.clearAllMocks();
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
