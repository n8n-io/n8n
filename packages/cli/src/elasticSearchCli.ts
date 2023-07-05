import { LoggerProxy as Logger } from 'n8n-workflow';
// eslint-disable-next-line import/no-extraneous-dependencies
import { Client } from '@elastic/elasticsearch';
import isEmpty from 'lodash/isEmpty';

export class ElasticSearchClient {
	index: string;

	client: Client;

	constructor() {
		this.client = this.setupClient();
		this.index = process.env.FOUNDELASTICSEARCH_INDEX ?? '0';
	}

	searchDocuments = async (text: string): Promise<any> => {
		try {
			Logger.debug(` Elastic search advanced search: Looking for executions with string: ${text}`);
			const { hits }: any = await this.client.search({
				index: this.index,
				body: {
					query: {
						query_string: {
							query: `*${text}*`,
						},
					},
				},
			});

			// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return
			const executionIds = hits?.hits?.map((hit: any) => hit._id);
			Logger.debug(
				` Elastic search advanced search: Relevant executions for text: ${text}, execution list: ${executionIds}`,
			);
			return executionIds;
		} catch (error) {
			Logger.error(`Elastic search advanced search: Error searching documents:${error}`);
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
