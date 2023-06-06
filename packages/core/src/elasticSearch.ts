import { LoggerProxy as Logger } from 'n8n-workflow';
// eslint-disable-next-line import/no-extraneous-dependencies
import { Client } from '@elastic/elasticsearch';

export class ElasticSearchClient {
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
			Logger.debug(`ElasticSearch: Added Execution:${executionId} to index:${this.index}`);
		} catch (error) {
			Logger.error(
				// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
				`ElasticSearch: Was not able to add Execution:${executionId} to index:${this.index}, error: ${error}`,
			);
		}
	};

	searchDocuments = async (text: string) => {
		try {
			const { body }: any = await this.client.search({
				index: this.index,
				body: {
					query: {
						match: {
							your_field: text, // Replace with the field you want to search within
						},
					},
					_source: false, // Exclude document content, retrieve only keys
				},
			});

			// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return
			const keys = body.hits.hits.map((hit: any) => hit._id);
			console.log('Relevant keys:', keys);
		} catch (error) {
			console.error('Error searching documents:', error);
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
