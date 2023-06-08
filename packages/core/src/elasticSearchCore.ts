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
}
