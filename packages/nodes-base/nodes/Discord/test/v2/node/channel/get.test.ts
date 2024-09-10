import type { INodeTypes, IRequestOptions } from 'n8n-workflow';
import nock from 'nock';
import * as transport from '../../../../v2/transport/helpers';
import { getResultNodeData, setup, workflowToTests } from '@test/nodes/Helpers';
import type { WorkflowTestData } from '@test/nodes/types';
import { executeWorkflow } from '@test/nodes/ExecuteWorkflow';

// TODO: use nock
const requestApiSpy = jest.spyOn(transport, 'requestApi');

requestApiSpy.mockImplementation(
	async (_options: IRequestOptions, _credentialType: string, endpoint: string) => {
		if (endpoint === '/users/@me/guilds') {
			return {
				headers: {},
				body: [
					{
						id: '1168516062791340136',
					},
				],
			};
		} else {
			return {
				headers: {},
				body: {
					id: '1168516240332034067',
					type: 0,
					last_message_id: null,
					flags: 0,
					guild_id: '1168516062791340136',
					name: 'first',
					parent_id: '1168516063340789831',
					rate_limit_per_user: 0,
					topic: null,
					position: 1,
					permission_overwrites: [],
					nsfw: false,
				},
			};
		}
	},
);

describe('Test DiscordV2, channel => get', () => {
	const workflows = ['nodes/Discord/test/v2/node/channel/get.workflow.json'];
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

		expect(requestApiSpy).toHaveBeenCalledTimes(3);
		expect(requestApiSpy).toHaveBeenCalledWith(
			{
				body: undefined,
				headers: {},
				json: true,
				method: 'GET',
				qs: undefined,
				url: 'https://discord.com/api/v10/users/@me/guilds',
			},
			'discordOAuth2Api',
			'/users/@me/guilds',
		);
		expect(requestApiSpy).toHaveBeenCalledWith(
			{
				body: undefined,
				headers: {},
				json: true,
				method: 'GET',
				qs: undefined,
				url: 'https://discord.com/api/v10/channels/1168516240332034067',
			},
			'discordOAuth2Api',
			'/channels/1168516240332034067',
		);
		expect(requestApiSpy).toHaveBeenCalledWith(
			{
				body: undefined,
				headers: {},
				json: true,
				method: 'GET',
				qs: undefined,
				url: 'https://discord.com/api/v10/channels/1168516240332034067',
			},
			'discordOAuth2Api',
			'/channels/1168516240332034067',
		);

		expect(result.finished).toEqual(true);
	};

	for (const testData of tests) {
		test(testData.description, async () => await testNode(testData, nodeTypes));
	}
});
