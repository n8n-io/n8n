import type { INodeTypes } from 'n8n-workflow';
import nock from 'nock';
import * as transport from '../../../../v2/transport/discord.api';
import { getResultNodeData, setup, workflowToTests } from '@test/nodes/Helpers';
import type { WorkflowTestData } from '@test/nodes/types';
import { executeWorkflow } from '@test/nodes/ExecuteWorkflow';

const discordApiRequestSpy = jest.spyOn(transport, 'discordApiRequest');

discordApiRequestSpy.mockImplementation(async (method: string) => {
	if (method === 'GET') {
		return {
			id: '1168777380144369718',
			channel_id: '1168516240332034067',
			author: {
				id: '1070667629972430879',
				username: 'n8n-node-overhaul',
				avatar: null,
				discriminator: '1037',
				public_flags: 0,
				premium_type: 0,
				flags: 0,
				bot: true,
				banner: null,
				accent_color: null,
				global_name: null,
				avatar_decoration_data: null,
				banner_color: null,
			},
			content: 'msg 3',
			timestamp: '2023-10-31T05:04:02.260000+00:00',
			type: 0,
		};
	}
});

describe('Test DiscordV2, message => get', () => {
	const workflows = ['nodes/Discord/test/v2/node/message/get.workflow.json'];
	const tests = workflowToTests(workflows);

	beforeAll(() => {
		nock.disableNetConnect();
	});

	afterAll(() => {
		nock.restore();
		jest.resetAllMocks();
	});

	const nodeTypes = setup(tests);

	const testNode = async (testData: WorkflowTestData, types: INodeTypes) => {
		const { result } = await executeWorkflow(testData, types);

		const resultNodeData = getResultNodeData(result, testData);

		resultNodeData.forEach(({ nodeName, resultData }) => {
			return expect(resultData).toEqual(testData.output.nodeData[nodeName]);
		});

		expect(discordApiRequestSpy).toHaveBeenCalledTimes(1);
		expect(discordApiRequestSpy).toHaveBeenCalledWith(
			'GET',
			'/channels/1168516240332034067/messages/1168777380144369718',
		);

		expect(result.finished).toEqual(true);
	};

	for (const testData of tests) {
		test(testData.description, async () => await testNode(testData, nodeTypes));
	}
});
