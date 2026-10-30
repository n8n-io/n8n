import getSystemFonts from 'get-system-fonts';
import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeProperties,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { parse as pathParse } from 'path';

import { router } from './v2/actions/router';

const nodeOperations: INodePropertyOptions[] = [
	{
		name: 'Blur',
		value: 'blur',
		description: 'Adds a blur to the image and so makes it less sharp',
		action: 'Blur Image',
	},
	{
		name: 'Border',
		value: 'border',
		description: 'Adds a border to the image',
		action: 'Border Image',
	},
	{
		name: 'Composite',
		value: 'composite',
		description: 'Composite image on top of another one',
		action: 'Composite Image',
	},
	{
		name: 'Create',
		value: 'create',
		description: 'Create a new image',
		action: 'Create Image',
	},
	{
		name: 'Crop',
		value: 'crop',
		description: 'Crops the image',
		action: 'Crop Image',
	},
	{
		name: 'Draw',
		value: 'draw',
		description: 'Draw on image',
		action: 'Draw Image',
	},
	{
		name: 'Rotate',
		value: 'rotate',
		description: 'Rotate image',
		action: 'Rotate Image',
	},
	{
		name: 'Resize',
		value: 'resize',
		description: 'Change the size of image',
		action: 'Resize Image',
	},
	{
		name: 'Shear',
		value: 'shear',
		description: 'Shear image along the X or Y axis',
		action: 'Shear Image',
	},
	{
		name: 'Text',
		value: 'text',
		description: 'Adds text to image',
		action: 'Apply Text to Image',
	},
	{
		name: 'Transparent',
		value: 'transparent',
		description: 'Make a color in image transparent',
		action: 'Add Transparency to Image',
	},
];

const nodeOperationOptions: INodeProperties[] = [
	// ----------------------------------
	//         create
	// ----------------------------------
	{
		displayName: 'Background Color',
		name: 'backgroundColor',
		type: 'color',
		default: '#ffffff00',
		typeOptions: {
			showAlpha: true,
		},
		displayOptions: {
			show: {
				operation: ['create'],
			},
		},
		description: 'The background color of the image to create',
	},
	{
		displayName: 'Image Width',
		name: 'width',
		type: 'number',
		default: 50,
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				operation: ['create'],
			},
		},
		description: 'The width of the image to create',
	},
	{
		displayName: 'Image Height',
		name: 'height',
		type: 'number',
		default: 50,
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				operation: ['create'],
			},
		},
		description: 'The height of the image to create',
	},

	// ----------------------------------
	//         draw
	// ----------------------------------
	{
		displayName: 'Primitive',
		name: 'primitive',
		type: 'options',
		displayOptions: {
			show: {
				operation: ['draw'],
			},
		},
		options: [
			{
				name: 'Circle',
				value: 'circle',
			},
			{
				name: 'Line',
				value: 'line',
			},
			{
				name: 'Rectangle',
				value: 'rectangle',
			},
		],
		default: 'rectangle',
		description: 'The primitive to draw',
	},
	{
		displayName: 'Color',
		name: 'color',
		type: 'color',
		default: '#ff000000',
		typeOptions: {
			showAlpha: true,
		},
		displayOptions: {
			show: {
				operation: ['draw'],
			},
		},
		description: 'The color of the primitive to draw',
	},
	{
		displayName: 'Start Position X',
		name: 'startPositionX',
		type: 'number',
		default: 50,
		displayOptions: {
			show: {
				operation: ['draw'],
				primitive: ['circle', 'line', 'rectangle'],
			},
		},
		description: 'X (horizontal) start position of the primitive',
	},
	{
		displayName: 'Start Position Y',
		name: 'startPositionY',
		type: 'number',
		default: 50,
		displayOptions: {
			show: {
				operation: ['draw'],
				primitive: ['circle', 'line', 'rectangle'],
			},
		},
		description: 'Y (horizontal) start position of the primitive',
	},
	{
		displayName: 'End Position X',
		name: 'endPositionX',
		type: 'number',
		default: 250,
		displayOptions: {
			show: {
				operation: ['draw'],
				primitive: ['circle', 'line', 'rectangle'],
			},
		},
		description: 'X (horizontal) end position of the primitive',
	},
	{
		displayName: 'End Position Y',
		name: 'endPositionY',
		type: 'number',
		default: 250,
		displayOptions: {
			show: {
				operation: ['draw'],
				primitive: ['circle', 'line', 'rectangle'],
			},
		},
		description: 'Y (horizontal) end position of the primitive',
	},
	{
		displayName: 'Corner Radius',
		name: 'cornerRadius',
		type: 'number',
		default: 0,
		displayOptions: {
			show: {
				operation: ['draw'],
				primitive: ['rectangle'],
			},
		},
		description: 'The radius of the corner to create round corners',
	},

	// ----------------------------------
	//         text
	// ----------------------------------
	{
		displayName: 'Text',
		name: 'text',
		typeOptions: {
			rows: 5,
		},
		type: 'string',
		default: '',
		placeholder: 'Text to render',
		displayOptions: {
			show: {
				operation: ['text'],
			},
		},
		description: 'Text to write on the image',
	},
	{
		displayName: 'Font Size',
		name: 'fontSize',
		type: 'number',
		default: 18,
		displayOptions: {
			show: {
				operation: ['text'],
			},
		},
		description: 'Size of the text',
	},
	{
		displayName: 'Font Color',
		name: 'fontColor',
		type: 'color',
		default: '#000000',
		displayOptions: {
			show: {
				operation: ['text'],
			},
		},
		description: 'Color of the text',
	},
	{
		displayName: 'Position X',
		name: 'positionX',
		type: 'number',
		default: 50,
		displayOptions: {
			show: {
				operation: ['text'],
			},
		},
		description: 'X (horizontal) position of the text',
	},
	{
		displayName: 'Position Y',
		name: 'positionY',
		type: 'number',
		default: 50,
		displayOptions: {
			show: {
				operation: ['text'],
			},
		},
		description: 'Y (vertical) position of the text',
	},
	{
		displayName: 'Horizontal Alignment',
		name: 'horizontalAlignment',
		type: 'options',
		options: [
			{
				name: 'Left',
				value: 'west',
			},
			{
				name: 'Center',
				value: 'center',
			},
			{
				name: 'Right',
				value: 'east',
			},
		],
		default: 'center',
		displayOptions: {
			show: {
				operation: ['text'],
				'@version': [{ _cnd: { gte: 1.1 } }],
			},
		},
		description: 'Horizontal alignment of the text',
	},
	{
		displayName: 'Vertical Alignment',
		name: 'verticalAlignment',
		type: 'options',
		options: [
			{
				name: 'Top',
				value: 'north',
			},
			{
				name: 'Middle',
				value: 'middle',
			},
			{
				name: 'Bottom',
				value: 'south',
			},
		],
		default: 'middle',
		displayOptions: {
			show: {
				operation: ['text'],
				'@version': [{ _cnd: { gte: 1.1 } }],
			},
		},
		description: 'Vertical alignment of the text',
	},
	{
		displayName: 'Max Line Length',
		name: 'lineLength',
		type: 'number',
		typeOptions: {
			minValue: 1,
		},
		default: 80,
		displayOptions: {
			show: {
				operation: ['text'],
			},
		},
		description: 'Max amount of characters in a line before a line-break should get added',
	},

	// ----------------------------------
	//         blur
	// ----------------------------------
	{
		displayName: 'Blur',
		name: 'blur',
		type: 'number',
		typeOptions: {
			minValue: 0,
			maxValue: 1000,
		},
		default: 5,
		displayOptions: {
			show: {
				operation: ['blur'],
				'@version': [{ _cnd: { lt: 2 } }],
			},
		},
		description: 'How strong the blur should be',
	},
	{
		displayName: 'Sigma',
		name: 'sigma',
		type: 'number',
		typeOptions: {
			minValue: 0,
			maxValue: 1000,
		},
		default: 2,
		displayOptions: {
			show: {
				operation: ['blur'],
				'@version': [{ _cnd: { lt: 2 } }],
			},
		},
		description: 'The sigma of the blur',
	},
	{
		displayName: 'Blur Radius',
		name: 'blurRadius',
		type: 'number',
		typeOptions: {
			minValue: 0,
			maxValue: 1000,
		},
		default: 5,
		displayOptions: {
			show: {
				operation: ['blur'],
				'@version': [{ _cnd: { gte: 2 } }],
			},
		},
		description: 'Blur radius in pixels',
	},

	// ----------------------------------
	//         border
	// ----------------------------------
	{
		displayName: 'Border Width',
		name: 'borderWidth',
		type: 'number',
		default: 10,
		displayOptions: {
			show: {
				operation: ['border'],
			},
		},
		description: 'The width of the border',
	},
	{
		displayName: 'Border Height',
		name: 'borderHeight',
		type: 'number',
		default: 10,
		displayOptions: {
			show: {
				operation: ['border'],
			},
		},
		description: 'The height of the border',
	},
	{
		displayName: 'Border Color',
		name: 'borderColor',
		type: 'color',
		default: '#000000',
		displayOptions: {
			show: {
				operation: ['border'],
			},
		},
		description: 'Color of the border',
	},

	// ----------------------------------
	//         composite
	// ----------------------------------
	{
		displayName: 'Composite Image Property',
		name: 'dataPropertyNameComposite',
		type: 'string',
		default: '',
		placeholder: 'data2',
		displayOptions: {
			show: {
				operation: ['composite'],
			},
		},
		description:
			'The name of the binary property which contains the data of the image to composite on top of image which is found in Property Name',
	},
	{
		displayName: 'Operator',
		name: 'operator',
		type: 'options',
		displayOptions: {
			show: {
				operation: ['composite'],
			},
		},
		options: [
			{
				name: 'Add',
				value: 'Add',
			},
			{
				name: 'Atop',
				value: 'Atop',
			},
			{
				name: 'Bumpmap',
				value: 'Bumpmap',
			},
			{
				name: 'Copy',
				value: 'Copy',
			},
			{
				name: 'Copy Black',
				value: 'CopyBlack',
			},
			{
				name: 'Copy Blue',
				value: 'CopyBlue',
			},
			{
				name: 'Copy Cyan',
				value: 'CopyCyan',
			},
			{
				name: 'Copy Green',
				value: 'CopyGreen',
			},
			{
				name: 'Copy Magenta',
				value: 'CopyMagenta',
			},
			{
				name: 'Copy Opacity',
				value: 'CopyOpacity',
			},
			{
				name: 'Copy Red',
				value: 'CopyRed',
			},
			{
				name: 'Copy Yellow',
				value: 'CopyYellow',
			},
			{
				name: 'Difference',
				value: 'Difference',
			},
			{
				name: 'Divide',
				value: 'Divide',
			},
			{
				name: 'In',
				value: 'In',
			},
			{
				name: 'Minus',
				value: 'Minus',
			},
			{
				name: 'Multiply',
				value: 'Multiply',
			},
			{
				name: 'Out',
				value: 'Out',
			},
			{
				name: 'Over',
				value: 'Over',
			},
			{
				name: 'Plus',
				value: 'Plus',
			},
			{
				name: 'Subtract',
				value: 'Subtract',
			},
			{
				name: 'Xor',
				value: 'Xor',
			},
		],
		default: 'Over',
		description: 'The operator to use to combine the images',
	},
	{
		displayName: 'Position X',
		name: 'positionX',
		type: 'number',
		default: 0,
		displayOptions: {
			show: {
				operation: ['composite'],
			},
		},
		description: 'X (horizontal) position of composite image',
	},
	{
		displayName: 'Position Y',
		name: 'positionY',
		type: 'number',
		default: 0,
		displayOptions: {
			show: {
				operation: ['composite'],
			},
		},
		description: 'Y (vertical) position of composite image',
	},

	// ----------------------------------
	//         crop
	// ----------------------------------
	{
		displayName: 'Width',
		name: 'width',
		type: 'number',
		default: 500,
		displayOptions: {
			show: {
				operation: ['crop'],
			},
		},
		description: 'Crop width',
	},
	{
		displayName: 'Height',
		name: 'height',
		type: 'number',
		default: 500,
		displayOptions: {
			show: {
				operation: ['crop'],
			},
		},
		description: 'Crop height',
	},
	{
		displayName: 'Position X',
		name: 'positionX',
		type: 'number',
		default: 0,
		displayOptions: {
			show: {
				operation: ['crop'],
			},
		},
		description: 'X (horizontal) position to crop from',
	},
	{
		displayName: 'Position Y',
		name: 'positionY',
		type: 'number',
		default: 0,
		displayOptions: {
			show: {
				operation: ['crop'],
			},
		},
		description: 'Y (vertical) position to crop from',
	},

	// ----------------------------------
	//         resize
	// ----------------------------------
	{
		displayName: 'Width',
		name: 'width',
		type: 'number',
		default: 500,
		displayOptions: {
			show: {
				operation: ['resize'],
			},
		},
		description: 'New width of the image',
	},
	{
		displayName: 'Height',
		name: 'height',
		type: 'number',
		default: 500,
		displayOptions: {
			show: {
				operation: ['resize'],
			},
		},
		description: 'New height of the image',
	},
	{
		displayName: 'Option',
		name: 'resizeOption',
		type: 'options',
		options: [
			{
				name: 'Ignore Aspect Ratio',
				value: 'ignoreAspectRatio',
				description: 'Ignore aspect ratio and resize exactly to specified values',
			},
			{
				name: 'Maximum Area',
				value: 'maximumArea',
				description: 'Specified values are maximum area',
			},
			{
				name: 'Minimum Area',
				value: 'minimumArea',
				description: 'Specified values are minimum area',
			},
			{
				name: 'Only if Larger',
				value: 'onlyIfLarger',
				description: 'Resize only if image is larger than width or height',
			},
			{
				name: 'Only if Smaller',
				value: 'onlyIfSmaller',
				description: 'Resize only if image is smaller than width or height',
			},
			{
				name: 'Percent',
				value: 'percent',
				description: 'Width and height are specified in percents',
			},
		],
		default: 'maximumArea',
		displayOptions: {
			show: {
				operation: ['resize'],
			},
		},
		description: 'How to resize the image',
	},

	// ----------------------------------
	//         rotate
	// ----------------------------------
	{
		displayName: 'Rotate',
		name: 'rotate',
		type: 'number',
		typeOptions: {
			minValue: -360,
			maxValue: 360,
		},
		default: 0,
		displayOptions: {
			show: {
				operation: ['rotate'],
			},
		},
		description: 'How much the image should be rotated',
	},
	{
		displayName: 'Background Color',
		name: 'backgroundColor',
		type: 'color',
		default: '#ffffffff',
		typeOptions: {
			showAlpha: true,
		},
		displayOptions: {
			show: {
				operation: ['rotate'],
			},
		},
		description:
			'The color to use for the background when image gets rotated by anything which is not a multiple of 90',
	},

	// ----------------------------------
	//         shear
	// ----------------------------------
	{
		displayName: 'Degrees X',
		name: 'degreesX',
		type: 'number',
		default: 0,
		displayOptions: {
			show: {
				operation: ['shear'],
			},
		},
		description: 'X (horizontal) shear degrees',
	},
	{
		displayName: 'Degrees Y',
		name: 'degreesY',
		type: 'number',
		default: 0,
		displayOptions: {
			show: {
				operation: ['shear'],
			},
		},
		description: 'Y (vertical) shear degrees',
	},

	// ----------------------------------
	//         transparent
	// ----------------------------------
	{
		displayName: 'Color',
		name: 'color',
		type: 'color',
		default: '#ff0000',
		displayOptions: {
			show: {
				operation: ['transparent'],
			},
		},
		description: 'The color to make transparent',
	},
];

export class EditImage implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Edit Image',
		name: 'editImage',
		icon: 'node:edit-image',
		iconColor: 'purple',
		group: ['transform'],
		version: [1, 1.1, 2],
		defaultVersion: 2,
		description: 'Edits an image like blur, resize or adding border and text',
		defaults: {
			name: 'Edit Image',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName:
					'This node version is no longer supported. Upgrade to version 2 to run this workflow.',
				name: 'legacyVersionNotice',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						'@version': [{ _cnd: { lt: 2 } }],
					},
				},
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Get Information',
						value: 'information',
						description: 'Returns image information like resolution',
					},
					{
						name: 'Multi Step',
						value: 'multiStep',
						description: 'Perform multiple operations',
					},
					...nodeOperations,
				].sort((a, b) => {
					if (a.name.toLowerCase() < b.name.toLowerCase()) {
						return -1;
					}
					if (a.name.toLowerCase() > b.name.toLowerCase()) {
						return 1;
					}
					return 0;
				}),
				default: 'border',
			},
			{
				displayName: 'Property Name',
				name: 'dataPropertyName',
				type: 'string',
				default: 'data',
				description: 'Name of the binary property in which the image data can be found',
			},

			// ----------------------------------
			//         multiStep
			// ----------------------------------
			{
				displayName: 'Operations',
				name: 'operations',
				placeholder: 'Add Operation',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
					sortable: true,
				},
				displayOptions: {
					show: {
						operation: ['multiStep'],
					},
				},
				description: 'The operations to perform',
				default: {},
				options: [
					{
						name: 'operations',
						displayName: 'Operations',
						values: [
							{
								displayName: 'Operation',
								name: 'operation',
								type: 'options',
								noDataExpression: true,
								options: nodeOperations,
								default: '',
							},
							...nodeOperationOptions,
							{
								displayName: 'Font Name or ID',
								name: 'font',
								type: 'options',
								displayOptions: {
									show: {
										operation: ['text'],
									},
								},
								typeOptions: {
									loadOptionsMethod: 'getFonts',
								},
								default: '',
								description:
									'The font to use. Defaults to Arial. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
							},
						],
					},
				],
			},

			...nodeOperationOptions,
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add option',
				default: {},
				displayOptions: {
					hide: {
						operation: ['information'],
					},
				},
				options: [
					{
						displayName: 'Destination Output Field',
						name: 'destinationKey',
						type: 'string',
						default: 'data',
						placeholder: 'e.g image',
						description: 'The name of the output field that will contain the file data',
					},
					{
						displayName: 'File Name',
						name: 'fileName',
						type: 'string',
						default: '',
						description: 'File name to set in binary data',
					},
					{
						displayName: 'Font Name or ID',
						name: 'font',
						type: 'options',
						displayOptions: {
							show: {
								'/operation': ['text'],
							},
						},
						typeOptions: {
							loadOptionsMethod: 'getFonts',
						},
						default: '',
						description:
							'The font to use. Defaults to Arial. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
					},
					{
						displayName: 'Format',
						name: 'format',
						type: 'options',
						options: [
							{
								name: 'bmp',
								value: 'bmp',
							},
							{
								name: 'gif',
								value: 'gif',
							},
							{
								name: 'jpeg',
								value: 'jpeg',
							},
							{
								name: 'png',
								value: 'png',
							},
							{
								name: 'tiff',
								value: 'tiff',
							},
							{
								name: 'WebP',
								value: 'webp',
							},
						],
						default: 'jpeg',
						description: 'Set the output image format',
					},
					{
						displayName: 'Quality',
						name: 'quality',
						type: 'number',
						typeOptions: {
							minValue: 0,
							maxValue: 100,
						},
						default: 100,
						displayOptions: {
							show: {
								format: ['jpeg', 'png', 'tiff'],
								'@version': [{ _cnd: { lt: 2 } }],
							},
						},
						description: 'Sets the jpeg|png|tiff compression level from 0 to 100 (best)',
					},
					{
						displayName: 'Quality',
						name: 'quality',
						type: 'number',
						typeOptions: {
							minValue: 0,
							maxValue: 100,
						},
						default: 100,
						displayOptions: {
							show: {
								format: ['jpeg', 'webp'],
								'@version': [{ _cnd: { gte: 2 } }],
							},
						},
						description: 'Sets the JPEG or WebP quality from 0 to 100',
					},
				],
			},
		],
	};

	methods = {
		loadOptions: {
			async getFonts(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const files = await getSystemFonts();
				const returnData: INodePropertyOptions[] = [];

				files.forEach((entry: string) => {
					const pathParts = pathParse(entry);
					if (!pathParts.ext) {
						return;
					}

					returnData.push({
						name: pathParts.name,
						value: entry,
					});
				});

				returnData.sort((a, b) => {
					if (a.name < b.name) {
						return -1;
					}
					if (a.name > b.name) {
						return 1;
					}
					return 0;
				});

				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions) {
		if (this.getNode().typeVersion < 2) {
			throw new NodeOperationError(
				this.getNode(),
				'Edit Image versions 1 and 1.1 are no longer supported. Upgrade the node to version 2.',
			);
		}

		return await router.call(this);
	}
}
