import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import { SEND_AND_WAIT_OPERATION, type IExecuteFunctions } from 'n8n-workflow';

import { versionDescription } from '../../../../v2/actions/versionDescription';
import { DiscordV2 } from '../../../../v2/DiscordV2.node';
import * as transport from '../../../../v2/transport/discord.api';

jest.mock('../../../../v2/transport/discord.api', () => {
	const originalModule = jest.requireActual('../../../../v2/transport/discord.api');
	return {
		...originalModule,
		discordApiRequest: jest.fn(async function (method: string) {
			if (method === 'POST') {
				return {};
			}
		}),
	};
});

describe('Test DiscordV2, message => sendAndWait', () => {
	let discord: DiscordV2;
	let mockExecuteFunctions: MockProxy<IExecuteFunctions>;

	beforeEach(() => {
		discord = new DiscordV2(versionDescription);
		mockExecuteFunctions = mock<IExecuteFunctions>();
		mockExecuteFunctions.helpers = {
			constructExecutionMetaData: jest.fn(() => []),
			returnJsonArray: jest.fn(() => []),
		} as any;
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should send message and put execution to wait', async () => {
		const items = [{ json: { data: 'test' } }];
		mockExecuteFunctions.getNodeParameter.mockImplementation((key: string) => {
			if (key === 'operation') return SEND_AND_WAIT_OPERATION;
			if (key === 'resource') return 'message';
			if (key === 'authentication') return 'botToken';
			if (key === 'message') return 'my message';
			if (key === 'subject') return '';
			if (key === 'approvalOptions.values') return {};
			if (key === 'responseType') return 'approval';
			if (key === 'sendTo') return 'channel';
			if (key === 'channelId') return 'channelID';
			if (key === 'options.limitWaitTime.values') return {};
		});

		mockExecuteFunctions.putExecutionToWait.mockImplementation();
		mockExecuteFunctions.getInputData.mockReturnValue(items);
		mockExecuteFunctions.getInstanceId.mockReturnValue('instanceId');

		mockExecuteFunctions.evaluateExpression.mockReturnValueOnce('http://localhost/waiting-webhook');
		mockExecuteFunctions.evaluateExpression.mockReturnValueOnce('nodeID');

		mockExecuteFunctions.getSignedResumeUrl.mockReturnValue(
			'http://localhost/waiting-webhook/nodeID?approved=true&token=abc',
		);

		const result = await discord.execute.call(mockExecuteFunctions);

		expect(result).toEqual([items]);
		expect(transport.discordApiRequest).toHaveBeenCalledTimes(1);
		expect(mockExecuteFunctions.putExecutionToWait).toHaveBeenCalledTimes(1);

		expect(transport.discordApiRequest).toHaveBeenCalledWith(
			'POST',
			'/channels/channelID/messages',
			{
				components: [
					{
						components: [
							{
								label: 'Approve',
								style: 5,
								type: 2,
								url: 'http://localhost/waiting-webhook/nodeID?approved=true&token=abc',
							},
						],
						type: 1,
					},
				],
				embeds: [
					{
						color: 5814783,
						description:
							'my message\n\n_This message was sent automatically with _[n8n](https://n8n.io/?utm_source=n8n-internal&utm_medium=powered_by&utm_campaign=n8n-nodes-base.discord_instanceId)',
					},
				],
			},
		);
	});

	const setupErrorParameters = () => {
		mockExecuteFunctions.getNodeParameter.mockImplementation((key: string) => {
			if (key === 'operation') return SEND_AND_WAIT_OPERATION;
			if (key === 'resource') return 'message';
			if (key === 'authentication') return 'botToken';
			if (key === 'message') return 'my message';
			if (key === 'subject') return '';
			if (key === 'approvalOptions.values') return {};
			if (key === 'responseType') return 'approval';
			if (key === 'sendTo') return 'channel';
			if (key === 'channelId') return 'channelID';
			if (key === 'options.limitWaitTime.values') return {};
		});
		mockExecuteFunctions.getInputData.mockReturnValue([{ json: { data: 'test' } }]);
		mockExecuteFunctions.getInstanceId.mockReturnValue('instanceId');
		mockExecuteFunctions.getSignedResumeUrl.mockReturnValue(
			'http://localhost/waiting-webhook/nodeID?approved=true&token=abc',
		);
	};

	it('should route API errors to error output and skip putExecutionToWait when continueOnFail is true', async () => {
		setupErrorParameters();
		mockExecuteFunctions.continueOnFail.mockReturnValue(true);

		(transport.discordApiRequest as jest.Mock).mockRejectedValueOnce(
			Object.assign(new Error('channel_not_found'), { description: 'channel_not_found' }),
		);

		const result = await discord.execute.call(mockExecuteFunctions);

		expect(result).toEqual([[{ json: { error: expect.any(String) } }]]);
		expect(mockExecuteFunctions.putExecutionToWait).not.toHaveBeenCalled();
		expect((result?.[0]?.[0] as { json: { error: string } }).json.error).toBeTruthy();
	});

	it('should rethrow API errors and skip putExecutionToWait when continueOnFail is false', async () => {
		setupErrorParameters();
		mockExecuteFunctions.continueOnFail.mockReturnValue(false);

		(transport.discordApiRequest as jest.Mock).mockRejectedValueOnce(
			Object.assign(new Error('channel_not_found'), { description: 'channel_not_found' }),
		);

		await expect(discord.execute.call(mockExecuteFunctions)).rejects.toThrow();
		expect(mockExecuteFunctions.putExecutionToWait).not.toHaveBeenCalled();
	});
});
