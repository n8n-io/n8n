import { NodeApiError } from 'n8n-workflow';

import { createMockExecuteFunction } from './node/helpers';
import {
	validateProfileName,
	validateTimeoutMinutes,
	validateSaveProfileOnTermination,
	validateSessionAndWindowId,
	validateAirtopApiResponse,
} from '../GenericFunctions';

describe('Test Airtop utils', () => {
	describe('validateProfileName', () => {
		it('should validate valid profile names', () => {
			const nodeParameters = {
				profileName: 'test-profile-123',
			};

			const result = validateProfileName.call(createMockExecuteFunction(nodeParameters), 0);
			expect(result).toBe('test-profile-123');
		});

		it('should allow empty profile name', () => {
			const nodeParameters = {
				profileName: '',
			};

			const result = validateProfileName.call(createMockExecuteFunction(nodeParameters), 0);
			expect(result).toBe('');
		});

		it('should throw error for invalid profile name', () => {
			const nodeParameters = {
				profileName: 'test@profile#123',
			};

			expect(() => validateProfileName.call(createMockExecuteFunction(nodeParameters), 0)).toThrow(
				'Profile name should only contain letters, numbers and dashes',
			);
		});
	});

	describe('validateTimeoutMinutes', () => {
		it('should validate valid timeout', () => {
			const nodeParameters = {
				timeoutMinutes: 10,
			};

			const result = validateTimeoutMinutes.call(createMockExecuteFunction(nodeParameters), 0);
			expect(result).toBe(10);
		});

		it('should throw error for timeout below minimum', () => {
			const nodeParameters = {
				timeoutMinutes: 0,
			};

			expect(() =>
				validateTimeoutMinutes.call(createMockExecuteFunction(nodeParameters), 0),
			).toThrow('Timeout must be between 1 and 10080 minutes');
		});

		it('should throw error for timeout above maximum', () => {
			const nodeParameters = {
				timeoutMinutes: 10081,
			};

			expect(() =>
				validateTimeoutMinutes.call(createMockExecuteFunction(nodeParameters), 0),
			).toThrow('Timeout must be between 1 and 10080 minutes');
		});
	});

	describe('validateSaveProfileOnTermination', () => {
		it('should validate when save profile is false', () => {
			const nodeParameters = {
				saveProfileOnTermination: false,
			};

			const result = validateSaveProfileOnTermination.call(
				createMockExecuteFunction(nodeParameters),
				0,
				'',
			);
			expect(result).toBe(false);
		});

		it('should validate when save profile is true with profile name', () => {
			const nodeParameters = {
				saveProfileOnTermination: true,
			};

			const result = validateSaveProfileOnTermination.call(
				createMockExecuteFunction(nodeParameters),
				0,
				'test-profile',
			);
			expect(result).toBe(true);
		});

		it('should throw error when save profile is true without profile name', () => {
			const nodeParameters = {
				saveProfileOnTermination: true,
			};

			expect(() =>
				validateSaveProfileOnTermination.call(createMockExecuteFunction(nodeParameters), 0, ''),
			).toThrow('Profile name is required when "Save Profile" is enabled');
		});
	});

	describe('validateSessionAndWindowId', () => {
		it('should validate valid session and window IDs', () => {
			const nodeParameters = {
				sessionId: 'test-session-123',
				windowId: 'win-123',
			};

			const result = validateSessionAndWindowId.call(createMockExecuteFunction(nodeParameters), 0);
			expect(result).toEqual({
				sessionId: 'test-session-123',
				windowId: 'win-123',
			});
		});

		it('should throw error for empty session ID', () => {
			const nodeParameters = {
				sessionId: '',
				windowId: 'win-123',
			};

			expect(() =>
				validateSessionAndWindowId.call(createMockExecuteFunction(nodeParameters), 0),
			).toThrow('Session ID is required');
		});

		it('should throw error for empty window ID', () => {
			const nodeParameters = {
				sessionId: 'test-session-123',
				windowId: '',
			};

			expect(() =>
				validateSessionAndWindowId.call(createMockExecuteFunction(nodeParameters), 0),
			).toThrow('Window ID is required');
		});

		it('should trim whitespace from IDs', () => {
			const nodeParameters = {
				sessionId: '  test-session-123  ',
				windowId: '  win-123  ',
			};

			const result = validateSessionAndWindowId.call(createMockExecuteFunction(nodeParameters), 0);
			expect(result).toEqual({
				sessionId: 'test-session-123',
				windowId: 'win-123',
			});
		});
	});

	describe('validateAirtopApiResponse', () => {
		const mockNode = {
			id: '1',
			name: 'Airtop node',
			type: 'n8n-nodes-base.airtop',
			typeVersion: 1,
			position: [0, 0] as [number, number],
			parameters: {},
		};

		it('should not throw error for valid response', () => {
			const response = {
				status: 'success',
				data: {},
				meta: {},
				errors: [],
				warnings: [],
			};

			expect(() => validateAirtopApiResponse(mockNode, response)).not.toThrow();
		});

		it('should throw error for response with errors', () => {
			const response = {
				status: 'error',
				data: {},
				meta: {},
				errors: [{ message: 'Error 1' }, { message: 'Error 2' }],
				warnings: [],
			};

			const expectedError = new NodeApiError(mockNode, { message: 'Error 1\nError 2' });
			expect(() => validateAirtopApiResponse(mockNode, response)).toThrow(expectedError);
		});

		it('should handle response with empty errors array', () => {
			const response = {
				status: 'success',
				data: {},
				meta: {},
				errors: [],
				warnings: [],
			};

			expect(() => validateAirtopApiResponse(mockNode, response)).not.toThrow();
		});
	});
});
