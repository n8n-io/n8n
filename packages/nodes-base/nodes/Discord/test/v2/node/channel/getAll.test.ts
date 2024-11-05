import type { INodeTypes } from 'n8n-workflow';
import nock from 'nock';
import * as transport from '../../../../v2/transport/discord.api';
import { getResultNodeData, setup, workflowToTests } from '@test/nodes/Helpers';
import type { WorkflowTestData } from '@test/nodes/types';
import { executeWorkflow } from '@test/nodes/ExecuteWorkflow';

const discordApiRequestSpy = jest.spyOn(transport, 'discordApiRequest');

discordApiRequestSpy.mockImplementation(async (method: string) => {
	if (method === 'GET') {
		return [
			{
				id: '1168516063340789831',
				type: 4,
				flags: 0,
				guild_id: '1168516062791340136',
				name: 'Text Channels',
				parent_id: null,
				position: 0,
				permission_overwrites: [],
			},
			{
				id: '1168516063340789832',
				type: 4,
				flags: 0,
				guild_id: '1168516062791340136',
				name: 'Voice Channels',
				parent_id: null,
				position: 0,
				permission_overwrites: [],
			},
			{
				id: '1168516063340789833',
				type: 0,
				last_message_id: '1168518371239792720',
				flags: 0,
				guild_id: '1168516062791340136',
				name: 'general',
				parent_id: '1168516063340789831',
				rate_limit_per_user: 0,
				topic: null,
				position: 0,
				permission_overwrites: [],
				nsfw: false,
				icon_emoji: {
					id: null,
					name: '👋',
				},
				theme_color: null,
			},
			{
				id: '1168516063340789834',
				type: 2,
				last_message_id: null,
				flags: 0,
				guild_id: '1168516062791340136',
				name: 'General',
				parent_id: '1168516063340789832',
				rate_limit_per_user: 0,
				bitrate: 64000,
				user_limit: 0,
				rtc_region: null,
				position: 0,
				permission_overwrites: [],
				nsfw: false,
				icon_emoji: {
					id: null,
					name: '🎙️',
				},
				theme_color: null,
			},
			{
				id: '1168516240332034067',
				type: 0,
				last_message_id: null,
				flags: 0,
				guild_id: '1168516062791340136',
				name: 'first-channel',
				parent_id: '1168516063340789831',
				rate_limit_per_user: 30,
				topic: 'This is channel topic',
				position: 3,
				permission_overwrites: [],
				nsfw: true,
			},
			{
				id: '1168516269079793766',
				type: 0,
				last_message_id: null,
				flags: 0,
				guild_id: '1168516062791340136',
				name: 'second',
				parent_id: '1168516063340789831',
				rate_limit_per_user: 0,
				topic: null,
				position: 2,
				permission_overwrites: [],
				nsfw: false,
			},
		];
	}
});

describe('Test DiscordV2, channel => getAll', () => {
	const workflows = ['nodes/Discord/test/v2/node/channel/getAll.workflow.json'];
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
			'/guilds/1168516062791340136/channels',
		);

		expect(result.finished).toEqual(true);
	};

	for (const testData of tests) {
		test(testData.description, async () => await testNode(testData, nodeTypes));
	}
});
