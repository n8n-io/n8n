import { NodeConnectionTypes } from 'n8n-workflow';
import type { IDisplayOptions, INodeProperties } from 'n8n-workflow';

export const metadataFilterField: INodeProperties = {
	displayName: 'Metadata Filter',
	name: 'metadata',
	type: 'fixedCollection',
	description: 'Metadata to filter the document by',
	typeOptions: {
		multipleValues: true,
	},
	default: {},
	placeholder: 'Add filter field',
	options: [
		{
			name: 'metadataValues',
			displayName: 'Fields to Set',
			values: [
				{
					displayName: 'Name',
					name: 'name',
					type: 'string',
					default: '',
					required: true,
				},
				{
					displayName: 'Value',
					name: 'value',
					type: 'string',
					default: '',
				},
			],
		},
	],
};

export function getTemplateNoticeField(templateId: number): INodeProperties {
	return {
		displayName: `Save time with an <a href="/templates/${templateId}" target="_blank">example</a> of how this node works`,
		name: 'notice',
		type: 'notice',
		default: '',
	};
}

export function getBatchingOptionFields(
	displayOptions: IDisplayOptions | undefined,
	defaultBatchSize: number = 5,
): INodeProperties {
	return {
		displayName: 'Batch Processing',
		name: 'batching',
		type: 'collection',
		placeholder: 'Add Batch Processing Option',
		description: 'Batch processing options for rate limiting',
		default: {},
		options: [
			{
				displayName: 'Batch Size',
				name: 'batchSize',
				default: defaultBatchSize,
				type: 'number',
				description:
					'How many items to process in parallel. This is useful for rate limiting, but might impact the log output ordering.',
			},
			{
				displayName: 'Delay Between Batches',
				name: 'delayBetweenBatches',
				default: 0,
				type: 'number',
				description: 'Delay in milliseconds between batches. This is useful for rate limiting.',
			},
		],
		displayOptions,
	};
}

const connectionsString = {
	[NodeConnectionTypes.AiAgent]: {
		// Root AI view
		connection: '',
		locale: 'AI Agent',
	},
	[NodeConnectionTypes.AiChain]: {
		// Root AI view
		connection: '',
		locale: 'AI Chain',
	},
	[NodeConnectionTypes.AiDocument]: {
		connection: NodeConnectionTypes.AiDocument,
		locale: 'Document Loader',
	},
	[NodeConnectionTypes.AiVectorStore]: {
		connection: NodeConnectionTypes.AiVectorStore,
		locale: 'Vector Store',
	},
	[NodeConnectionTypes.AiRetriever]: {
		connection: NodeConnectionTypes.AiRetriever,
		locale: 'Vector Store Retriever',
	},
};

type AllowedConnectionTypes =
	| typeof NodeConnectionTypes.AiAgent
	| typeof NodeConnectionTypes.AiChain
	| typeof NodeConnectionTypes.AiDocument
	| typeof NodeConnectionTypes.AiVectorStore
	| typeof NodeConnectionTypes.AiRetriever;

function determineArticle(nextWord: string): string {
	// check if the next word starts with a vowel sound
	const vowels = /^[aeiouAEIOU]/;
	return vowels.test(nextWord) ? 'an' : 'a';
}
const getConnectionParameterString = (connectionType: string) => {
	if (connectionType === '') return "data-action-parameter-creatorview='AI'";

	return `data-action-parameter-connectiontype='${connectionType}'`;
};
const getAhref = (connectionType: { connection: string; locale: string }) =>
	`<a class="test" data-action='openSelectiveNodeCreator'${getConnectionParameterString(
		connectionType.connection,
	)}'>${connectionType.locale}</a>`;

export function getConnectionHintNoticeField(
	connectionTypes: AllowedConnectionTypes[],
): INodeProperties {
	const groupedConnections = new Map<string, string[]>();

	// group connection types by their 'connection' value
	// to not create multiple links
	connectionTypes.forEach((connectionType) => {
		const connectionString = connectionsString[connectionType].connection;
		const localeString = connectionsString[connectionType].locale;

		if (!groupedConnections.has(connectionString)) {
			groupedConnections.set(connectionString, [localeString]);
			return;
		}

		groupedConnections.get(connectionString)?.push(localeString);
	});

	let displayName;

	if (groupedConnections.size === 1) {
		const [[connection, locales]] = Array.from(groupedConnections);

		displayName = `This node must be connected to ${determineArticle(locales[0])} ${locales[0]
			.toLowerCase()
			.replace(
				/^ai /,
				'AI ',
			)}. <a data-action='openSelectiveNodeCreator' ${getConnectionParameterString(
			connection,
		)}>Insert one</a>`;
	} else {
		const ahrefs = Array.from(groupedConnections, ([connection, locales]) => {
			// If there are multiple locales, join them with ' or '
			// use determineArticle to insert the correct article
			const locale =
				locales.length > 1
					? locales
							.map((localeString, index, { length }) => {
								return (
									(index === 0 ? `${determineArticle(localeString)} ` : '') +
									(index < length - 1 ? `${localeString} or ` : localeString)
								);
							})
							.join('')
					: `${determineArticle(locales[0])} ${locales[0]}`;
			return getAhref({ connection, locale });
		});

		displayName = `This node needs to be connected to ${ahrefs.join(' or ')}.`;
	}

	return {
		displayName,
		name: 'notice',
		type: 'notice',
		default: '',
		typeOptions: {
			containerClass: 'ndv-connection-hint-notice',
		},
	};
}
