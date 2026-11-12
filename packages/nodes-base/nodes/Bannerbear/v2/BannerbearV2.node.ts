import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { sleep } from '@n8n/utils/sleep';

import {
	bannerbearApiRequest,
	compact,
	flattenAnimationFiles,
	flattenImageFiles,
	linesToArray,
	runTool,
	TOOL_POLL_INTERVAL_MS,
} from './GenericFunctions';
import { imageFields, imageOperations } from './ImageDescription';
import { templateFields, templateOperations } from './TemplateDescription';
import { toolFields, toolJobFields, toolJobOperations, toolOperations } from './ToolDescription';
import {
	workflowFields,
	workflowOperations,
	workflowRunFields,
	workflowRunOperations,
} from './WorkflowDescription';
import {
	animationFields,
	animationOperations,
	animationTemplateFields,
	animationTemplateOperations,
} from './AnimationDescription';

/** V5 list endpoints return at most this many rows per page. */
const PAGE_SIZE = 25;

/**
 * Backstop so a misbehaving endpoint cannot spin the paginator forever. Reaching
 * it is an error rather than a silent stop: returning a partial list from
 * "Return All" would look like a complete one.
 */
const MAX_LIST_PAGES = 200;

/** n8n uses camelCase parameter names; the API uses kebab-case layer properties. */
const LAYER_PROPERTY_NAMES: IDataObject = {
	backgroundColor: 'background-color',
	backgroundImage: 'background-image',
	barcodeData: 'barcode-data',
	fontFamily: 'font-family',
	qrTarget: 'qr-target',
	ratingScore: 'rating-score',
};

export class BannerbearV2 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			version: 2,
			defaults: {
				name: 'Bannerbear',
			},
			inputs: [NodeConnectionTypes.Main],
			outputs: [NodeConnectionTypes.Main],
			credentials: [
				{
					name: 'bannerbearV5Api',
					required: true,
				},
			],
			properties: [
				{
					displayName: 'Resource',
					name: 'resource',
					type: 'options',
					noDataExpression: true,
					options: [
						{
							name: 'Animation',
							value: 'animation',
						},
						{
							name: 'Animation Template',
							value: 'animationTemplate',
						},
						{
							name: 'Image',
							value: 'image',
						},
						{
							name: 'Template',
							value: 'template',
						},
						{
							name: 'Tool',
							value: 'tool',
						},
						{
							name: 'Tool Job',
							value: 'toolJob',
						},
						{
							name: 'Workflow',
							value: 'workflow',
						},
						{
							name: 'Workflow Run',
							value: 'workflowRun',
						},
					],
					default: 'image',
				},
				// IMAGE
				...imageOperations,
				...imageFields,
				// TEMPLATE
				...templateOperations,
				...templateFields,
				// TOOL
				...toolOperations,
				...toolFields,
				// TOOL JOB
				...toolJobOperations,
				...toolJobFields,
				// WORKFLOW
				...workflowOperations,
				...workflowFields,
				// WORKFLOW RUN
				...workflowRunOperations,
				...workflowRunFields,
				// ANIMATION
				...animationOperations,
				...animationFields,
				// ANIMATION TEMPLATE
				...animationTemplateOperations,
				...animationTemplateFields,
			],
		};
	}

	methods = {
		loadOptions: {
			async getTemplates(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const templates = (await bannerbearApiRequest.call(
					this,
					'GET',
					'/image_templates',
				)) as IDataObject[];

				return templates.map((template) => ({
					name: template.name as string,
					value: template.uid as string,
				}));
			},

			async getLayers(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const templateId = this.getCurrentNodeParameter('templateId') as string;
				const template = (await bannerbearApiRequest.call(
					this,
					'GET',
					`/image_templates/${templateId}`,
				)) as IDataObject;

				const config = (template.config ?? {}) as IDataObject;
				const objects = (config.objects ?? []) as IDataObject[];

				return objects.map((object) => ({
					name: (object.name as string) || (object.id as string),
					value: object.id as string,
				}));
			},

			async getWorkflows(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const workflows = (await bannerbearApiRequest.call(
					this,
					'GET',
					'/workflows',
				)) as IDataObject[];

				return workflows.map((workflow) => ({
					name: workflow.name as string,
					value: workflow.uid as string,
				}));
			},

			async getWorkflowInputs(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const workflowId = this.getCurrentNodeParameter('workflowId') as string;
				const workflow = (await bannerbearApiRequest.call(
					this,
					'GET',
					`/workflows/${workflowId}`,
				)) as IDataObject;

				const inputs = (workflow.inputs ?? {}) as IDataObject;

				return Object.keys(inputs).map((name) => {
					const spec = (inputs[name] ?? {}) as IDataObject;
					const suffix = spec.required ? ' (required)' : '';
					return { name: `${name}${suffix}`, value: name };
				});
			},

			async getAnimationTemplates(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const templates = (await bannerbearApiRequest.call(
					this,
					'GET',
					'/animation_templates',
				)) as IDataObject[];

				return templates.map((template) => ({
					name: template.name as string,
					value: template.uid as string,
				}));
			},

			async getAnimationLayers(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const templateId = this.getCurrentNodeParameter('templateId') as string;
				const template = (await bannerbearApiRequest.call(
					this,
					'GET',
					`/animation_templates/${templateId}`,
				)) as IDataObject;

				const config = (template.config ?? {}) as IDataObject;
				const objects = (config.objects ?? []) as IDataObject[];

				return objects.map((object) => ({
					name: (object.name as string) || (object.id as string),
					value: object.id as string,
				}));
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);

		for (let i = 0; i < items.length; i++) {
			try {
				let responseData: IDataObject | IDataObject[] = {};

				if (resource === 'image') {
					if (operation === 'create') {
						responseData = await createImage.call(this, i);
					}

					if (operation === 'get') {
						const imageId = this.getNodeParameter('imageId', i) as string;
						responseData = flattenImageFiles(
							(await bannerbearApiRequest.call(this, 'GET', `/images/${imageId}`)) as IDataObject,
						);
					}
				}

				if (resource === 'template') {
					if (operation === 'get') {
						const templateId = this.getNodeParameter('templateId', i) as string;
						responseData = (await bannerbearApiRequest.call(
							this,
							'GET',
							`/image_templates/${templateId}`,
						)) as IDataObject;
					}

					if (operation === 'getAll') {
						responseData = await fetchList(this, '/image_templates', i);
					}
				}

				if (resource === 'tool') {
					responseData = await executeTool.call(this, operation, i);
				}

				if (resource === 'workflow') {
					if (operation === 'run') {
						responseData = await runWorkflow.call(this, i);
					}

					if (operation === 'get') {
						const workflowId = this.getNodeParameter('workflowId', i) as string;
						responseData = (await bannerbearApiRequest.call(
							this,
							'GET',
							`/workflows/${workflowId}`,
						)) as IDataObject;
					}

					if (operation === 'getAll') {
						responseData = await fetchList(this, '/workflows', i);
					}
				}

				if (resource === 'workflowRun') {
					if (operation === 'get') {
						const runId = this.getNodeParameter('workflowRunId', i) as string;
						responseData = (await bannerbearApiRequest.call(
							this,
							'GET',
							`/workflow_runs/${runId}`,
						)) as IDataObject;
					}

					if (operation === 'getAll') {
						responseData = await fetchList(this, '/workflow_runs', i);
					}
				}

				if (resource === 'animation') {
					if (operation === 'create') {
						responseData = await createAnimation.call(this, i);
					}

					if (operation === 'get') {
						const animationId = this.getNodeParameter('animationId', i) as string;
						responseData = flattenAnimationFiles(
							(await bannerbearApiRequest.call(
								this,
								'GET',
								`/animations/${animationId}`,
							)) as IDataObject,
						);
					}

					if (operation === 'getAll') {
						responseData = (await fetchList(this, '/animations', i)).map((animation) =>
							flattenAnimationFiles(animation),
						);
					}
				}

				if (resource === 'animationTemplate') {
					if (operation === 'get') {
						const templateId = this.getNodeParameter('animationTemplateId', i) as string;
						responseData = (await bannerbearApiRequest.call(
							this,
							'GET',
							`/animation_templates/${templateId}`,
						)) as IDataObject;
					}

					if (operation === 'getAll') {
						responseData = await fetchList(this, '/animation_templates', i);
					}
				}

				if (resource === 'toolJob') {
					if (operation === 'get') {
						const toolJobId = this.getNodeParameter('toolJobId', i) as string;
						responseData = (await bannerbearApiRequest.call(
							this,
							'GET',
							`/tool_jobs/${toolJobId}`,
						)) as IDataObject;
					}

					if (operation === 'getAll') {
						const jobs = (await bannerbearApiRequest.call(
							this,
							'GET',
							'/tool_jobs',
						)) as IDataObject[];
						const returnAll = this.getNodeParameter('returnAll', i);
						responseData = returnAll ? jobs : jobs.slice(0, this.getNodeParameter('limit', i));
					}
				}

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData),
					{ itemData: { item: i } },
				);
				returnData.push.apply(returnData, executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}

/**
 * n8n's fixedCollection serialises every declared field with its default, so a row
 * where the user only picked a layer still carries `opacity: 1` and `ratingScore: 0`.
 * Sending those would silently override whatever the template already sets, so a
 * field left at its declared default is treated as unset. `hidden` is a three-way
 * option instead, because explicitly showing or hiding a layer is a real use case
 * that a plain boolean could not express.
 */
const LAYER_FIELD_DEFAULTS: IDataObject = {
	ratingScore: 0,
};

/** A value may arrive as a real boolean from an expression, or as a string from the picker. */
function toBoolean(value: unknown): boolean {
	if (typeof value === 'boolean') return value;
	return ['true', 'yes', '1'].includes(String(value).trim().toLowerCase());
}

/**
 * V5 list endpoints are paginated, so a single GET only yields the first page.
 * Walk pages until one comes back short, or until enough rows are in hand to
 * satisfy a limited request.
 */
async function fetchList(
	ctx: IExecuteFunctions,
	resource: string,
	i: number,
): Promise<IDataObject[]> {
	const returnAll = ctx.getNodeParameter('returnAll', i) as boolean;
	const limit = returnAll ? Infinity : (ctx.getNodeParameter('limit', i) as number);

	const items: IDataObject[] = [];
	let exhausted = false;

	for (let page = 1; page <= MAX_LIST_PAGES; page++) {
		const batch = (await bannerbearApiRequest.call(
			ctx,
			'GET',
			resource,
			{},
			{
				page,
			},
		)) as IDataObject[];

		if (!Array.isArray(batch) || batch.length === 0) {
			exhausted = true;
			break;
		}

		items.push(...batch);

		if (items.length >= limit) {
			exhausted = true;
			break;
		}

		if (batch.length < PAGE_SIZE) {
			exhausted = true;
			break;
		}
	}

	if (!exhausted) {
		throw new NodeOperationError(
			ctx.getNode(),
			`Too many records to return at once from ${resource}`,
			{
				description:
					`Stopped after ${MAX_LIST_PAGES} pages, around ${MAX_LIST_PAGES * PAGE_SIZE} records, ` +
					'so the result would have been incomplete. Turn off Return All and set a Limit instead.',
			},
		);
	}

	return returnAll ? items : items.slice(0, limit);
}

function buildLayerObjects(rows: IDataObject[]): IDataObject[] {
	const objects: IDataObject[] = [];

	for (const row of rows) {
		if (!row.id) continue;

		const object: IDataObject = { id: row.id };
		for (const [name, value] of Object.entries(row)) {
			if (name === 'id') continue;
			if (value === undefined || value === null || value === '') continue;
			if (LAYER_FIELD_DEFAULTS[name] === value) continue;

			const key = (LAYER_PROPERTY_NAMES[name] as string) ?? name;
			object[key] = name === 'hidden' ? toBoolean(value) : value;
		}

		if (Object.keys(object).length > 1) objects.push(object);
	}

	return objects;
}

async function createImage(this: IExecuteFunctions, i: number): Promise<IDataObject> {
	const templateId = this.getNodeParameter('templateId', i) as string;
	const additionalFields = this.getNodeParameter('additionalFields', i);
	const waitForImage = this.getNodeParameter('waitForImage', i) as boolean;
	const modificationsUi = this.getNodeParameter('modificationsUi', i) as IDataObject;

	const objects = buildLayerObjects((modificationsUi.modificationsValues ?? []) as IDataObject[]);

	const modifications: IDataObject = { objects };

	const templateSize = compact({
		width: additionalFields.templateWidth,
		height: additionalFields.templateHeight,
	});
	if (Object.keys(templateSize).length) modifications.template = templateSize;

	const body = compact({
		template: templateId,
		modifications,
		formats: (additionalFields.formats as string[])?.length ? additionalFields.formats : undefined,
		scale: additionalFields.scale,
		quality: additionalFields.quality,
		metadata: additionalFields.metadata,
	});

	// The sync host renders inline and returns the finished image.
	const host = waitForImage ? 'https://sync.api.bannerbear.com/v5' : undefined;
	let image = (await bannerbearApiRequest.call(
		this,
		'POST',
		'/images',
		body,
		{},
		host,
	)) as IDataObject;

	if (waitForImage && image.status !== 'completed' && image.status !== 'failed') {
		for (let tries = 0; tries < 30; tries++) {
			await sleep(TOOL_POLL_INTERVAL_MS);
			image = (await bannerbearApiRequest.call(
				this,
				'GET',
				`/images/${image.uid as string}`,
			)) as IDataObject;
			if (image.status === 'completed' || image.status === 'failed') break;
		}
	}

	return flattenImageFiles(image);
}

async function runWorkflow(this: IExecuteFunctions, i: number): Promise<IDataObject> {
	const workflowId = this.getNodeParameter('workflowId', i) as string;
	const inputsUi = this.getNodeParameter('inputsUi', i) as IDataObject;
	const waitForCompletion = this.getNodeParameter('waitForCompletion', i) as boolean;

	const inputs: IDataObject = {};
	for (const entry of (inputsUi.inputValues ?? []) as IDataObject[]) {
		if (!entry.name) continue;
		inputs[entry.name as string] = entry.value;
	}

	let run = (await bannerbearApiRequest.call(this, 'POST', '/workflow_runs', {
		workflow: workflowId,
		inputs,
	})) as IDataObject;

	if (!waitForCompletion) return run;

	const maxTries = this.getNodeParameter('maxTries', i, 30) as number;
	for (let tries = 0; tries < maxTries; tries++) {
		if (run.status === 'completed' || run.status === 'failed') break;
		await sleep(TOOL_POLL_INTERVAL_MS);
		run = (await bannerbearApiRequest.call(
			this,
			'GET',
			`/workflow_runs/${run.uid as string}`,
		)) as IDataObject;
	}

	if (run.status === 'failed') {
		throw new NodeApiError(this.getNode(), run as JsonObject, {
			message: (run.error as string) ?? 'The workflow run failed',
		});
	}

	return run;
}

async function createAnimation(this: IExecuteFunctions, i: number): Promise<IDataObject> {
	const templateId = this.getNodeParameter('templateId', i) as string;
	const options = this.getNodeParameter('animationOptions', i) as IDataObject;
	const waitForCompletion = this.getNodeParameter('waitForCompletion', i) as boolean;
	const modificationsUi = this.getNodeParameter('modificationsUi', i) as IDataObject;

	const objects = buildLayerObjects((modificationsUi.modificationsValues ?? []) as IDataObject[]);

	const modifications: IDataObject = { objects };
	const templateOverrides = compact({
		width: options.width,
		height: options.height,
		fps: options.fps,
		transparent: options.transparent,
	});
	if (Object.keys(templateOverrides).length) modifications.template = templateOverrides;

	const body = compact({
		template: templateId,
		modifications,
		formats: (options.formats as string[])?.length ? options.formats : undefined,
		metadata: options.metadata,
	});

	let animation = (await bannerbearApiRequest.call(
		this,
		'POST',
		'/animations',
		body,
	)) as IDataObject;

	if (waitForCompletion) {
		const maxTries = this.getNodeParameter('maxTries', i, 30) as number;
		for (let tries = 0; tries < maxTries; tries++) {
			if (animation.status === 'completed' || animation.status === 'failed') break;
			await sleep(TOOL_POLL_INTERVAL_MS);
			animation = (await bannerbearApiRequest.call(
				this,
				'GET',
				`/animations/${animation.uid as string}`,
			)) as IDataObject;
		}

		if (animation.status === 'failed') {
			throw new NodeApiError(this.getNode(), animation as JsonObject, {
				message: (animation.error as string) ?? 'The animation failed to render',
			});
		}
	}

	return flattenAnimationFiles(animation);
}

async function executeTool(
	this: IExecuteFunctions,
	operation: string | number | boolean | object,
	i: number,
): Promise<IDataObject> {
	const metadata = this.getNodeParameter('metadata', i, '') as string;
	const param = <T>(name: string, fallback?: T) => this.getNodeParameter(name, i, fallback) as T;

	switch (operation) {
		case 'removeBackground':
			return await runTool.call(
				this,
				'remove_bg',
				{
					image_url: param<string>('imageUrl'),
					metadata,
				},
				i,
			);

		case 'createPdf':
			return await runTool.call(
				this,
				'create_pdf',
				{
					urls: linesToArray(param<string>('urls')),
					metadata,
				},
				i,
			);

		case 'trimVideo':
			return await runTool.call(
				this,
				'trim_video',
				{
					video_url: param<string>('videoUrl'),
					start: param<number>('start'),
					end: param<number>('end'),
					metadata,
				},
				i,
			);

		case 'joinVideos': {
			const options = param<IDataObject>('joinOptions', {});
			return await runTool.call(
				this,
				'concat_videos',
				{
					video_urls: linesToArray(param<string>('videoUrls')),
					width: options.width,
					height: options.height,
					metadata,
				},
				i,
			);
		}

		case 'resizeVideo':
			return await runTool.call(
				this,
				'resize_video',
				{
					video_url: param<string>('videoUrl'),
					width: param<number>('width'),
					height: param<number>('height'),
					fit: param<string>('fit'),
					metadata,
				},
				i,
			);

		case 'cropVideo':
			return await runTool.call(
				this,
				'crop_video',
				{
					video_url: param<string>('videoUrl'),
					x: param<number>('x'),
					y: param<number>('y'),
					width: param<number>('width'),
					height: param<number>('height'),
					metadata,
				},
				i,
			);

		case 'overlayVideo': {
			const options = param<IDataObject>('overlayVideoOptions', {});
			return await runTool.call(
				this,
				'overlay_video',
				{
					base_video_url: param<string>('baseVideoUrl'),
					overlay_video_url: param<string>('overlayVideoUrl'),
					x: param<number>('x'),
					y: param<number>('y'),
					scale: options.scale,
					start: options.start,
					metadata,
				},
				i,
			);
		}

		case 'overlayImage': {
			const options = param<IDataObject>('overlayImageOptions', {});
			return await runTool.call(
				this,
				'overlay_image',
				{
					video_url: param<string>('videoUrl'),
					image_url: param<string>('overlayImageUrl'),
					x: param<number>('x'),
					y: param<number>('y'),
					opacity: options.opacity,
					metadata,
				},
				i,
			);
		}

		case 'subtitleVideo': {
			const options = param<IDataObject>('subtitleOptions', {});
			return await runTool.call(
				this,
				'subtitle_video',
				{
					video_url: param<string>('videoUrl'),
					...options,
					metadata,
				},
				i,
			);
		}

		case 'generateVoiceover':
			return await runTool.call(
				this,
				'generate_voiceover',
				{
					text: param<string>('text'),
					voice: param<string>('voice'),
					metadata,
				},
				i,
			);

		case 'addAudio': {
			const options = param<IDataObject>('addAudioOptions', {});
			return await runTool.call(
				this,
				'add_audio',
				{
					video_url: param<string>('videoUrl'),
					audio_url: param<string>('audioUrl'),
					mode: param<string>('mode'),
					...options,
					metadata,
				},
				i,
			);
		}

		case 'addCoverArt':
			return await runTool.call(
				this,
				'add_cover_art',
				{
					video_url: param<string>('videoUrl'),
					image_url: param<string>('coverImageUrl'),
					metadata,
				},
				i,
			);

		case 'createVideoSlideshow': {
			const options = param<IDataObject>('slideshowOptions', {});
			return await runTool.call(
				this,
				'create_video_slideshow',
				{
					image_urls: linesToArray(param<string>('imageUrls')),
					...options,
					metadata,
				},
				i,
			);
		}

		case 'applyColorFilter':
			return await runTool.call(
				this,
				'apply_color_filter',
				{
					video_url: param<string>('videoUrl'),
					filter: param<string>('filter'),
					metadata,
				},
				i,
			);

		case 'softenVideo':
			return await runTool.call(
				this,
				'soften_video',
				{
					video_url: param<string>('videoUrl'),
					strength: param<string>('strength'),
					metadata,
				},
				i,
			);

		default:
			return {};
	}
}
