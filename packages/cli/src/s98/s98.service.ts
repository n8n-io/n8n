import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Container, Service } from '@n8n/di';
import axios from 'axios';

@Service()
export class S98Service {
	constructor(
		private readonly logger: Logger,
		private readonly globalConfig: GlobalConfig,
	) {}

	async call(url: string, data: Record<string, any>): Promise<void> {
		const baseUrl = this.globalConfig.endpoints.s98BaseUrl;
		console.log('Called S98Service', this.globalConfig.endpoints, baseUrl);
		await axios.post(baseUrl, data);
	}
}
