import type {
	IDataObject,
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IRequestOptions,
} from 'n8n-workflow';

export const getCredentialsType = (authentication: string) => {
	let credentialType = '';
	switch (authentication) {
		case 'botToken':
			credentialType = 'discordBotApi';
			break;
		case 'oAuth2':
			credentialType = 'discordOAuth2Api';
			break;
		case 'webhook':
			credentialType = 'discordWebhookApi';
			break;
		default:
			credentialType = 'discordBotApi';
	}
	return credentialType;
};

export async function requestApi(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	options: IRequestOptions,
	credentialType: string,
	endpoint: string,
) {
	let response;
	if (credentialType === 'discordOAuth2Api' && endpoint !== '/users/@me/guilds') {
		const credentials = await this.getCredentials('discordOAuth2Api');
		(options.headers as IDataObject).Authorization = `Bot ${credentials.botToken}`;
		response = await this.helpers.request({ ...options, resolveWithFullResponse: true });
	} else {
		response = await this.helpers.requestWithAuthentication.call(this, credentialType, {
			...options,
			resolveWithFullResponse: true,
		});
	}
	return response;
}
