import { Jimp, BlendMode, rgbaToInt } from 'jimp';
import type {
	IBinaryData,
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, deepCopy } from 'n8n-workflow';

type EditImageNodeOptions = {
	destinationKey?: string;
	fileName?: string;
	format?: string;
	quality?: number;
};

// Convert CSS hex color (#RRGGBB or #RRGGBBAA) to Jimp's 32-bit RGBA integer
function cssColorToInt(color: string): number {
	const hex = color.replace('#', '');
	let r: number, g: number, b: number, a: number;
	if (hex.length === 8) {
		r = parseInt(hex.slice(0, 2), 16);
		g = parseInt(hex.slice(2, 4), 16);
		b = parseInt(hex.slice(4, 6), 16);
		a = parseInt(hex.slice(6, 8), 16);
	} else {
		r = parseInt(hex.slice(0, 2), 16);
		g = parseInt(hex.slice(2, 4), 16);
		b = parseInt(hex.slice(4, 6), 16);
		a = 0xff;
	}
	return rgbaToInt(r, g, b, a);
}

const MIME_MAP: Record<string, string> = {
	bmp: 'image/bmp',
	gif: 'image/gif',
	jpeg: 'image/jpeg',
	png: 'image/png',
	tiff: 'image/tiff',
};

const COMPOSITE_BLEND_MAP: Record<string, string> = {
	Add: BlendMode.ADD,
	Difference: BlendMode.DIFFERENCE,
	Multiply: BlendMode.MULTIPLY,
	Over: BlendMode.SRC_OVER,
	Plus: BlendMode.ADD,
};

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
	//         blur
	// ----------------------------------
	{
		displayName: 'Blur Radius',
		name: 'sigma',
		type: 'number',
		typeOptions: {
			minValue: 1,
			maxValue: 1000,
		},
		default: 2,
		displayOptions: {
			show: {
				operation: ['blur'],
			},
		},
		description: 'The radius of the blur',
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
				name: 'Difference',
				value: 'Difference',
			},
			{
				name: 'Multiply',
				value: 'Multiply',
			},
			{
				name: 'Over',
				value: 'Over',
			},
			{
				name: 'Plus',
				value: 'Plus',
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
		icon: 'fa:image',
		iconColor: 'purple',
		group: ['transform'],
		version: 1,
		description: 'Edits an image like blur, resize or adding border and text',
		defaults: {
			name: 'Edit Image',
			color: '#553399',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [
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
							},
						},
						description: 'Sets the jpeg|png|tiff compression level from 0 to 100 (best)',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const returnData: INodeExecutionData[] = [];
		const length = items.length;
		let item: INodeExecutionData;

		for (let itemIndex = 0; itemIndex < length; itemIndex++) {
			try {
				item = items[itemIndex];

				const operation = this.getNodeParameter('operation', itemIndex);
				const dataPropertyName = this.getNodeParameter('dataPropertyName', itemIndex) as
					| string
					| IBinaryData;

				const options = this.getNodeParameter('options', itemIndex, {}) as EditImageNodeOptions;

				let binaryPropertyName = options.destinationKey;
				if (!binaryPropertyName) {
					binaryPropertyName = typeof dataPropertyName === 'string' ? dataPropertyName : 'data';
				}

				const requiredOperationParameters: {
					[key: string]: string[];
				} = {
					blur: ['sigma'],
					border: ['borderColor', 'borderWidth', 'borderHeight'],
					create: ['backgroundColor', 'height', 'width'],
					crop: ['height', 'positionX', 'positionY', 'width'],
					composite: ['dataPropertyNameComposite', 'operator', 'positionX', 'positionY'],
					information: [],
					resize: ['height', 'resizeOption', 'width'],
					rotate: ['backgroundColor', 'rotate'],
					transparent: ['color'],
				};

				let operations: IDataObject[] = [];
				if (operation === 'multiStep') {
					const operationsData = this.getNodeParameter('operations', itemIndex, {
						operations: [],
					}) as IDataObject;
					operations = operationsData.operations as IDataObject[];
				} else {
					const operationParameters: IDataObject = {};
					requiredOperationParameters[operation].forEach((parameterName) => {
						try {
							operationParameters[parameterName] = this.getNodeParameter(parameterName, itemIndex);
						} catch (error) {}
					});

					operations = [
						{
							operation,
							...operationParameters,
						},
					];
				}

				type JimpImage = Awaited<ReturnType<typeof Jimp.fromBuffer>>;
				let image: JimpImage | undefined;

				if (operations[0].operation !== 'create') {
					this.helpers.assertBinaryData(itemIndex, dataPropertyName);
					const imageBuffer = await this.helpers.getBinaryDataBuffer(itemIndex, dataPropertyName);
					image = await Jimp.fromBuffer(imageBuffer);
				}

				const newItem: INodeExecutionData = {
					json: item.json,
					binary: {},
					pairedItem: {
						item: itemIndex,
					},
				};

				if (operation === 'information') {
					const format = image!.mime?.split('/')[1] || 'unknown';
					newItem.json = {
						width: image!.width,
						height: image!.height,
						format,
					} as unknown as IDataObject;
				}

				for (let i = 0; i < operations.length; i++) {
					const operationData = operations[i];
					if (operationData.operation === 'blur') {
						const radius = Math.round(operationData.sigma as number) || 1;
						image!.blur(radius);
					} else if (operationData.operation === 'border') {
						const bw = operationData.borderWidth as number;
						const bh = operationData.borderHeight as number;
						const bc = cssColorToInt(operationData.borderColor as string);
						const bordered = new Jimp({
							width: image!.width + bw * 2,
							height: image!.height + bh * 2,
							color: bc,
						}) as unknown as JimpImage;
						bordered.composite(image!, bw, bh);
						image = bordered;
					} else if (operationData.operation === 'composite') {
						const compositePropertyName = operationData.dataPropertyNameComposite as string;
						this.helpers.assertBinaryData(itemIndex, compositePropertyName);
						const compositeBuffer = await this.helpers.getBinaryDataBuffer(
							itemIndex,
							compositePropertyName,
						);
						const overlay = await Jimp.fromBuffer(compositeBuffer);

						const blendMode =
							(COMPOSITE_BLEND_MAP[operationData.operator as string] as BlendMode) ||
							BlendMode.SRC_OVER;

						image!.composite(
							overlay,
							operationData.positionX as number,
							operationData.positionY as number,
							{ mode: blendMode },
						);
					} else if (operationData.operation === 'create') {
						const bc = cssColorToInt(operationData.backgroundColor as string);
						image = new Jimp({
							width: operationData.width as number,
							height: operationData.height as number,
							color: bc,
						}) as unknown as JimpImage;
						if (!options.format) {
							options.format = 'png';
						}
					} else if (operationData.operation === 'crop') {
						image!.crop({
							x: operationData.positionX as number,
							y: operationData.positionY as number,
							w: operationData.width as number,
							h: operationData.height as number,
						});
					} else if (operationData.operation === 'resize') {
						const resizeOption = operationData.resizeOption as string;
						const width = operationData.width as number;
						const height = operationData.height as number;

						if (resizeOption === 'percent') {
							const newWidth = Math.round((image!.width * width) / 100);
							const newHeight = Math.round((image!.height * height) / 100);
							image!.resize({ w: newWidth, h: newHeight });
						} else if (resizeOption === 'onlyIfSmaller') {
							if (image!.width < width || image!.height < height) {
								image!.scaleToFit({ w: width, h: height });
							}
						} else if (resizeOption === 'ignoreAspectRatio') {
							image!.resize({ w: width, h: height });
						} else if (resizeOption === 'minimumArea') {
							image!.cover({ w: width, h: height });
						} else if (resizeOption === 'onlyIfLarger') {
							if (image!.width > width || image!.height > height) {
								image!.scaleToFit({ w: width, h: height });
							}
						} else {
							// maximumArea (default)
							image!.scaleToFit({ w: width, h: height });
						}
					} else if (operationData.operation === 'rotate') {
						image!.background = cssColorToInt(operationData.backgroundColor as string);
						image!.rotate(operationData.rotate as number);
					} else if (operationData.operation === 'transparent') {
						const targetColor = operationData.color as string;
						const hex = targetColor.replace('#', '');
						const targetR = parseInt(hex.slice(0, 2), 16);
						const targetG = parseInt(hex.slice(2, 4), 16);
						const targetB = parseInt(hex.slice(4, 6), 16);

						const data = image!.bitmap.data;
						for (let px = 0; px < data.length; px += 4) {
							if (data[px] === targetR && data[px + 1] === targetG && data[px + 2] === targetB) {
								data[px + 3] = 0;
							}
						}
					}
				}

				if (item.binary !== undefined && newItem.binary) {
					Object.assign(newItem.binary, item.binary);
					if (newItem.binary[binaryPropertyName]) {
						newItem.binary[binaryPropertyName] = deepCopy(newItem.binary[binaryPropertyName]);
					}
				}

				if (newItem.binary![binaryPropertyName] === undefined) {
					newItem.binary![binaryPropertyName] = {
						data: '',
						mimeType: '',
					};
				}

				// Determine output MIME type
				let outputMime = image!.mime || 'image/png';
				if (options.format !== undefined) {
					outputMime = MIME_MAP[options.format] || 'image/png';
					newItem.binary![binaryPropertyName].fileExtension = options.format as string;
					newItem.binary![binaryPropertyName].mimeType = outputMime;
					const fileName = newItem.binary![binaryPropertyName].fileName;
					if (fileName?.includes('.')) {
						newItem.binary![binaryPropertyName].fileName =
							fileName.split('.').slice(0, -1).join('.') + '.' + options.format;
					}
				}

				const getBufferOptions: Record<string, unknown> = {};
				if (options.quality !== undefined) {
					getBufferOptions.quality = options.quality;
				}
				const imageBuffer = await image!.getBuffer(outputMime as 'image/png', getBufferOptions);

				if (options.fileName !== undefined) {
					newItem.binary![binaryPropertyName].fileName = options.fileName as string;
				}

				const binaryData = await this.helpers.prepareBinaryData(imageBuffer);
				newItem.binary![binaryPropertyName] = {
					...newItem.binary![binaryPropertyName],
					...binaryData,
				};

				returnData.push(newItem);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error.message,
						},
						pairedItem: {
							item: itemIndex,
						},
					});
					continue;
				}
				throw error;
			}
		}
		return [returnData];
	}
}
