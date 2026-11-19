import { mock } from 'vitest-mock-extended';
import type { IExecuteFunctions, INode } from 'n8n-workflow';

import { ClickUp } from '../ClickUp.node';

describe('ClickUp', () => {
	const requestWithAuthentication = vi.fn();

	const execute = async (typeVersion: number, operation: string, tagName: string) => {
		const context = mock<IExecuteFunctions>();
		context.getInputData.mockReturnValue([{ json: {} }]);
		context.getNode.mockReturnValue(mock<INode>({ typeVersion }));
		context.getCredentials.mockResolvedValue({ accessToken: 'test-access-token' });
		Object.assign(context.helpers, {
			requestWithAuthentication,
			returnJsonArray: (data: object) => [{ json: data }],
			constructExecutionMetaData: (data: object[]) => data,
		});
		context.getNodeParameter.mockImplementation(
			((name: string) =>
				({
					authentication: 'accessToken',
					resource: 'taskTag',
					operation,
					taskId: '86a1b2c3d',
					tagName,
					additionalFields: {},
				})[name]) as never,
		);

		await new ClickUp().execute.call(context);
		return String(requestWithAuthentication.mock.calls[0][1].uri);
	};

	beforeEach(() => {
		vi.clearAllMocks();
		requestWithAuthentication.mockResolvedValue({});
	});

	describe.each(['add', 'remove'])('taskTag %s', (operation) => {
		it.each([
			[1, '%23urgent', '%23urgent'],
			[1, 'a/b', 'a%2Fb'],
			[1.1, '%23urgent', '%2523urgent'],
			[1.1, '#urgent', '%23urgent'],
		])(
			'should send the tag name for version %s and name %s as %s',
			async (version, name, expected) => {
				expect(await execute(version, operation, name)).toBe(
					`https://api.clickup.com/api/v2/task/86a1b2c3d/tag/${expected}`,
				);
			},
		);
	});
});
