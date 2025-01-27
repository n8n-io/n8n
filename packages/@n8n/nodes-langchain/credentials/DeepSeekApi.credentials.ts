import { OpenAiApi } from 'n8n-nodes-base/dist/credentials/OpenAiApi.credentials';

export class DeepSeekApi extends OpenAiApi {
	name = 'deepseekApi';

	displayName = 'DeepSeek API Platform';

	documentationUrl = 'deepseek';

	constructor() {
		super();

		this.properties = this.properties.filter((property) => {
			if (property.name === 'url') {
				property.default = 'https://api.deepseek.com/v1';
				property.type = 'hidden';
			}
			return ['apiKey', 'url'].includes(property.name);
		});

		this.authenticate.properties.headers = {
			Authorization: '=Bearer {{$credentials.apiKey}}',
		};
	}
}
