import type { IExecuteFunctions } from 'n8n-workflow';

import { createMockExecuteFunction } from './node/helpers';
import { SESSION_MODE } from '../actions/common/fields';
import { executeRequestWithSessionManagement } from '../actions/common/session.utils';
import * as transport from '../transport';

jest.mock('../transport', () => {
	const originalModule = jest.requireActual<typeof transport>('../transport');
	return {
		...originalModule,
		apiRequest: jest.fn(async () => {
			return {
				success: true,
			};
		}),
	};
});

jest.mock('../GenericFunctions', () => ({
	shouldCreateNewSession: jest.fn(function (this: IExecuteFunctions, index: number) {
		const sessionMode = this.getNodeParameter('sessionMode', index);
		return sessionMode === SESSION_MODE.NEW;
	}),
	createSessionAndWindow: jest.fn(async () => ({
		sessionId: 'new-session-123',
		windowId: 'new-window-123',
	})),
	validateSessionAndWindowId: jest.fn(() => ({
		sessionId: 'existing-session-123',
		windowId: 'existing-window-123',
	})),
	validateAirtopApiResponse: jest.fn(),
}));

describe('executeRequestWithSessionManagement', () => {
	afterAll(() => {
		jest.unmock('../transport');
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe("When 'sessionMode' is 'new'", () => {
		it("should create a new session and window when 'sessionMode' is 'new'", async () => {
			const nodeParameters = {
				sessionMode: SESSION_MODE.NEW,
				url: 'https://example.com',
				autoTerminateSession: true,
			};

			const result = await executeRequestWithSessionManagement.call(
				createMockExecuteFunction(nodeParameters),
				0,
				{
					method: 'POST',
					path: '/sessions/{sessionId}/windows/{windowId}/action',
					body: {},
				},
			);

			expect(result).toEqual({
				success: true,
			});
		});

		it("should not terminate session when 'autoTerminateSession' is false", async () => {
			const nodeParameters = {
				sessionMode: SESSION_MODE.NEW,
				url: 'https://example.com',
				autoTerminateSession: false,
			};

			const result = await executeRequestWithSessionManagement.call(
				createMockExecuteFunction(nodeParameters),
				0,
				{
					method: 'POST',
					path: '/sessions/{sessionId}/windows/{windowId}/action',
					body: {},
				},
			);

			expect(transport.apiRequest).not.toHaveBeenCalledWith(
				'DELETE',
				'/sessions/existing-session-123',
			);

			expect(result).toEqual({
				sessionId: 'new-session-123',
				windowId: 'new-window-123',
				success: true,
			});
		});

		it("should terminate session when 'autoTerminateSession' is true", async () => {
			const nodeParameters = {
				sessionMode: SESSION_MODE.NEW,
				url: 'https://example.com',
				autoTerminateSession: true,
			};

			await executeRequestWithSessionManagement.call(createMockExecuteFunction(nodeParameters), 0, {
				method: 'POST',
				path: '/sessions/{sessionId}/windows/{windowId}/action',
				body: {},
			});

			expect(transport.apiRequest).toHaveBeenNthCalledWith(
				2,
				'DELETE',
				'/sessions/new-session-123',
			);
		});

		it("should call the operation passed in the 'request' parameter", async () => {
			const nodeParameters = {
				sessionMode: SESSION_MODE.NEW,
				url: 'https://example.com',
				autoTerminateSession: true,
			};

			await executeRequestWithSessionManagement.call(createMockExecuteFunction(nodeParameters), 0, {
				method: 'POST',
				path: '/sessions/{sessionId}/windows/{windowId}/action',
				body: {
					operation: 'test-operation',
				},
			});

			expect(transport.apiRequest).toHaveBeenNthCalledWith(
				1,
				'POST',
				'/sessions/new-session-123/windows/new-window-123/action',
				{
					operation: 'test-operation',
				},
			);
		});
	});

	describe("When 'sessionMode' is 'existing'", () => {
		it('should not create a new session and window', async () => {
			const nodeParameters = {
				sessionMode: SESSION_MODE.EXISTING,
				url: 'https://example.com',
				sessionId: 'existing-session-123',
				windowId: 'existing-window-123',
			};

			await executeRequestWithSessionManagement.call(createMockExecuteFunction(nodeParameters), 0, {
				method: 'POST',
				path: '/sessions/{sessionId}/windows/{windowId}/action',
				body: {},
			});

			expect(transport.apiRequest).toHaveBeenCalledTimes(1);

			expect(transport.apiRequest).toHaveBeenCalledWith(
				'POST',
				'/sessions/existing-session-123/windows/existing-window-123/action',
				{},
			);
		});

		it("should call the operation passed in the 'request' parameter", async () => {
			const nodeParameters = {
				sessionMode: SESSION_MODE.EXISTING,
				url: 'https://example.com',
				sessionId: 'existing-session-123',
				windowId: 'existing-window-123',
			};

			await executeRequestWithSessionManagement.call(createMockExecuteFunction(nodeParameters), 0, {
				method: 'POST',
				path: '/sessions/{sessionId}/windows/{windowId}/action',
				body: {
					operation: 'test-operation',
				},
			});

			expect(transport.apiRequest).toHaveBeenNthCalledWith(
				1,
				'POST',
				'/sessions/existing-session-123/windows/existing-window-123/action',
				{
					operation: 'test-operation',
				},
			);
		});
	});
});
