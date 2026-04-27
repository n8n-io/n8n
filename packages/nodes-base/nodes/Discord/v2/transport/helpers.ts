import type {
	IDataObject,
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IRequestOptions,
} from 'n8n-workflow';
import { sleep } from 'n8n-workflow';

const MAX_RATE_LIMIT_RETRIES = 3;
const MAX_RATE_LIMIT_SLEEP_MS = 60_000;
const FALLBACK_RETRY_AFTER_MS = 1_000;
const GLOBAL_RATE_LIMIT_SLEEP_MS = 20;

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

const secondsToMs = (value: unknown): number => {
	const seconds = Number(value);
	if (!Number.isFinite(seconds) || seconds <= 0) return 0;
	return Math.min(seconds * 1000, MAX_RATE_LIMIT_SLEEP_MS);
};

export async function handleRateLimitHeaders(headers: IDataObject | undefined) {
	if (Number(headers?.['x-ratelimit-remaining']) === 0) {
		await sleep(secondsToMs(headers?.['x-ratelimit-reset-after']));
	} else {
		await sleep(GLOBAL_RATE_LIMIT_SLEEP_MS); // prevent exceeding global rate limit of 50 requests per second
	}
}

function isRateLimitError(
	error: unknown,
): error is { statusCode: 429; response?: { headers?: IDataObject } } {
	return (error as { statusCode?: unknown })?.statusCode === 429;
}

export async function requestApi(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	options: IRequestOptions,
	credentialType: string,
	endpoint: string,
) {
	const useCustomAuth = credentialType === 'discordOAuth2Api' && endpoint !== '/users/@me/guilds';

	if (useCustomAuth) {
		const credentials = await this.getCredentials('discordOAuth2Api');
		(options.headers as IDataObject).Authorization = `Bot ${credentials.botToken}`;
	}

	const requestOptions = { ...options, resolveWithFullResponse: true };

	let attempt = 0;
	for (;;) {
		try {
			if (useCustomAuth) {
				return await this.helpers.request(requestOptions);
			}
			return await this.helpers.requestWithAuthentication.call(
				this,
				credentialType,
				requestOptions,
			);
		} catch (error) {
			if (!isRateLimitError(error) || attempt === MAX_RATE_LIMIT_RETRIES) {
				throw error;
			}
			const waitMs =
				secondsToMs(error.response?.headers?.['retry-after']) || FALLBACK_RETRY_AFTER_MS;
			await sleep(waitMs);
			attempt++;
		}
	}
}
