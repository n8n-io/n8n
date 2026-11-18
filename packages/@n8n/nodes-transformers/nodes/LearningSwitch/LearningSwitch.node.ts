import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeParameters,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import type { Prediction } from '../../engine/classifier';
import { predict, trainSoftmax } from '../../engine/classifier';
import type { InputType } from '../../engine/classifier-store';
import { CLASSIFIERS_TABLE, loadClassifier, saveClassifier } from '../../engine/classifier-store';
import { embedTexts } from '../../engine/embedder';
import { embedImageQueries, embedImages } from '../../engine/image-embedder';
import { predictBySimilarity } from '../../engine/zero-shot';

const DEFAULT_TEXT_MODEL = 'Xenova/multilingual-e5-small';
const DEFAULT_IMAGE_MODEL = 'Xenova/clip-vit-base-patch32';

type OutputClass = { name: string; description?: string };

const configuredOutputs = (parameters: INodeParameters) => {
	if (parameters.operation === 'train') return [{ type: 'main', displayName: 'Trained' }];
	const values = ((parameters.classes as IDataObject)?.values as IDataObject[]) ?? [];
	return [
		...values.map((value) => ({ type: 'main', displayName: value.name })),
		{ type: 'main', displayName: 'Not Sure' },
	];
};

const showFor = (inputType: InputType) => ({ inputType: [inputType] });

function readInputType(ctx: IExecuteFunctions): InputType {
	return ctx.getNodeParameter('inputType', 0, 'text') === 'image' ? 'image' : 'text';
}

function readModel(ctx: IExecuteFunctions, inputType: InputType): string {
	const choice = String(
		ctx.getNodeParameter(
			inputType === 'image' ? 'imageModel' : 'textModel',
			0,
			inputType === 'image' ? DEFAULT_IMAGE_MODEL : DEFAULT_TEXT_MODEL,
		),
	);
	if (choice !== 'custom') return choice;
	const custom = String(ctx.getNodeParameter('customModel', 0, '')).trim();
	if (!custom) throw new NodeOperationError(ctx.getNode(), 'Enter a custom model ID');
	return custom;
}

async function embedItems(
	ctx: IExecuteFunctions,
	inputType: InputType,
	model: string,
): Promise<number[][]> {
	const items = ctx.getInputData();
	if (inputType === 'image') {
		const property = String(ctx.getNodeParameter('binaryPropertyName', 0, 'data'));
		const buffers = await Promise.all(
			items.map(async (_, itemIndex) => {
				ctx.helpers.assertBinaryData(itemIndex, property);
				return await ctx.helpers.getBinaryDataBuffer(itemIndex, property);
			}),
		);
		return await embedImages(model, buffers);
	}

	const texts = items.map((_, itemIndex) => {
		const text = ctx.getNodeParameter('text', itemIndex, '');
		if (typeof text !== 'string' || text.trim() === '') {
			throw new NodeOperationError(ctx.getNode(), 'The text is empty', { itemIndex });
		}
		return text;
	});
	return await embedTexts(model, texts);
}

async function train(ctx: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = ctx.getInputData();
	const name = String(ctx.getNodeParameter('classifierName', 0, '')).trim();
	const inputType = readInputType(ctx);
	const embeddingModel = readModel(ctx, inputType);

	const labels = items.map((_, itemIndex) => {
		const label = String(ctx.getNodeParameter('label', itemIndex, '')).trim();
		if (!label) throw new NodeOperationError(ctx.getNode(), 'The label is empty', { itemIndex });
		return label;
	});

	const classes = [...new Set(labels)];
	if (classes.length < 2) {
		throw new NodeOperationError(ctx.getNode(), 'Training needs examples of at least 2 classes', {
			description: `All examples have the label "${classes[0] ?? ''}".`,
		});
	}

	const startedAt = Date.now();
	const vectors = await embedItems(ctx, inputType, embeddingModel);
	const classIndexes = labels.map((label) => classes.indexOf(label));
	const model = trainSoftmax(vectors, classIndexes, classes.length);
	const correct = vectors.filter(
		(vector, n) => predict(model, vector).index === classIndexes[n],
	).length;

	await saveClassifier(ctx, name, {
		...model,
		inputType,
		embeddingModel,
		classes,
		exampleCount: items.length,
		trainedAt: new Date().toISOString(),
	});

	return [
		[
			{
				json: {
					classifier: name,
					inputType,
					embeddingModel,
					classes,
					examplesPerClass: Object.fromEntries(
						classes.map((label) => [label, labels.filter((l) => l === label).length]),
					),
					trainingAccuracy: correct / items.length,
					durationMs: Date.now() - startedAt,
					storedIn: CLASSIFIERS_TABLE,
				},
				pairedItem: items.map((_, item) => ({ item })),
			},
		],
	];
}

type Scorer = { classes: string[]; score: (vector: number[]) => Prediction; model: string };

async function trainedScorer(
	ctx: IExecuteFunctions,
	inputType: InputType,
	outputs: OutputClass[],
): Promise<Scorer> {
	const name = String(ctx.getNodeParameter('classifierName', 0, '')).trim();
	const classifier = await loadClassifier(ctx, name);
	if (classifier.inputType !== inputType) {
		throw new NodeOperationError(
			ctx.getNode(),
			`The classifier "${name}" was trained on ${classifier.inputType === 'image' ? 'images' : 'text'}`,
			{ description: `Set Input Type to "${classifier.inputType}".` },
		);
	}
	const unknown = outputs.filter((output) => !classifier.classes.includes(output.name));
	if (unknown.length > 0) {
		throw new NodeOperationError(
			ctx.getNode(),
			`The classifier "${name}" has no class ${unknown.map((o) => `"${o.name}"`).join(', ')}`,
			{ description: `Known classes: ${classifier.classes.join(', ')}` },
		);
	}
	return {
		classes: classifier.classes,
		model: classifier.embeddingModel,
		score: (vector) => predict(classifier, vector),
	};
}

async function descriptionScorer(
	ctx: IExecuteFunctions,
	inputType: InputType,
	outputs: OutputClass[],
): Promise<Scorer> {
	const model = readModel(ctx, inputType);
	const descriptionsPerClass = outputs.map((output) => {
		const lines = (output.description ?? '')
			.split('\n')
			.map((line) => line.trim())
			.filter(Boolean);
		return lines.length > 0 ? lines : [output.name];
	});
	const flat = descriptionsPerClass.flat();
	const vectors =
		inputType === 'image' ? await embedImageQueries(model, flat) : await embedTexts(model, flat);
	let next = 0;
	const classDescriptions = descriptionsPerClass.map((lines) => lines.map(() => vectors[next++]));
	return {
		classes: outputs.map((output) => output.name),
		model,
		score: (vector) => predictBySimilarity(classDescriptions, vector),
	};
}

async function classify(ctx: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = ctx.getInputData();
	const inputType = readInputType(ctx);
	const outputs = (ctx.getNodeParameter('classes.values', 0, []) as OutputClass[]).map(
		(output) => ({ ...output, name: String(output.name).trim() }),
	);
	if (outputs.length === 0) {
		throw new NodeOperationError(ctx.getNode(), 'Add at least one output class');
	}
	const threshold = Number(ctx.getNodeParameter('options.confidenceThreshold', 0, 0.5));
	const classifyWith = ctx.getNodeParameter('classifyWith', 0, 'trained');

	const scorer =
		classifyWith === 'descriptions'
			? await descriptionScorer(ctx, inputType, outputs)
			: await trainedScorer(ctx, inputType, outputs);
	const vectors = await embedItems(ctx, inputType, scorer.model);

	const outputNames = outputs.map((output) => output.name);
	const returnData: INodeExecutionData[][] = [...outputNames, 'Not Sure'].map(() => []);
	const notSureOutput = outputNames.length;

	vectors.forEach((vector, itemIndex) => {
		const prediction = scorer.score(vector);
		const label = scorer.classes[prediction.index];
		const outputIndex = outputNames.indexOf(label);
		const confident = prediction.confidence >= threshold && outputIndex !== -1;

		returnData[confident ? outputIndex : notSureOutput].push({
			json: {
				...items[itemIndex].json,
				classification: {
					label,
					confidence: prediction.confidence,
					scores: Object.fromEntries(
						scorer.classes.map((c, index) => [c, prediction.probabilities[index]]),
					),
				},
			},
			binary: items[itemIndex].binary,
			pairedItem: { item: itemIndex },
		});
	});

	return returnData;
}

export class LearningSwitch implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Learning Switch',
		name: 'learningSwitch',
		icon: 'fa:graduation-cap',
		iconColor: 'purple',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + " " + $parameter["inputType"]}}',
		description:
			'Route items by examples instead of rules. Trains a local classifier, no external AI.',
		defaults: {
			name: 'Learning Switch',
		},
		codex: {
			categories: ['Core Nodes'],
			subcategories: {
				'Core Nodes': ['Flow'],
			},
			alias: ['classifier', 'router', 'machine learning', 'train', 'embeddings', 'clip', 'image'],
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: `={{(${configuredOutputs})($parameter)}}`,
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Classify',
						value: 'classify',
						description: 'Send each item to the output of its class',
						action: 'Classify items',
					},
					{
						name: 'Train',
						value: 'train',
						description: 'Learn the classes from labeled example items',
						action: 'Train a classifier',
					},
				],
				default: 'classify',
			},
			{
				displayName: 'Input Type',
				name: 'inputType',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Text', value: 'text' },
					{ name: 'Image', value: 'image' },
				],
				default: 'text',
			},
			{
				displayName: 'Classify With',
				name: 'classifyWith',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Trained Classifier',
						value: 'trained',
						description: 'Use a classifier that the Train operation made from examples',
					},
					{
						name: 'Class Descriptions (No Training)',
						value: 'descriptions',
						description: 'Compare each item with a short description of each class',
					},
				],
				default: 'trained',
				displayOptions: { show: { operation: ['classify'] } },
			},
			{
				displayName: 'Classifier Name',
				name: 'classifierName',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'e.g. support-triage',
				description: `The name of the trained classifier. It is stored in the "${CLASSIFIERS_TABLE}" data table.`,
				displayOptions: {
					hide: { classifyWith: ['descriptions'] },
				},
			},
			{
				displayName: 'Text',
				name: 'text',
				type: 'string',
				required: true,
				default: '={{ $json.text }}',
				description: 'The text to learn from or to classify',
				typeOptions: { rows: 2 },
				displayOptions: { show: showFor('text') },
			},
			{
				displayName: 'Input Binary Field',
				name: 'binaryPropertyName',
				type: 'string',
				required: true,
				default: 'data',
				hint: 'The name of the input field that holds the image',
				displayOptions: { show: showFor('image') },
			},
			{
				displayName: 'Label',
				name: 'label',
				type: 'string',
				required: true,
				default: '={{ $json.label }}',
				description: 'The class of this example',
				displayOptions: { show: { operation: ['train'] } },
			},
			{
				displayName: 'Text Model',
				name: 'textModel',
				type: 'options',
				options: [
					{
						name: 'Multilingual E5 Small',
						value: DEFAULT_TEXT_MODEL,
						description: 'About 120 MB, 100 languages',
					},
					{
						name: 'All MiniLM L6 V2',
						value: 'Xenova/all-MiniLM-L6-v2',
						description: 'About 25 MB, English only, fastest',
					},
					{
						name: 'Custom',
						value: 'custom',
						description: 'Any transformers.js feature-extraction model from Hugging Face',
					},
				],
				default: DEFAULT_TEXT_MODEL,
				description:
					'The model that turns text into vectors. It downloads on first use and runs on this instance.',
				displayOptions: {
					show: showFor('text'),
					hide: { classifyWith: ['trained'] },
				},
			},
			{
				displayName: 'Image Model',
				name: 'imageModel',
				type: 'options',
				options: [
					{
						name: 'CLIP ViT-B/32',
						value: DEFAULT_IMAGE_MODEL,
						description: 'About 150 MB, understands images and English text',
					},
					{
						name: 'Custom',
						value: 'custom',
						description: 'Another CLIP model from Hugging Face in transformers.js format',
					},
				],
				default: DEFAULT_IMAGE_MODEL,
				description:
					'The model that turns images into vectors. It downloads on first use and runs on this instance.',
				displayOptions: {
					show: showFor('image'),
					hide: { classifyWith: ['trained'] },
				},
			},
			{
				displayName: 'Custom Model ID',
				name: 'customModel',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'e.g. Xenova/bge-small-en-v1.5',
				displayOptions: {
					show: { '/textModel': ['custom'], inputType: ['text'] },
					hide: { classifyWith: ['trained'] },
				},
			},
			{
				displayName: 'Custom Model ID',
				name: 'customModel',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'e.g. Xenova/clip-vit-base-patch16',
				displayOptions: {
					show: { '/imageModel': ['custom'], inputType: ['image'] },
					hide: { classifyWith: ['trained'] },
				},
			},
			{
				displayName: 'Outputs',
				name: 'classes',
				placeholder: 'Add Output',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true, sortable: true },
				default: {},
				description: 'One output for each class. Other items go to the Not Sure output.',
				displayOptions: { show: { operation: ['classify'] } },
				options: [
					{
						name: 'values',
						displayName: 'Output',
						values: [
							{
								displayName: 'Class',
								name: 'name',
								type: 'string',
								default: '',
								description: 'The class name. For a trained classifier, a label from the examples.',
							},
							{
								displayName: 'Description',
								name: 'description',
								type: 'string',
								default: '',
								typeOptions: { rows: 3 },
								placeholder: 'e.g. a photo of a hot dog',
								description:
									'What items of this class look like, one description per line. The node uses the description closest to the item. Empty means the class name. For "everything else", list a few typical things (food, a person, a place) instead of writing "not X".',
								displayOptions: { show: { '/classifyWith': ['descriptions'] } },
							},
						],
					},
				],
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: { show: { operation: ['classify'] } },
				options: [
					{
						displayName: 'Confidence Threshold',
						name: 'confidenceThreshold',
						type: 'number',
						default: 0.5,
						typeOptions: { minValue: 0, maxValue: 1, numberPrecision: 2 },
						description:
							'Items with a lower confidence go to the Not Sure output, for example to an LLM or a person',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const operation = this.getNodeParameter('operation', 0);
		return operation === 'train' ? await train(this) : await classify(this);
	}
}
