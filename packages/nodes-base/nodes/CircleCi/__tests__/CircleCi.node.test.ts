import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions, INode } from 'n8n-workflow';

import { CircleCi } from '../CircleCi.node';

describe('CircleCi', () => {
	const request = jest.fn();

	const execute = async (typeVersion: number, projectSlug: string) => {
		const context = mock<IExecuteFunctions>();
		context.getInputData.mockReturnValue([{ json: {} }]);
		context.getNode.mockReturnValue(mock<INode>({ typeVersion }));
		context.getCredentials.mockResolvedValue({ apiKey: 'test-api-key' });
		Object.assign(context.helpers, {
			request,
			returnJsonArray: (data: object) => [{ json: data }],
			constructExecutionMetaData: (data: object[]) => data,
		});
		context.getNodeParameter.mockImplementation(
			((name: string) =>
				({
					resource: 'pipeline',
					operation: 'get',
					vcs: 'github',
					projectSlug,
					pipelineNumber: 1,
				})[name]) as never,
		);

		await new CircleCi().execute.call(context);
		return String(request.mock.calls[0][0].uri);
	};

	beforeEach(() => {
		jest.clearAllMocks();
		request.mockResolvedValue({});
	});

	it.each([
		[1, 'org%2Frepo', 'org%2Frepo'],
		[1, 'org/repo', 'org%2Frepo'],
		[1.1, 'org%2Frepo', 'org%252Frepo'],
		[1.1, 'org/repo', 'org%2Frepo'],
	])(
		'should send the project slug for version %s and slug %s as %s',
		async (version, slug, expected) => {
			expect(await execute(version, slug)).toBe(
				`https://circleci.com/api/v2/project/github/${expected}/pipeline/1`,
			);
		},
	);
});
