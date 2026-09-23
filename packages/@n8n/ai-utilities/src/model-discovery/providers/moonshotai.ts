import { makeBearerDataListing } from '../request';

/** Recognize the official Moonshot and Kimi Code API hosts. */
export function isMoonshotAiEndpoint(baseURL: string): boolean {
	try {
		return ['api.moonshot.ai', 'api.moonshot.cn', 'api.kimi.ai', 'api.kimi.com'].includes(
			new URL(baseURL).hostname,
		);
	} catch {
		return false;
	}
}

/** Source: LmChatMoonshot `loadOptions` routing. */
export const listMoonshotAiModels = makeBearerDataListing(
	'moonshotai',
	'https://api.moonshot.ai/v1',
);
