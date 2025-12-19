import { Config, Env } from '../decorators';

class RequestHeaders {
	[key: string]: string;

	constructor(headers: string) {
		const headersMap = headers
			.split('\\n')
			.map((entry) => entry.trim())
			.filter((entry) => entry)
			.reduce<Record<string, string>>((result, current) => {
				const [key, ...values] = current.split(':');
				result[key.trim()] = values.join(':').trim();

				return result;
			}, {});

		return headersMap;
	}
}

@Config
export class AiConfig {
	/** Whether AI features are enabled. */
	@Env('N8N_AI_ENABLED')
	enabled: boolean = false;

	/** Default headers sent with each request to OpenAI. Separate multiple headers with "\n" */
	@Env('N8N_AI_OPENAI_DEFAULT_HEADERS')
	// eslint-disable-next-line @typescript-eslint/naming-convention
	openAiDefaultHeaders: RequestHeaders = { 'openai-platform': 'org-qkmJQuJ2WnvoIKMr2UJwIJkZ' };
}
