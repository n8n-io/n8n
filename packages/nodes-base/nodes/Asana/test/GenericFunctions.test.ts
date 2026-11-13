import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { asanaApiRequest } from '../GenericFunctions';

describe('Asana GenericFunctions', () => {
	const requestWithAuthentication = vi.fn();
	const context = {
		getNodeParameter: vi.fn().mockReturnValue('accessToken'),
		helpers: { requestWithAuthentication },
	} as unknown as IExecuteFunctions;

	it('should encode path values as a single segment', async () => {
		requestWithAuthentication.mockResolvedValue({});
		const taskId = '1204000000000001/projects?x=1';

		await asanaApiRequest.call(context, 'GET', requestPath`/tasks/${taskId}`, {});

		const [, options] = requestWithAuthentication.mock.calls[0];
		expect(String(options.url)).toBe(
			'https://app.asana.com/api/1.0/tasks/1204000000000001%2Fprojects%3Fx=1',
		);
	});
});
