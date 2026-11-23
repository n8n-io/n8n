import type { IDataObject, IHookFunctions, ILoadOptionsFunctions } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { ClickUpTrigger } from '../ClickUpTrigger.node';

describe('ClickUpTrigger', () => {
	const baseUrl = 'https://api.clickup.com/api/v2';
	const trigger = new ClickUpTrigger();

	const requestedUrls = (context: IHookFunctions | ILoadOptionsFunctions) =>
		vi
			.mocked(context.helpers.requestWithAuthentication)
			.mock.calls.map(([, options]) => [String(options.method), String(options.uri)]);

	const createContext = (staticData: IDataObject, teamId = '9012345678') => {
		const context = mockDeep<IHookFunctions>();
		context.getNodeParameter.mockImplementation((name: string) => {
			if (name === 'authentication') return 'accessToken';
			if (name === 'team') return teamId;
			if (name === 'events') return ['taskCreated'];
			return {};
		});
		context.getWorkflowStaticData.mockReturnValue(staticData);
		context.getNodeWebhookUrl.mockReturnValue('https://n8n.example.com/webhook/abc');
		context.helpers.requestWithAuthentication.mockResolvedValue({
			webhooks: [],
			webhook: { id: 'wh1', secret: 'secret' },
		});
		return context;
	};

	it('should request the webhook URLs of the team', async () => {
		const context = createContext({ webhookId: 'wh1' });

		await trigger.webhookMethods.default.checkExists.call(context);
		await trigger.webhookMethods.default.create.call(context);
		await trigger.webhookMethods.default.delete.call(context);

		expect(requestedUrls(context)).toEqual([
			['GET', `${baseUrl}/team/9012345678/webhook`],
			['POST', `${baseUrl}/team/9012345678/webhook`],
			['DELETE', `${baseUrl}/webhook/wh1`],
		]);
	});

	it('should encode the team ID as a single segment', async () => {
		const context = createContext({}, '9012345678/webhook/wh2');

		await trigger.webhookMethods.default.create.call(context);

		expect(requestedUrls(context)).toEqual([
			['POST', `${baseUrl}/team/9012345678%2Fwebhook%2Fwh2/webhook`],
		]);
	});

	it('should return false on delete when no webhook ID is stored', async () => {
		const context = createContext({});

		await expect(trigger.webhookMethods.default.delete.call(context)).resolves.toBe(false);
		expect(context.helpers.requestWithAuthentication).not.toHaveBeenCalled();
	});

	it('should request the teams for the load options', async () => {
		const context = mockDeep<ILoadOptionsFunctions>();
		context.getNodeParameter.mockReturnValue('accessToken');
		context.helpers.requestWithAuthentication.mockResolvedValue({
			teams: [{ id: '9012345678', name: 'Team' }],
		});

		await expect(trigger.methods.loadOptions.getTeams.call(context)).resolves.toEqual([
			{ name: 'Team', value: '9012345678' },
		]);
		expect(requestedUrls(context)).toEqual([['GET', `${baseUrl}/team`]]);
	});
});
