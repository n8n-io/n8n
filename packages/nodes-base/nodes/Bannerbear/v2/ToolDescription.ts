import type { INodeProperties } from 'n8n-workflow';

export const toolOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['tool'],
			},
		},
		options: [
			{
				name: 'Create PDF',
				value: 'createPdf',
				description: 'Combine images and PDFs into one multi-page document',
				action: 'Create a PDF',
			},
			{
				name: 'Crop Video',
				value: 'cropVideo',
				description: 'Crop a video to an exact rectangle',
				action: 'Crop a video',
			},
			{
				name: 'Join Videos',
				value: 'joinVideos',
				description: 'Join two or more videos end to end',
				action: 'Join videos',
			},
			{
				name: 'Overlay Image',
				value: 'overlayImage',
				description: 'Burn a logo, watermark, or badge onto a video',
				action: 'Overlay an image on a video',
			},
			{
				name: 'Overlay Video',
				value: 'overlayVideo',
				description: 'Layer one video on another as picture in picture',
				action: 'Overlay a video on a video',
			},
			{
				name: 'Remove Background',
				value: 'removeBackground',
				description: 'Cut the subject out of an image against transparency',
				action: 'Remove an image background',
			},
			{
				name: 'Resize Video',
				value: 'resizeVideo',
				description: 'Rescale a video to target dimensions',
				action: 'Resize a video',
			},
			{
				name: 'Trim Video',
				value: 'trimVideo',
				description: 'Keep a slice of a video by start and end time',
				action: 'Trim a video',
			},
		],
		default: 'removeBackground',
	},
];

export const toolFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                          tool:removeBackground                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Image URL',
		name: 'imageUrl',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['tool'],
				operation: ['removeBackground'],
			},
		},
		description: 'Publicly reachable URL of the source PNG or JPG',
	},
	/* -------------------------------------------------------------------------- */
	/*                             tool:createPdf                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Source URLs',
		name: 'urls',
		type: 'string',
		typeOptions: {
			rows: 4,
		},
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['tool'],
				operation: ['createPdf'],
			},
		},
		description: 'One JPG, PNG, or PDF URL per line. Page order is preserved.',
	},
	/* -------------------------------------------------------------------------- */
	/*                        video tools: source video                           */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Video URL',
		name: 'videoUrl',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['tool'],
				operation: ['trimVideo', 'resizeVideo', 'cropVideo', 'overlayImage'],
			},
		},
		description: 'Publicly reachable URL of the source video',
	},
	/* -------------------------------------------------------------------------- */
	/*                              tool:trimVideo                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Start',
		name: 'start',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: {
				resource: ['tool'],
				operation: ['trimVideo'],
			},
		},
		description: 'Start position in seconds',
	},
	{
		displayName: 'End',
		name: 'end',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: {
				resource: ['tool'],
				operation: ['trimVideo'],
			},
		},
		description: 'End position in seconds',
	},
	/* -------------------------------------------------------------------------- */
	/*                             tool:joinVideos                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Video URLs',
		name: 'videoUrls',
		type: 'string',
		typeOptions: {
			rows: 4,
		},
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['tool'],
				operation: ['joinVideos'],
			},
		},
		description: 'One video URL per line, in play order. Two or more are required.',
	},
	{
		displayName: 'Options',
		name: 'joinOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['tool'],
				operation: ['joinVideos'],
			},
		},
		options: [
			{
				displayName: 'Height',
				name: 'height',
				type: 'number',
				default: 720,
				description: 'Output height in pixels',
			},
			{
				displayName: 'Width',
				name: 'width',
				type: 'number',
				default: 1280,
				description: 'Output width in pixels',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                        tool:resizeVideo / cropVideo                        */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Width',
		name: 'width',
		type: 'number',
		required: true,
		default: 1280,
		displayOptions: {
			show: {
				resource: ['tool'],
				operation: ['resizeVideo', 'cropVideo'],
			},
		},
		description: 'Target width in pixels',
	},
	{
		displayName: 'Height',
		name: 'height',
		type: 'number',
		required: true,
		default: 720,
		displayOptions: {
			show: {
				resource: ['tool'],
				operation: ['resizeVideo', 'cropVideo'],
			},
		},
		description: 'Target height in pixels',
	},
	{
		displayName: 'Fit',
		name: 'fit',
		type: 'options',
		options: [
			{
				name: 'Contain',
				value: 'contain',
				description: 'Letterbox to fit inside the target size',
			},
			{
				name: 'Cover',
				value: 'cover',
				description: 'Crop to fill the target size',
			},
		],
		default: 'cover',
		displayOptions: {
			show: {
				resource: ['tool'],
				operation: ['resizeVideo'],
			},
		},
		description: 'How to fit the source into the target size',
	},
	/* -------------------------------------------------------------------------- */
	/*                    position, shared by crop and overlays                   */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'X',
		name: 'x',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: {
				resource: ['tool'],
				operation: ['cropVideo', 'overlayVideo', 'overlayImage'],
			},
		},
		description: 'Left offset in pixels',
	},
	{
		displayName: 'Y',
		name: 'y',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: {
				resource: ['tool'],
				operation: ['cropVideo', 'overlayVideo', 'overlayImage'],
			},
		},
		description: 'Top offset in pixels',
	},
	/* -------------------------------------------------------------------------- */
	/*                            tool:overlayVideo                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Base Video URL',
		name: 'baseVideoUrl',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['tool'],
				operation: ['overlayVideo'],
			},
		},
		description: 'Publicly reachable URL of the video underneath',
	},
	{
		displayName: 'Overlay Video URL',
		name: 'overlayVideoUrl',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['tool'],
				operation: ['overlayVideo'],
			},
		},
		description: 'Publicly reachable URL of the video placed on top',
	},
	{
		displayName: 'Options',
		name: 'overlayVideoOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['tool'],
				operation: ['overlayVideo'],
			},
		},
		options: [
			{
				displayName: 'Scale',
				name: 'scale',
				type: 'number',
				typeOptions: {
					numberPrecision: 2,
				},
				default: 1,
				description: 'Size of the overlay, where 1 is original size',
			},
			{
				displayName: 'Start',
				name: 'start',
				type: 'number',
				default: 0,
				description: 'When the overlay begins, in seconds',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                            tool:overlayImage                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Overlay Image URL',
		name: 'overlayImageUrl',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['tool'],
				operation: ['overlayImage'],
			},
		},
		description: 'Publicly reachable URL of the logo, watermark, or badge',
	},
	{
		displayName: 'Options',
		name: 'overlayImageOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['tool'],
				operation: ['overlayImage'],
			},
		},
		options: [
			{
				displayName: 'Opacity',
				name: 'opacity',
				type: 'number',
				typeOptions: {
					minValue: 0,
					maxValue: 1,
					numberPrecision: 2,
				},
				default: 1,
				description: 'Overlay opacity between 0 and 1',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                       shared across every tool                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Metadata',
		name: 'metadata',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['tool'],
			},
		},
		description: 'Value stored with the job, so you can match a result back to its source',
	},
	{
		displayName: 'Wait for Completion',
		name: 'waitForCompletion',
		type: 'boolean',
		default: true,
		displayOptions: {
			show: {
				resource: ['tool'],
			},
		},
		description:
			'Whether to poll until the job finishes. Turn this off to return a pending job immediately.',
	},
	{
		displayName: 'Max Tries',
		name: 'maxTries',
		type: 'number',
		typeOptions: {
			minValue: 1,
			maxValue: 300,
		},
		default: 30,
		displayOptions: {
			show: {
				resource: ['tool'],
				waitForCompletion: [true],
			},
		},
		description: 'How many times to check the job before giving up, at two seconds apart',
	},
];

export const toolJobOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['toolJob'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get a tool job',
				action: 'Get a tool job',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many tool jobs',
				action: 'Get many tool jobs',
			},
		],
		default: 'get',
	},
];

export const toolJobFields: INodeProperties[] = [
	{
		displayName: 'Tool Job ID',
		name: 'toolJobId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['toolJob'],
				operation: ['get'],
			},
		},
		description: 'Unique identifier returned when the tool job was created',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['toolJob'],
				operation: ['getAll'],
			},
		},
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: {
			minValue: 1,
		},
		default: 50,
		displayOptions: {
			show: {
				resource: ['toolJob'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		description: 'Max number of results to return',
	},
];
