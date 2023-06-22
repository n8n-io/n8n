import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeProperties,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { deepCopy } from 'n8n-workflow';
import gm from 'gm';
import { file } from 'tmp-promise';
import { parse as pathParse } from 'path';
import { writeFile as fsWriteFile } from 'fs';
import { promisify } from 'util';
const fsWriteFileAsync = promisify(fsWriteFile);
import getSystemFonts from 'get-system-fonts';

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
			},
		},
		description: 'The sigma of the blur',
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
		icon: 'fa:image',
		group: ['transform'],
		version: 1,
		description: 'Edits an image like blur, resize or adding border and text',
		defaults: {
			name: 'Edit Image',
			color: '#553399',
		},
		inputs: ['main'],
		outputs: ['main'],
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
								default: 'default',
								description:
									'The font to use. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
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
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					hide: {
						operation: ['information'],
					},
				},
				options: [
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
						default: 'default',
						description:
							'The font to use. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
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
							},
						},
						description: 'Sets the jpeg|png|tiff compression level from 0 to 100 (best)',
					},
				],
			},
		],
	};

	methods = {
		loadOptions: {
			async getFonts(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				// @ts-ignore
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

				returnData.unshift({
					name: 'default',
					value: 'default',
				});

				return returnData;
			},
		},
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
				const dataPropertyName = this.getNodeParameter('dataPropertyName', itemIndex);

				const options = this.getNodeParameter('options', itemIndex, {});

				const cleanupFunctions: Array<() => void> = [];

				let gmInstance: gm.State;

				const requiredOperationParameters: {
					[key: string]: string[];
				} = {
					blur: ['blur', 'sigma'],
					border: ['borderColor', 'borderWidth', 'borderHeight'],
					create: ['backgroundColor', 'height', 'width'],
					crop: ['height', 'positionX', 'positionY', 'width'],
					composite: ['dataPropertyNameComposite', 'operator', 'positionX', 'positionY'],
					draw: [
						'color',
						'cornerRadius',
						'endPositionX',
						'endPositionY',
						'primitive',
						'startPositionX',
						'startPositionY',
					],
					information: [],
					resize: ['height', 'resizeOption', 'width'],
					rotate: ['backgroundColor', 'rotate'],
					shear: ['degreesX', 'degreesY'],
					text: ['font', 'fontColor', 'fontSize', 'lineLength', 'positionX', 'positionY', 'text'],
					transparent: ['color'],
				};

				let operations: IDataObject[] = [];
				if (operation === 'multiStep') {
					// Operation parameters are already in the correct format
					const operationsData = this.getNodeParameter('operations', itemIndex, {
						operations: [],
					}) as IDataObject;
					operations = operationsData.operations as IDataObject[];
				} else {
					// Operation parameters have to first get collected
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

				if (operations[0].operation !== 'create') {
					// "create" generates a new image so does not require any incoming data.
					this.helpers.assertBinaryData(itemIndex, dataPropertyName);
					const binaryDataBuffer = await this.helpers.getBinaryDataBuffer(
						itemIndex,
						dataPropertyName,
					);
					gmInstance = gm(binaryDataBuffer);
					gmInstance = gmInstance.background('transparent');
				}

				const newItem: INodeExecutionData = {
					json: item.json,
					binary: {},
					pairedItem: {
						item: itemIndex,
					},
				};

				if (operation === 'information') {
					// Just return the information
					const imageData = await new Promise<IDataObject>((resolve, reject) => {
						gmInstance = gmInstance.identify((error, data) => {
							if (error) {
								reject(error);
								return;
							}
							resolve(data as unknown as IDataObject);
						});
					});

					newItem.json = imageData;
				}

				for (let i = 0; i < operations.length; i++) {
					const operationData = operations[i];
					if (operationData.operation === 'blur') {
						gmInstance = gmInstance!.blur(
							operationData.blur as number,
							operationData.sigma as number,
						);
					} else if (operationData.operation === 'border') {
						gmInstance = gmInstance!
							.borderColor(operationData.borderColor as string)
							.border(operationData.borderWidth as number, operationData.borderHeight as number);
					} else if (operationData.operation === 'composite') {
						const positionX = operationData.positionX as number;
						const positionY = operationData.positionY as number;
						const operator = operationData.operator as string;

						const geometryString =
							// eslint-disable-next-line @typescript-eslint/restrict-plus-operands
							(positionX >= 0 ? '+' : '') + positionX + (positionY >= 0 ? '+' : '') + positionY;

						const binaryPropertyName = operationData.dataPropertyNameComposite as string;
						this.helpers.assertBinaryData(itemIndex, binaryPropertyName);
						const binaryDataBuffer = await this.helpers.getBinaryDataBuffer(
							itemIndex,
							binaryPropertyName,
						);

						const { fd, path, cleanup } = await file();
						cleanupFunctions.push(cleanup);
						await fsWriteFileAsync(fd, binaryDataBuffer);

						if (operations[0].operation === 'create') {
							// It seems like if the image gets created newly we have to create a new gm instance
							// else it fails for some reason
							gmInstance = gm(gmInstance!.stream('png'))
								.compose(operator)
								.geometry(geometryString)
								.composite(path);
						} else {
							gmInstance = gmInstance!.compose(operator).geometry(geometryString).composite(path);
						}

						if (operations.length !== i + 1) {
							// If there are other operations after the current one create a new gm instance
							// because else things do get messed up
							gmInstance = gm(gmInstance.stream());
						}
					} else if (operationData.operation === 'create') {
						gmInstance = gm(
							operationData.width as number,
							operationData.height as number,
							operationData.backgroundColor as string,
						);
						if (!options.format) {
							options.format = 'png';
						}
					} else if (operationData.operation === 'crop') {
						gmInstance = gmInstance!.crop(
							operationData.width as number,
							operationData.height as number,
							operationData.positionX as number,
							operationData.positionY as number,
						);
					} else if (operationData.operation === 'draw') {
						gmInstance = gmInstance!.fill(operationData.color as string);

						if (operationData.primitive === 'line') {
							gmInstance = gmInstance.drawLine(
								operationData.startPositionX as number,
								operationData.startPositionY as number,
								operationData.endPositionX as number,
								operationData.endPositionY as number,
							);
						} else if (operationData.primitive === 'circle') {
							gmInstance = gmInstance.drawCircle(
								operationData.startPositionX as number,
								operationData.startPositionY as number,
								operationData.endPositionX as number,
								operationData.endPositionY as number,
							);
						} else if (operationData.primitive === 'rectangle') {
							gmInstance = gmInstance.drawRectangle(
								operationData.startPositionX as number,
								operationData.startPositionY as number,
								operationData.endPositionX as number,
								operationData.endPositionY as number,
								(operationData.cornerRadius as number) || undefined,
							);
						}
					} else if (operationData.operation === 'resize') {
						const resizeOption = operationData.resizeOption as string;

						// By default use "maximumArea"
						let option: gm.ResizeOption = '@';
						if (resizeOption === 'ignoreAspectRatio') {
							option = '!';
						} else if (resizeOption === 'minimumArea') {
							option = '^';
						} else if (resizeOption === 'onlyIfSmaller') {
							option = '<';
						} else if (resizeOption === 'onlyIfLarger') {
							option = '>';
						} else if (resizeOption === 'percent') {
							option = '%';
						}

						gmInstance = gmInstance!.resize(
							operationData.width as number,
							operationData.height as number,
							option,
						);
					} else if (operationData.operation === 'rotate') {
						gmInstance = gmInstance!.rotate(
							operationData.backgroundColor as string,
							operationData.rotate as number,
						);
					} else if (operationData.operation === 'shear') {
						gmInstance = gmInstance!.shear(
							operationData.degreesX as number,
							operationData.degreesY as number,
						);
					} else if (operationData.operation === 'text') {
						// Split the text in multiple lines
						const lines: string[] = [];
						let currentLine = '';
						(operationData.text as string).split('\n').forEach((textLine: string) => {
							textLine.split(' ').forEach((textPart: string) => {
								if (
									currentLine.length + textPart.length + 1 >
									(operationData.lineLength as number)
								) {
									lines.push(currentLine.trim());
									currentLine = `${textPart} `;
									return;
								}
								currentLine += `${textPart} `;
							});

							lines.push(currentLine.trim());
							currentLine = '';
						});

						// Combine the lines to a single string
						const renderText = lines.join('\n');

						const font = options.font || operationData.font;

						if (font && font !== 'default') {
							gmInstance = gmInstance!.font(font as string);
						}

						gmInstance = gmInstance!
							.fill(operationData.fontColor as string)
							.fontSize(operationData.fontSize as number)
							.drawText(
								operationData.positionX as number,
								operationData.positionY as number,
								renderText,
							);
					} else if (operationData.operation === 'transparent') {
						gmInstance = gmInstance!.transparent(operationData.color as string);
					}
				}

				if (item.binary !== undefined && newItem.binary) {
					// Create a shallow copy of the binary data so that the old
					// data references which do not get changed still stay behind
					// but the incoming data does not get changed.
					Object.assign(newItem.binary, item.binary);
					// Make a deep copy of the binary data we change
					if (newItem.binary[dataPropertyName]) {
						newItem.binary[dataPropertyName] = deepCopy(newItem.binary[dataPropertyName]);
					}
				}

				if (newItem.binary![dataPropertyName] === undefined) {
					newItem.binary![dataPropertyName] = {
						data: '',
						mimeType: '',
					};
				}

				if (options.quality !== undefined) {
					gmInstance = gmInstance!.quality(options.quality as number);
				}

				if (options.format !== undefined) {
					gmInstance = gmInstance!.setFormat(options.format as string);
					newItem.binary![dataPropertyName].fileExtension = options.format as string;
					newItem.binary![dataPropertyName].mimeType = `image/${options.format}`;
					const fileName = newItem.binary![dataPropertyName].fileName;
					if (fileName?.includes('.')) {
						newItem.binary![dataPropertyName].fileName =
							// eslint-disable-next-line @typescript-eslint/restrict-plus-operands
							fileName.split('.').slice(0, -1).join('.') + '.' + options.format;
					}
				}

				if (options.fileName !== undefined) {
					newItem.binary![dataPropertyName].fileName = options.fileName as string;
				}

				returnData.push(
					await new Promise<INodeExecutionData>((resolve, reject) => {
						gmInstance.toBuffer(async (error: Error | null, buffer: Buffer) => {
							cleanupFunctions.forEach(async (cleanup) => cleanup());

							if (error) {
								return reject(error);
							}

							const binaryData = await this.helpers.prepareBinaryData(Buffer.from(buffer));
							newItem.binary![dataPropertyName] = {
								...newItem.binary![dataPropertyName],
								...binaryData,
							};

							return resolve(newItem);
						});
					}),
				);
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
		return this.prepareOutputData(returnData);
	}
}
