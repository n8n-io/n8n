import { NodeApiError } from 'n8n-workflow';

import { ERROR_MESSAGES, SESSION_STATUS } from '../constants';
import {
	createSession,
	createSessionAndWindow,
	validateProfileName,
	validateTimeoutMinutes,
	validateSaveProfileOnTermination,
	validateSessionAndWindowId,
	validateAirtopApiResponse,
	validateSessionId,
	validateUrl,
	validateProxy,
	validateRequiredStringField,
	shouldCreateNewSession,
	convertScreenshotToBinary,
} from '../GenericFunctions';
import type * as transport from '../transport';
import { createMockExecuteFunction } from './node/helpers';

const mockCreatedSession = {
	data: { id: 'new-session-123', status: SESSION_STATUS.RUNNING },
};

jest.mock('../transport', () => {
	const originalModule = jest.requireActual<typeof transport>('../transport');
	return {
		...originalModule,
		apiRequest: jest.fn(async (method: string, endpoint: string, params: { fail?: boolean }) => {
			// return failed request
			if (endpoint.endsWith('/sessions') && params.fail) {
				return {};
			}

			// create session
			if (method === 'POST' && endpoint.endsWith('/sessions')) {
				return { ...mockCreatedSession };
			}

			// get session status - general case
			if (method === 'GET' && endpoint.includes('/sessions')) {
				return { ...mockCreatedSession };
			}

			// create window
			if (method === 'POST' && endpoint.endsWith('/windows')) {
				return { data: { windowId: 'new-window-123' } };
			}

			return {
				success: true,
			};
		}),
	};
});

describe('Test convertScreenshotToBinary', () => {
	it('should convert base64 screenshot data to buffer', () => {
		const mockScreenshot = {
			dataUrl: 'data:image/jpeg;base64,SGVsbG8gV29ybGQ=', // "Hello World" in base64
		};

		const result = convertScreenshotToBinary(mockScreenshot);

		expect(Buffer.isBuffer(result)).toBe(true);
		expect(result.toString()).toBe('Hello World');
	});

	it('should handle empty base64 data', () => {
		const mockScreenshot = {
			dataUrl: 'data:image/jpeg;base64,',
		};

		const result = convertScreenshotToBinary(mockScreenshot);

		expect(Buffer.isBuffer(result)).toBe(true);
		expect(result.length).toBe(0);
	});
});

describe('Test Airtop utils', () => {
	describe('validateRequiredStringField', () => {
		it('should validate non-empty string field', () => {
			const nodeParameters = {
				testField: 'test-value',
			};

			const result = validateRequiredStringField.call(
				createMockExecuteFunction(nodeParameters),
				0,
				'testField',
				'Test Field',
			);
			expect(result).toBe('test-value');
		});

		it('should trim whitespace from string field', () => {
			const nodeParameters = {
				testField: '  test-value  ',
			};

			const result = validateRequiredStringField.call(
				createMockExecuteFunction(nodeParameters),
				0,
				'testField',
				'Test Field',
			);
			expect(result).toBe('test-value');
		});

		it('should throw error for empty string field', () => {
			const nodeParameters = {
				testField: '',
			};

			expect(() =>
				validateRequiredStringField.call(
					createMockExecuteFunction(nodeParameters),
					0,
					'testField',
					'Test Field',
				),
			).toThrow(ERROR_MESSAGES.REQUIRED_PARAMETER.replace('{{field}}', 'Test Field'));
		});

		it('should throw error for whitespace-only string field', () => {
			const nodeParameters = {
				testField: '   ',
			};

			expect(() =>
				validateRequiredStringField.call(
					createMockExecuteFunction(nodeParameters),
					0,
					'testField',
					'Test Field',
				),
			).toThrow(ERROR_MESSAGES.REQUIRED_PARAMETER.replace('{{field}}', 'Test Field'));
		});
	});

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
				ERROR_MESSAGES.PROFILE_NAME_INVALID,
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
			).toThrow(ERROR_MESSAGES.TIMEOUT_MINUTES_INVALID);
		});

		it('should throw error for timeout above maximum', () => {
			const nodeParameters = {
				timeoutMinutes: 10081,
			};

			expect(() =>
				validateTimeoutMinutes.call(createMockExecuteFunction(nodeParameters), 0),
			).toThrow(ERROR_MESSAGES.TIMEOUT_MINUTES_INVALID);
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
			).toThrow(ERROR_MESSAGES.PROFILE_NAME_REQUIRED);
		});
	});

	describe('validateSessionId', () => {
		it('should validate session ID', () => {
			const nodeParameters = {
				sessionId: 'test-session-123',
			};

			const result = validateSessionId.call(createMockExecuteFunction(nodeParameters), 0);
			expect(result).toBe('test-session-123');
		});

		it('should throw error for empty session ID', () => {
			const nodeParameters = {
				sessionId: '',
			};

			expect(() => validateSessionId.call(createMockExecuteFunction(nodeParameters), 0)).toThrow(
				ERROR_MESSAGES.SESSION_ID_REQUIRED,
			);
		});

		it('should trim whitespace from session ID', () => {
			const nodeParameters = {
				sessionId: '  test-session-123  ',
			};

			const result = validateSessionId.call(createMockExecuteFunction(nodeParameters), 0);
			expect(result).toBe('test-session-123');
		});
	});

	describe('validateSessionAndWindowId', () => {
		it('should validate session and window IDs', () => {
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
			).toThrow(ERROR_MESSAGES.SESSION_ID_REQUIRED);
		});

		it('should throw error for empty window ID', () => {
			const nodeParameters = {
				sessionId: 'test-session-123',
				windowId: '',
			};

			expect(() =>
				validateSessionAndWindowId.call(createMockExecuteFunction(nodeParameters), 0),
			).toThrow(ERROR_MESSAGES.WINDOW_ID_REQUIRED);
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

	describe('validateUrl', () => {
		it('should validate valid URL', () => {
			const nodeParameters = {
				url: 'https://example.com',
			};

			const result = validateUrl.call(createMockExecuteFunction(nodeParameters), 0);
			expect(result).toBe('https://example.com');
		});

		it('should throw error for invalid URL', () => {
			const nodeParameters = {
				url: 'invalid-url',
			};

			expect(() => validateUrl.call(createMockExecuteFunction(nodeParameters), 0)).toThrow(
				ERROR_MESSAGES.URL_INVALID,
			);
		});

		it('should return empty string for empty URL', () => {
			const nodeParameters = {
				url: '',
			};

			const result = validateUrl.call(createMockExecuteFunction(nodeParameters), 0);
			expect(result).toBe('');
		});

		it('should throw error for URL without http or https', () => {
			const nodeParameters = {
				url: 'example.com',
			};

			expect(() => validateUrl.call(createMockExecuteFunction(nodeParameters), 0)).toThrow(
				ERROR_MESSAGES.URL_INVALID,
			);
		});
	});

	describe('validateProxy', () => {
		it('should validate intergated proxy', () => {
			const nodeParameters = {
				proxy: 'integrated',
			};

			const result = validateProxy.call(createMockExecuteFunction(nodeParameters), 0);
			expect(result).toEqual({ proxy: true });
		});

		it('should validate proxyUrl', () => {
			const nodeParameters = {
				proxy: 'proxyUrl',
				proxyUrl: 'http://example.com',
			};

			const result = validateProxy.call(createMockExecuteFunction(nodeParameters), 0);
			expect(result).toEqual({ proxy: 'http://example.com' });
		});

		it('should throw error for empty proxyUrl', () => {
			const nodeParameters = {
				proxy: 'proxyUrl',
				proxyUrl: '',
			};

			expect(() => validateProxy.call(createMockExecuteFunction(nodeParameters), 0)).toThrow(
				ERROR_MESSAGES.REQUIRED_PARAMETER.replace('{{field}}', 'Proxy URL'),
			);
		});

		it('should validate integrated proxy with config', () => {
			const nodeParameters = {
				proxy: 'integrated',
				proxyConfig: { country: 'US', sticky: true },
			};

			const result = validateProxy.call(createMockExecuteFunction(nodeParameters), 0);
			expect(result).toEqual({ proxy: { country: 'US', sticky: true } });
		});

		it('should validate none proxy', () => {
			const nodeParameters = {
				proxy: 'none',
			};

			const result = validateProxy.call(createMockExecuteFunction(nodeParameters), 0);
			expect(result).toEqual({ proxy: false });
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
	});

	describe('shouldCreateNewSession', () => {
		it("should return true when 'sessionMode' is 'new'", () => {
			const nodeParameters = {
				sessionMode: 'new',
			};

			const result = shouldCreateNewSession.call(createMockExecuteFunction(nodeParameters), 0);
			expect(result).toBe(true);
		});

		it("should return false when 'sessionMode' is 'existing'", () => {
			const nodeParameters = {
				sessionMode: 'existing',
			};

			const result = shouldCreateNewSession.call(createMockExecuteFunction(nodeParameters), 0);
			expect(result).toBe(false);
		});

		it("should return false when 'sessionMode' is empty", () => {
			const nodeParameters = {
				sessionMode: '',
			};

			const result = shouldCreateNewSession.call(createMockExecuteFunction(nodeParameters), 0);
			expect(result).toBe(false);
		});

		it("should return false when 'sessionMode' is not set", () => {
			const nodeParameters = {};

			const result = shouldCreateNewSession.call(createMockExecuteFunction(nodeParameters), 0);
			expect(result).toBe(false);
		});
	});

	describe('createSession', () => {
		it('should create a session and return the session ID', async () => {
			const result = await createSession.call(createMockExecuteFunction({}), {});
			expect(result).toEqual({
				sessionId: 'new-session-123',
				data: { ...mockCreatedSession },
			});
		});

		it('should throw an error if no session ID is returned', async () => {
			await expect(
				createSession.call(createMockExecuteFunction({}), { fail: true }),
			).rejects.toThrow();
		});
	});

	describe('createSessionAndWindow', () => {
		it("should create a new session and window when sessionMode is 'new'", async () => {
			const nodeParameters = {
				sessionMode: 'new',
				url: 'https://example.com',
			};

			const result = await createSessionAndWindow.call(
				createMockExecuteFunction(nodeParameters),
				0,
			);
			expect(result).toEqual({
				sessionId: 'new-session-123',
				windowId: 'new-window-123',
			});
		});
	});
});
