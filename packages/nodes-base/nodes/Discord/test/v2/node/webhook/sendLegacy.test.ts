import type { INodeTypes } from 'n8n-workflow';
import nock from 'nock';
import * as transport from '../../../../v2/transport/discord.api';
import { getResultNodeData, setup, workflowToTests } from '@test/nodes/Helpers';
import type { WorkflowTestData } from '@test/nodes/types';
import { executeWorkflow } from '@test/nodes/ExecuteWorkflow';

const discordApiRequestSpy = jest.spyOn(transport, 'discordApiRequest');

discordApiRequestSpy.mockImplementation(async (method: string) => {
	if (method === 'POST') {
		return {
			id: '1168768986385747999',
			type: 0,
			content: 'TEST Message',
			channel_id: '1074646335082479626',
			author: {
				id: '1153265494955135077',
				username: 'TEST_USER',
				avatar: null,
				discriminator: '0000',
				public_flags: 0,
				flags: 0,
				bot: true,
				global_name: null,
			},
			attachments: [],
			embeds: [
				{
					type: 'rich',
					description: 'some description',
					color: 10930459,
					timestamp: '2023-10-17T21:00:00+00:00',
					author: {
						name: 'Michael',
					},
				},
			],
			mentions: [],
			mention_roles: [],
			pinned: false,
			mention_everyone: false,
			tts: true,
			timestamp: '2023-10-31T04:30:41.032000+00:00',
			edited_timestamp: null,
			flags: 4096,
			components: [],
			webhook_id: '1153265494955135077',
		};
	}
});

describe('Test DiscordV2, webhook => sendLegacy', () => {
	const workflows = ['nodes/Discord/test/v2/node/webhook/sendLegacy.workflow.json'];
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
			'POST',
			'',
			{
				content: 'TEST Message',
				embeds: [
					{
						author: { name: 'Michael' },
						color: 10930459,
						description: 'some description',
						timestamp: '2023-10-17T21:00:00.000Z',
					},
				],
				flags: 4096,
				tts: true,
				username: 'TEST_USER',
			},
			{ wait: true },
		);

		expect(result.finished).toEqual(true);
	};

	for (const testData of tests) {
		test(testData.description, async () => await testNode(testData, nodeTypes));
	}
});
