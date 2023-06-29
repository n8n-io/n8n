/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { LoggerProxy as Logger } from 'n8n-workflow';
// eslint-disable-next-line import/no-extraneous-dependencies
import { Client } from '@elastic/elasticsearch';

export class ElasticSearchCoreClient {
	index: string;

	client: Client;

	constructor() {
		this.client = this.setupClient();
		this.index = process.env.FOUNDELASTICSEARCH_INDEX ?? '0';
	}

	addDocument = async (executionId: string, data: any) => {
		this.cleanLargeValues(data);
		const document = {
			index: this.index,
			id: executionId,
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			body: data,
		};
		try {
			await this.client.index(document);
			Logger.debug(`ElasticSearch: Adding Execution:${executionId} to index:${this.index}`);
		} catch (error) {
			Logger.error(
				// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
				`ElasticSearch: Was not able to add Execution:${executionId} to index:${this.index}, error: ${error}`,
			);
		}
	};

	setupClient = (): Client => {
		const clientUrl: string = process.env.FOUNDELASTICSEARCH_URL ?? 'http://localhost:9200';
		if (clientUrl === 'http://localhost:9200') {
			return new Client({ node: clientUrl });
		} else {
			const apiKey: string = process.env.FOUNDELASTICSEARCH_APIKEY ?? '';
			if (!apiKey) {
				Logger.warn(' Elastic search is not local and an api key is not configured');
			}
			return new Client({
				node: clientUrl,
				auth: {
					apiKey,
				},
			});
		}
	};

	cleanLargeValues = (obj: any): void => {
		// Making sure we're not pushing to elastic large strings or images
		// If we found a large value then we just remove it from the global json
		const MAXIMUM_STRING_LENGTH = 1024;
		if (typeof obj === 'object' && obj !== null) {
			for (const key in obj) {
				if (
					typeof obj[key] === 'string' &&
					// eslint-disable-next-line @typescript-eslint/no-unsafe-call
					(obj[key].length > MAXIMUM_STRING_LENGTH || obj[key].startsWith('data:image'))
				) {
					delete obj[key];
				} else {
					this.cleanLargeValues(obj[key]);
				}
			}
		}
	};
}
