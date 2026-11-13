import { requestPath } from 'n8n-workflow';

import * as utils from '../GenericFunctions';

jest.mock('n8n-workflow', () => {
	const original = jest.requireActual('n8n-workflow');
	return {
		...original,
		NodeApiError: jest.fn().mockImplementation(function (
			this: { node: unknown; error: unknown },
			node: unknown,
			error: unknown,
		): never {
			const err = new Error('Mock NodeApiError');
			(err as any).node = node;
			(err as any).error = error;
			return Promise.reject(err) as never;
		}),
	};
});

describe('Facebook GenericFunctions', () => {
	let mockExecuteFunctions: any;

	beforeEach(() => {
		jest.clearAllMocks();

		mockExecuteFunctions = {
			getNode: jest.fn().mockReturnValue({
				name: 'Facebook',
				typeVersion: 1,
			}),
			getCredentials: jest.fn().mockImplementation(async (type) => {
				if (type === 'facebookGraphApi') {
					return { accessToken: 'test-access-token' };
				} else if (type === 'facebookGraphAppApi') {
					return { accessToken: 'test-app-access-token' };
				}
			}),
			helpers: {
				request: jest.fn(),
			},
		};
	});

	describe('facebookApiRequest', () => {
		it('should use correct credentials for regular nodes', async () => {
			mockExecuteFunctions.helpers.request.mockResolvedValue({ success: true });

			await utils.facebookApiRequest.call(
				mockExecuteFunctions,
				'GET',
				requestPath`/me`,
				{},
				{ fields: 'id,name' },
			);

			expect(mockExecuteFunctions.getCredentials).toHaveBeenCalledWith('facebookGraphApi');
			expect(mockExecuteFunctions.helpers.request).toHaveBeenCalledWith({
				headers: { accept: 'application/json,text/*;q=0.99' },
				method: 'GET',
				qs: { access_token: 'test-access-token', fields: 'id,name' },
				body: {},
				gzip: true,
				uri: expect.anything(),
				json: true,
			});
			expect(String(mockExecuteFunctions.helpers.request.mock.calls[0][0].uri)).toBe(
				'https://graph.facebook.com/v23.0/me',
			);
		});

		it('should use app credentials for trigger nodes', async () => {
			mockExecuteFunctions.getNode.mockReturnValue({ name: 'Facebook Trigger' });
			mockExecuteFunctions.helpers.request.mockResolvedValue({ success: true });

			await utils.facebookApiRequest.call(mockExecuteFunctions, 'GET', requestPath`/app`, {}, {});

			expect(mockExecuteFunctions.getCredentials).toHaveBeenCalledWith('facebookGraphAppApi');
			expect(mockExecuteFunctions.helpers.request).toHaveBeenCalledWith(
				expect.objectContaining({
					qs: { access_token: 'test-app-access-token' },
				}),
			);
		});

		it('should encode path values as a single segment', async () => {
			mockExecuteFunctions.helpers.request.mockResolvedValue({ success: true });
			const appId = '123/subscriptions?x=1';

			await utils.facebookApiRequest.call(
				mockExecuteFunctions,
				'GET',
				requestPath`/${appId}/subscriptions`,
				{},
			);

			expect(String(mockExecuteFunctions.helpers.request.mock.calls[0][0].uri)).toBe(
				'https://graph.facebook.com/v23.0/123%2Fsubscriptions%3Fx=1/subscriptions',
			);
		});
	});

	describe('getFields', () => {
		it('should return all fields for a given object with * option first', () => {
			const fields = utils.getFields('page');

			expect(fields.length).toBeGreaterThan(0);
			expect(fields[0]).toEqual({ name: '*', value: '*' });
			expect(fields.some((field) => field.name === 'Feed')).toBeTruthy();
		});

		it('should return only * for unknown objects', () => {
			const fields = utils.getFields('unknown-object');

			expect(fields).toEqual([{ name: '*', value: '*' }]);
		});

		it('should format field names in capital case', () => {
			const fields = utils.getFields('page');
			const findField = (name: string) => fields.find((field) => field.name === name);

			expect(findField('Feed')).toBeDefined();
			expect(findField('Email')).toBeDefined();
			expect(findField('Company Overview')).toBeDefined();
		});
	});

	describe('getAllFields', () => {
		it('should return all field values without *', () => {
			const allFields = utils.getAllFields('page');

			expect(allFields.length).toBeGreaterThan(0);
			expect(allFields.includes('*')).toBeFalsy();
			expect(allFields.includes('feed')).toBeTruthy();
			expect(allFields.includes('email')).toBeTruthy();
		});

		it('should return empty array for unknown objects', () => {
			expect(utils.getAllFields('unknown-object')).toEqual([]);
		});

		it('should return all raw field values', () => {
			const pageFields = utils.getAllFields('page');
			const instagramFields = utils.getAllFields('instagram');

			expect(pageFields).toContain('feed');
			expect(pageFields).toContain('email');
			expect(pageFields).toContain('website');

			expect(instagramFields).toContain('comments');
			expect(instagramFields).toContain('mentions');
		});
	});
});
