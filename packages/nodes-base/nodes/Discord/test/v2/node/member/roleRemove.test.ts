import type { INodeTypes } from 'n8n-workflow';
import nock from 'nock';
import * as transport from '../../../../v2/transport/discord.api';
import { getResultNodeData, setup, workflowToTests } from '@test/nodes/Helpers';
import type { WorkflowTestData } from '@test/nodes/types';
import { executeWorkflow } from '@test/nodes/ExecuteWorkflow';

const discordApiRequestSpy = jest.spyOn(transport, 'discordApiRequest');

discordApiRequestSpy.mockImplementation(async (method: string) => {
	if (method === 'DELETE') {
		return {
			success: true,
		};
	}
});

describe('Test DiscordV2, member => roleRemove', () => {
	const workflows = ['nodes/Discord/test/v2/node/member/roleRemove.workflow.json'];
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

		expect(discordApiRequestSpy).toHaveBeenCalledTimes(3);
		expect(discordApiRequestSpy).toHaveBeenCalledWith(
			'DELETE',
			'/guilds/1168516062791340136/members/470936827994570762/roles/1168773588963299428',
		);
		expect(discordApiRequestSpy).toHaveBeenCalledWith(
			'DELETE',
			'/guilds/1168516062791340136/members/470936827994570762/roles/1168773645800308756',
		);
		expect(discordApiRequestSpy).toHaveBeenCalledWith(
			'DELETE',
			'/guilds/1168516062791340136/members/470936827994570762/roles/1168772374540320890',
		);

		expect(result.finished).toEqual(true);
	};

	for (const testData of tests) {
		test(testData.description, async () => await testNode(testData, nodeTypes));
	}
});
