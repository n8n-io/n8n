/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import {
	NodeConnectionType,
	type IExecuteFunctions,
	type INodeType,
	type INodeTypeDescription,
	type SupplyData,
	ApplicationError,
} from 'n8n-workflow';
import type { TextSplitterParams } from 'langchain/text_splitter';

import { TextSplitter } from 'langchain/text_splitter';
import { cosineSimilarity } from '@langchain/core/utils/math';
import cloneDeep from 'lodash/cloneDeep';
import { mean, std, flatten, sort } from 'mathjs';
import type { Embeddings } from '@langchain/core/embeddings';
import { Document } from 'langchain/document';
import { getConnectionHintNoticeField } from '../../../utils/sharedFields';
import { logWrapper } from '../../../utils/logWrapper';

type BreakpointThresholdType = 'percentile' | 'standardDeviation' | 'interquartile';

const BREAKPOINT_DEFAULTS: Record<BreakpointThresholdType, number> = {
	percentile: 95,
	standardDeviation: 3,
	interquartile: 1.5,
};

function computePercentile(
	a: number[] | number[][],
	q: number | number[],
	limit?: [number, number],
	interpolation: 'linear' | 'lower' | 'higher' | 'midpoint' = 'linear',
	axis?: number,
	out?: number[],
	overwrite_input: boolean = false,
): number | number[] {
	// Convert input to an array if it's not already, handle overwrite_input
	let arr = overwrite_input ? a : cloneDeep(a);

	// Flatten the array if axis is not specified
	if (axis === undefined) arr = flatten(arr);

	// Apply limits if specified
	if (limit) {
		arr = (arr as number[]).filter((value) => value >= limit[0] && value <= limit[1]);
	}

	// Sort the array
	const sortedArr = sort(arr as number[], (aS, b) => aS - b);

	const compute = (qn: number) => {
		const n = sortedArr.length;
		const pos = (qn / 100) * (n - 1);
		const lowerIndex = Math.floor(pos);
		const upperIndex = Math.ceil(pos);

		switch (interpolation) {
			case 'lower':
				return sortedArr[lowerIndex];
			case 'higher':
				return sortedArr[upperIndex];
			case 'midpoint':
				return (sortedArr[lowerIndex] + sortedArr[upperIndex]) / 2;
			case 'linear':
			default:
				const fraction = pos - lowerIndex;
				return sortedArr[lowerIndex] + fraction * (sortedArr[upperIndex] - sortedArr[lowerIndex]);
		}
	};

	// Handle single or multiple percentiles
	if (Array.isArray(q)) {
		return q.map((quantile) => compute(quantile));
	} else {
		return compute(q);
	}
}

function percentile<T extends number | number[]>(
	a: number[],
	b: T,
): T extends number ? number : number[] {
	const res = computePercentile(a, b) as T extends number ? number : number[];

	return res;
}

function combineSentences(
	sentences: Array<{ sentence: string; combinedSentence?: string }>,
	bufferSize: number = 1,
): Array<{
	combinedSentenceEmbedding?: number[];
	sentence: string;
	combinedSentence: string;
}> {
	// Initialize a new array to hold the processed sentences
	const processedSentences: Array<{
		combinedSentenceEmbedding?: number[];
		sentence: string;
		combinedSentence: string;
	}> = [];

	for (let i = 0; i < sentences.length; i++) {
		let combinedSentence = '';

		// Combine sentences based on the bufferSize
		for (let j = i - bufferSize; j <= i + bufferSize; j++) {
			if (j >= 0 && j < sentences.length) {
				combinedSentence += (j > i - bufferSize ? ' ' : '') + sentences[j].sentence;
			}
		}

		// Push the processed sentence to the new array
		processedSentences.push({
			...sentences[i],
			combinedSentence: combinedSentence.trim(), // Ensure combinedSentence is never undefined
		});
	}

	// Return the new array with guaranteed combinedSentence properties
	return processedSentences;
}
function calculateCosineDistances(
	sentences: Array<{
		distanceToNext?: number;
		combinedSentenceEmbedding: number[];
		sentence: string;
	}>,
): [
	number[],
	Array<{ distanceToNext: number; sentence: string; combinedSentenceEmbedding: number[] }>,
] {
	const distances: number[] = [];
	const updatedSentences = sentences.map((sentence, index) => ({
		...sentence,
		// Ensure distanceToNext is initialized to 0 if not already set
		distanceToNext: sentence.distanceToNext ?? 0,
	}));

	for (let i = 0; i < updatedSentences.length - 1; i++) {
		const embeddingCurrent = updatedSentences[i].combinedSentenceEmbedding;
		const embeddingNext = updatedSentences[i + 1].combinedSentenceEmbedding;

		const similarity = cosineSimilarity([embeddingCurrent], [embeddingNext])[0][0];
		const distance = 1 - similarity;

		distances.push(distance);
		updatedSentences[i].distanceToNext = distance;
	}

	// Now updatedSentences is guaranteed to have distanceToNext as number
	return [distances, updatedSentences];
}
export interface SemanticChunkerParams extends TextSplitterParams {
	embeddings: Embeddings;
	addStartIndex?: boolean;
	breakpointThresholdType?: BreakpointThresholdType;
	breakpointThresholdAmount?: number;
	numberOfChunks?: number | null;
}

class SemanticChunker extends TextSplitter {
	private addStartIndex: boolean;

	private embeddings: Embeddings;

	private breakpointThresholdType: BreakpointThresholdType;

	private numberOfChunks: number | null;

	private breakpointThresholdAmount: number;

	constructor(fields: Partial<SemanticChunkerParams>) {
		super(fields);

		this.embeddings = fields.embeddings!;
		this.addStartIndex = fields?.addStartIndex ?? false;
		this.breakpointThresholdType = fields?.breakpointThresholdType ?? 'percentile';
		this.numberOfChunks = fields?.numberOfChunks ?? 0;

		if (!fields?.breakpointThresholdAmount) {
			this.breakpointThresholdAmount = BREAKPOINT_DEFAULTS[this.breakpointThresholdType];
		} else {
			this.breakpointThresholdAmount = fields.breakpointThresholdAmount;
		}
	}

	private calculateBreakpointThreshold(distances: number[]): number {
		if (this.breakpointThresholdType === 'percentile') {
			return percentile(distances, this.breakpointThresholdAmount);
		} else if (this.breakpointThresholdType === 'standardDeviation') {
			const stdRes = std(distances) as unknown as number;

			return mean(distances) + this.breakpointThresholdAmount * stdRes;
		} else if (this.breakpointThresholdType === 'interquartile') {
			const [q1, q3] = percentile(distances, [25, 75]);
			const iqr = q3 - q1;

			return mean(distances) + this.breakpointThresholdAmount * iqr;
		} else {
			/* eslint-disable n8n-nodes-base/node-execute-block-wrong-error-thrown */
			throw new ApplicationError('Invalid breakpoint threshold type');
		}
	}

	private thresholdFromClusters(distances: number[]): number {
		if (this.numberOfChunks === null) {
			/* eslint-disable n8n-nodes-base/node-execute-block-wrong-error-thrown */
			throw new ApplicationError('This should never be called if `numberOfChunks` is None.');
		}
		const x1 = distances.length;
		const y1 = 0.0;
		const x2 = 1.0;
		const y2 = 100.0;

		const x = Math.max(Math.min(this.numberOfChunks, x1), x2);

		const y = y1 + ((y2 - y1) / (x2 - x1)) * (x - x1);
		const yClamped = Math.min(Math.max(y, 0), 100);

		const clusterPercentile = percentile(distances, yClamped);
		return clusterPercentile;
	}

	private async calculateSentenceDistances(singleSentencesList: string[]): Promise<
		[
			number[],
			Array<{
				sentence: any;
				combinedSentenceEmbedding: number[];
				distanceToNext: number;
			}>,
		]
	> {
		const _sentences = singleSentencesList.map((x, i) => ({ sentence: x, index: i }));
		const sentences = combineSentences(_sentences);
		const embeddings = await this.embeddings.embedDocuments(
			sentences.map((x) => x.combinedSentence),
		);
		for (let i = 0; i < sentences.length; i++) {
			sentences[i].combinedSentenceEmbedding = embeddings[i];
		}

		return calculateCosineDistances(
			sentences as unknown as Array<{
				sentence: string;
				combinedSentenceEmbedding: number[];
				distanceToNext: number;
			}>,
		);
	}

	public async splitText(text: string): Promise<string[]> {
		const singleSentencesList = text.split(/(?<=[.?!])\s+/);

		if (singleSentencesList.length === 1) {
			return singleSentencesList;
		}
		const [distances, sentences] = await this.calculateSentenceDistances(singleSentencesList);
		const breakpointDistanceThreshold =
			this.numberOfChunks !== null && this.numberOfChunks > 0
				? this.thresholdFromClusters(distances)
				: this.calculateBreakpointThreshold(distances);

		const indicesAboveThresh = distances
			.map((x, i) => (x > breakpointDistanceThreshold ? i : -1))
			.filter((x) => x !== -1);

		const chunks = [];
		let startIndex = 0;

		for (const index of indicesAboveThresh) {
			const endIndex = index;

			const group = sentences.slice(startIndex, endIndex + 1);
			const combinedText = group.map((d) => d.sentence).join(' ');
			chunks.push(combinedText);

			startIndex = index + 1;
		}

		if (startIndex < sentences.length) {
			const combinedText = sentences
				.slice(startIndex)
				.map((d) => d.sentence)
				.join(' ');
			chunks.push(combinedText);
		}
		return chunks;
	}

	public async createDocuments(
		texts: string[],
		metadatas: Array<Record<string, any>> | null = null,
	): Promise<Array<Document<Record<string, any>>>> {
		const _metadatas = metadatas || new Array(texts.length).fill({});
		const documents = [];
		for (let i = 0; i < texts.length; i++) {
			const text = texts[i];
			let index = -1;
			const chunks = await this.splitText(text);
			for (const chunk of chunks) {
				const metadata = cloneDeep(_metadatas[i]);
				if (this.addStartIndex) {
					index = text.indexOf(chunk, index + 1);
					metadata.startIndex = index;
				}
				const newDoc = new Document({ pageContent: chunk, metadata });
				documents.push(newDoc);
			}
		}
		return documents;
	}

	public async splitDocuments(
		documents: Document[],
	): Promise<Array<Document<Record<string, any>>>> {
		const texts = documents.map((doc) => doc.pageContent);
		const metadatas = documents.map((doc) => doc.metadata);
		return await this.createDocuments(texts, metadatas);
	}

	public async transformDocuments(
		documents: Document[],
	): Promise<Array<Document<Record<string, any>>>> {
		return await this.splitDocuments(documents);
	}
}

export class TextSplitterSemanticTextSplitter implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Semantic Text Splitter',
		name: 'textSplitterSemanticTextSplitter',
		icon: 'fa:grip-lines-vertical',
		group: ['transform'],
		version: 1,
		description: 'Split text into chunks by semantic meaning',
		defaults: {
			name: 'Semantic Text Splitter',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Text Splitters'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.textsplittersemantictextsplitter/',
					},
				],
			},
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [
			{
				displayName: 'Embedding',
				type: NodeConnectionType.AiEmbedding,
				required: true,
				maxConnections: 1,
			},
		],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: [NodeConnectionType.AiTextSplitter],
		outputNames: ['Text Splitter'],
		properties: [
			getConnectionHintNoticeField([NodeConnectionType.AiDocument]),
			{
				displayName: 'Breakpoint Threshold Type',
				name: 'breakpointThresholdType',
				type: 'options',
				options: [
					{
						name: 'Percentile',
						value: 'percentile',
					},
					{
						name: 'Standard Deviation',
						value: 'standardDeviation',
					},
					{
						name: 'Interquartile',
						value: 'interquartile',
					},
				],
				default: 'percentile',
			},
			{
				displayName: 'Breakpoint Threshold Amount',
				name: 'breakpointThresholdAmount',
				type: 'number',
				default: 95,
				description: 'The threshold value to use for splitting the text',
				displayOptions: {
					show: {
						breakpointThresholdType: ['percentile'],
					},
				},
			},
			{
				displayName: 'Standard Deviation',
				name: 'breakpointThresholdAmount',
				type: 'number',
				default: 3,
				description: 'The number of standard deviations to use for splitting the text',
				displayOptions: {
					show: {
						breakpointThresholdType: ['standardDeviation'],
					},
				},
			},
			{
				displayName: 'Interquartile',
				name: 'breakpointThresholdAmount',
				type: 'number',
				default: 1.5,
				description: 'The number of interquartile ranges to use for splitting the text',
				displayOptions: {
					show: {
						breakpointThresholdType: ['interquartile'],
					},
				},
			},
			{
				displayName: 'Number of Chunks',
				name: 'numberOfChunks',
				type: 'number',
				default: 0,
				description: 'The number of chunks to split the text into',
			},
		],
	};

	async supplyData(this: IExecuteFunctions, itemIndex: number): Promise<SupplyData> {
		this.logger.verbose('Supply Data for Semantic Text Splitter');

		const breakpointThresholdType = this.getNodeParameter(
			'breakpointThresholdType',
			itemIndex,
			'percentile',
		) as BreakpointThresholdType;
		const breakpointThresholdAmount = this.getNodeParameter(
			'breakpointThresholdAmount',
			itemIndex,
			95,
		) as number;
		const numberOfChunks = this.getNodeParameter('numberOfChunks', itemIndex, 0) as number;

		const embeddings = (await this.getInputConnectionData(
			NodeConnectionType.AiEmbedding,
			0,
		)) as Embeddings;

		const splitter = new SemanticChunker({
			embeddings,
			numberOfChunks,
			breakpointThresholdAmount,
			breakpointThresholdType,
			keepSeparator: false,
		});

		return {
			response: logWrapper(splitter, this),
		};
	}
}
