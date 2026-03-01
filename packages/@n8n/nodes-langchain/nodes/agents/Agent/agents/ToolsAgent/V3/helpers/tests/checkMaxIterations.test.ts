import type { RequestResponseMetadata } from '@utils/agent-execution';
import { mock } from 'jest-mock-extended';
import { NodeOperationError } from 'n8n-workflow';
import type { INode, EngineResponse } from 'n8n-workflow';

import { checkMaxIterations } from '../checkMaxIterations';

describe('checkMaxIterations', () => {
	const mockNode = mock<INode>();

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should not throw when response is undefined', () => {
		expect(() => {
			checkMaxIterations(undefined, 10, mockNode);
		}).not.toThrow();
	});

	it('should not throw when response metadata is undefined', () => {
		const response = {
			actionResponses: [],
		} as unknown as EngineResponse<RequestResponseMetadata>;

		expect(() => {
			checkMaxIterations(response, 10, mockNode);
		}).not.toThrow();
	});

	it('should not throw when response metadata iterationCount is undefined', () => {
		const response: EngineResponse<RequestResponseMetadata> = {
			actionResponses: [],
			metadata: {},
		};

		expect(() => {
			checkMaxIterations(response, 10, mockNode);
		}).not.toThrow();
	});

	it('should not throw when iterationCount is below maxIterations', () => {
		const response: EngineResponse<RequestResponseMetadata> = {
			actionResponses: [],
			metadata: {
				iterationCount: 5,
			},
		};

		expect(() => {
			checkMaxIterations(response, 10, mockNode);
		}).not.toThrow();
	});

	it('should throw NodeOperationError when iterationCount equals maxIterations', () => {
		const response: EngineResponse<RequestResponseMetadata> = {
			actionResponses: [],
			metadata: {
				iterationCount: 10,
			},
		};

		expect(() => {
			checkMaxIterations(response, 10, mockNode);
		}).toThrow(NodeOperationError);

		expect(() => {
			checkMaxIterations(response, 10, mockNode);
		}).toThrow(
			'Max iterations (10) reached. The agent could not complete the task within the allowed number of iterations.',
		);
	});

	it('should throw NodeOperationError when iterationCount exceeds maxIterations', () => {
		const response: EngineResponse<RequestResponseMetadata> = {
			actionResponses: [],
			metadata: {
				iterationCount: 15,
			},
		};

		expect(() => {
			checkMaxIterations(response, 10, mockNode);
		}).toThrow(NodeOperationError);

		expect(() => {
			checkMaxIterations(response, 10, mockNode);
		}).toThrow(
			'Max iterations (10) reached. The agent could not complete the task within the allowed number of iterations.',
		);
	});

	it('should throw with correct error message for different maxIterations values', () => {
		const response: EngineResponse<RequestResponseMetadata> = {
			actionResponses: [],
			metadata: {
				iterationCount: 5,
			},
		};

		expect(() => {
			checkMaxIterations(response, 5, mockNode);
		}).toThrow(
			'Max iterations (5) reached. The agent could not complete the task within the allowed number of iterations.',
		);
	});

	it('should handle edge case of maxIterations = 0', () => {
		const response: EngineResponse<RequestResponseMetadata> = {
			actionResponses: [],
			metadata: {
				iterationCount: 0,
			},
		};

		expect(() => {
			checkMaxIterations(response, 0, mockNode);
		}).toThrow(NodeOperationError);
	});

	it('should handle edge case of maxIterations = 1 with iterationCount = 0', () => {
		const response: EngineResponse<RequestResponseMetadata> = {
			actionResponses: [],
			metadata: {
				iterationCount: 0,
			},
		};

		expect(() => {
			checkMaxIterations(response, 1, mockNode);
		}).not.toThrow();
	});
});
