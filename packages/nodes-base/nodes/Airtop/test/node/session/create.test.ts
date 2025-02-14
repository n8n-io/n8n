import nock from 'nock';

import * as create from '../../../actions/session/create.operation';
import * as transport from '../../../transport';
import { createMockExecuteFunction } from '../helpers';

jest.mock('../../../transport', () => {
	const originalModule = jest.requireActual<typeof transport>('../../../transport');
	return {
		...originalModule,
		apiRequest: jest.fn(async function () {
			return {
				sessionId: 'test-session-123',
				status: 'success',
			};
		}),
	};
});

describe('Test Airtop, session create operation', () => {
	beforeAll(() => {
		nock.disableNetConnect();
	});

	afterAll(() => {
		nock.restore();
		jest.unmock('../../../transport');
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should create a session with minimal parameters', async () => {
		const nodeParameters = {
			resource: 'session',
			operation: 'create',
			profileName: 'test-profile',
			timeoutMinutes: 10,
			saveProfileOnTermination: false,
		};

		const result = await create.execute.call(createMockExecuteFunction(nodeParameters), 0);

		expect(transport.apiRequest).toHaveBeenCalledTimes(1);
		expect(transport.apiRequest).toHaveBeenCalledWith(
			'POST',
			'https://portal-api.airtop.ai/integrations/v1/no-code/create-session',
			{
				configuration: {
					profileName: 'test-profile',
					timeoutMinutes: 10,
				},
			},
		);

		expect(result).toEqual([
			{
				json: {
					sessionId: 'test-session-123',
				},
			},
		]);
	});

	it('should create a session with save profile enabled', async () => {
		const nodeParameters = {
			resource: 'session',
			operation: 'create',
			profileName: 'test-profile',
			timeoutMinutes: 15,
			saveProfileOnTermination: true,
		};

		const result = await create.execute.call(createMockExecuteFunction(nodeParameters), 0);

		expect(transport.apiRequest).toHaveBeenCalledTimes(2);
		expect(transport.apiRequest).toHaveBeenNthCalledWith(
			1,
			'POST',
			'https://portal-api.airtop.ai/integrations/v1/no-code/create-session',
			{
				configuration: {
					profileName: 'test-profile',
					timeoutMinutes: 15,
				},
			},
		);
		expect(transport.apiRequest).toHaveBeenNthCalledWith(
			2,
			'PUT',
			'/sessions/test-session-123/save-profile-on-termination/test-profile',
		);

		expect(result).toEqual([
			{
				json: {
					sessionId: 'test-session-123',
				},
			},
		]);
	});
});
