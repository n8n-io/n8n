import * as save from '../../../actions/session/save.operation';
import { ERROR_MESSAGES } from '../../../constants';
import * as transport from '../../../transport';
import { createMockExecuteFunction } from '../helpers';

jest.mock('../../../transport', () => {
	const originalModule = jest.requireActual<typeof transport>('../../../transport');
	return {
		...originalModule,
		apiRequest: jest.fn(async function () {
			return {
				status: 'success',
				message: 'Profile will be saved on session termination',
			};
		}),
	};
});

const baseParameters = {
	resource: 'session',
	operation: 'save',
	sessionId: 'test-session-123',
	profileName: 'test-profile',
};

describe('Test Airtop, session save operation', () => {
	afterAll(() => {
		jest.unmock('../../../transport');
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should save a profile on session termination successfully', async () => {
		const nodeParameters = {
			...baseParameters,
		};

		const result = await save.execute.call(createMockExecuteFunction(nodeParameters), 0);

		expect(transport.apiRequest).toHaveBeenCalledTimes(1);
		expect(transport.apiRequest).toHaveBeenCalledWith(
			'PUT',
			'/sessions/test-session-123/save-profile-on-termination/test-profile',
		);

		expect(result).toEqual([
			{
				json: {
					sessionId: 'test-session-123',
					profileName: 'test-profile',
					status: 'success',
					message: 'Profile will be saved on session termination',
				},
			},
		]);
	});

	it('should throw error when sessionId is empty', async () => {
		const nodeParameters = {
			...baseParameters,
			sessionId: '',
		};

		await expect(save.execute.call(createMockExecuteFunction(nodeParameters), 0)).rejects.toThrow(
			ERROR_MESSAGES.SESSION_ID_REQUIRED,
		);
	});

	it('should throw error when sessionId is whitespace', async () => {
		const nodeParameters = {
			...baseParameters,
			sessionId: '   ',
		};

		await expect(save.execute.call(createMockExecuteFunction(nodeParameters), 0)).rejects.toThrow(
			ERROR_MESSAGES.SESSION_ID_REQUIRED,
		);
	});

	it('should throw error when profileName is empty', async () => {
		const nodeParameters = {
			...baseParameters,
			profileName: '',
		};

		await expect(save.execute.call(createMockExecuteFunction(nodeParameters), 0)).rejects.toThrow(
			"Please fill the 'Profile Name' parameter",
		);
	});

	it('should throw error when profileName is whitespace', async () => {
		const nodeParameters = {
			...baseParameters,
			profileName: '   ',
		};

		await expect(save.execute.call(createMockExecuteFunction(nodeParameters), 0)).rejects.toThrow(
			"Please fill the 'Profile Name' parameter",
		);
	});
});
