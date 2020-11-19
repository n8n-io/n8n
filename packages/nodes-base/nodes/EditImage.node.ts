import {
	BINARY_ENCODING,
	IExecuteSingleFunctions,
} from 'n8n-core';
import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import * as gm from 'gm';
import { file } from 'tmp-promise';
import {
	parse as pathParse,
} from 'path';
import {
	writeFile as fsWriteFile,
} from 'fs';
import { promisify } from 'util';
const fsWriteFileAsync = promisify(fsWriteFile);
import * as getSystemFonts from 'get-system-fonts';


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
				options: [
					{
						name: 'Blur',
						value: 'blur',
						description: 'Adds a blur to the image and so makes it less sharp',
					},
					{
						name: 'Border',
						value: 'border',
						description: 'Adds a border to the image',
					},
					{
						name: 'Crop',
						value: 'crop',
						description: 'Crops the image',
					},
					{
						name: 'Composite',
						value: 'composite',
						description: 'Composite image on top of another one',
					},
					{
						name: 'Draw',
						value: 'draw',
						description: 'Draw on image',
					},
					{
						name: 'Get Information',
						value: 'information',
						description: 'Returns image information like resolution',
					},
					{
						name: 'Rotate',
						value: 'rotate',
						description: 'Rotate image',
					},
					{
						name: 'Resize',
						value: 'resize',
						description: 'Change the size of image',
					},
					{
						name: 'Shear',
						value: 'shear',
						description: 'Shear image along the X or Y axis',
					},
					{
						name: 'Text',
						value: 'text',
						description: 'Adds text to image',
					},
				],
				default: 'border',
				description: 'The operation to perform.',
			},

			{
				displayName: 'Property Name',
				name: 'dataPropertyName',
				type: 'string',
				default: 'data',
				description: 'Name of the binary property in which the image data can be found.',
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
						operation: [
							'draw',
						],
					},
				},
				options: [
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
				description: 'The primitive to draw.',
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
						operation: [
							'draw',
						],
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
						operation: [
							'draw',
						],
						primitive: [
							'line',
							'rectangle',
						],
					},
				},
				description: 'X (horizontal) start position of the primitive.',
			},
			{
				displayName: 'Start Position Y',
				name: 'startPositionY',
				type: 'number',
				default: 50,
				displayOptions: {
					show: {
						operation: [
							'draw',
						],
						primitive: [
							'line',
							'rectangle',
						],
					},
				},
				description: 'Y (horizontal) start position of the primitive.',
			},
			{
				displayName: 'End Position X',
				name: 'endPositionX',
				type: 'number',
				default: 250,
				displayOptions: {
					show: {
						operation: [
							'draw',
						],
						primitive: [
							'line',
							'rectangle',
						],
					},
				},
				description: 'X (horizontal) end position of the primitive.',
			},
			{
				displayName: 'End Position Y',
				name: 'endPositionY',
				type: 'number',
				default: 250,
				displayOptions: {
					show: {
						operation: [
							'draw',
						],
						primitive: [
							'line',
							'rectangle',
						],
					},
				},
				description: 'Y (horizontal) end position of the primitive.',
			},
			{
				displayName: 'Corner Radius',
				name: 'cornerRadius',
				type: 'number',
				default: 0,
				displayOptions: {
					show: {
						operation: [
							'draw',
						],
						primitive: [
							'rectangle',
						],
					},
				},
				description: 'The radius of the corner to create round corners.',
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
						operation: [
							'text',
						],
					},
				},
				description: 'Text to write on the image.',
			},
			{
				displayName: 'Font Size',
				name: 'fontSize',
				type: 'number',
				default: 18,
				displayOptions: {
					show: {
						operation: [
							'text',
						],
					},
				},
				description: 'Size of the text.',
			},
			{
				displayName: 'Font Color',
				name: 'fontColor',
				type: 'color',
				default: '#000000',
				displayOptions: {
					show: {
						operation: [
							'text',
						],
					},
				},
				description: 'Color of the text.',
			},
			{
				displayName: 'Position X',
				name: 'positionX',
				type: 'number',
				default: 50,
				displayOptions: {
					show: {
						operation: [
							'text',
						],
					},
				},
				description: 'X (horizontal) position of the text.',
			},
			{
				displayName: 'Position Y',
				name: 'positionY',
				type: 'number',
				default: 50,
				displayOptions: {
					show: {
						operation: [
							'text',
						],
					},
				},
				description: 'Y (vertical) position of the text.',
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
						operation: [
							'text',
						],
					},
				},
				description: 'Max amount of characters in a line before a<br />line-break should get added.',
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
						operation: [
							'blur',
						],
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
						operation: [
							'blur',
						],
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
						operation: [
							'border',
						],
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
						operation: [
							'border',
						],
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
						operation: [
							'border',
						],
					},
				},
				description: 'Color of the border.',
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
						operation: [
							'composite',
						],
					},
				},
				description: 'The name of the binary property which contains the data of the image to<br />composite on top of image which is found in Property Name.',
			},
			{
				displayName: 'Position X',
				name: 'positionX',
				type: 'number',
				default: 0,
				displayOptions: {
					show: {
						operation: [
							'composite',
						],
					},
				},
				description: 'X (horizontal) position of composite image.',
			},
			{
				displayName: 'Position Y',
				name: 'positionY',
				type: 'number',
				default: 0,
				displayOptions: {
					show: {
						operation: [
							'composite',
						],
					},
				},
				description: 'Y (vertical) position of composite image.',
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
						operation: [
							'crop',
						],
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
						operation: [
							'crop',
						],
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
						operation: [
							'crop',
						],
					},
				},
				description: 'X (horizontal) position to crop from.',
			},
			{
				displayName: 'Position Y',
				name: 'positionY',
				type: 'number',
				default: 0,
				displayOptions: {
					show: {
						operation: [
							'crop',
						],
					},
				},
				description: 'Y (vertical) position to crop from.',
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
						operation: [
							'resize',
						],
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
						operation: [
							'resize',
						],
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
						name: 'Maximum area',
						value: 'maximumArea',
						description: 'Specified values are maximum area',
					},
					{
						name: 'Minimum Area',
						value: 'minimumArea',
						description: 'Specified values are minimum area',
					},
					{
						name: 'Only if larger',
						value: 'onlyIfLarger',
						description: 'Resize only if image is larger than width or height',
					},
					{
						name: 'Only if smaller',
						value: 'onlyIfSmaller',
						description: 'Resize only if image is smaller than width or height',
					},
					{
						name: 'Percent',
						value: 'percent',
						description: 'Width and height are specified in percents.',
					},
				],
				default: 'maximumArea',
				displayOptions: {
					show: {
						operation: [
							'resize',
						],
					},
				},
				description: 'How to resize the image.',
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
						operation: [
							'rotate',
						],
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
						operation: [
							'rotate',
						],
					},
				},
				description: 'The color to use for the background when image gets rotated by anything which is not a multiple of 90.',
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
						operation: [
							'shear',
						],
					},
				},
				description: 'X (horizontal) shear degrees.',
			},
			{
				displayName: 'Degrees Y',
				name: 'degreesY',
				type: 'number',
				default: 0,
				displayOptions: {
					show: {
						operation: [
							'shear',
						],
					},
				},
				description: 'Y (vertical) shear degrees.',
			},

			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					hide: {
						operation: [
							'information',
						],
					},
				},
				options: [
					{
						displayName: 'File Name',
						name: 'fileName',
						type: 'string',
						default: '',
						description: 'File name to set in binary data.',
					},
					{
						displayName: 'Font',
						name: 'font',
						type: 'options',
						displayOptions: {
							show: {
								'/operation': [
									'text',
								],
							},
						},
						typeOptions: {
							loadOptionsMethod: 'getFonts',
						},
						default: 'default',
						description: 'The font to use.',
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
						description: 'Set the output image format.',
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
								format: [
									'jpeg',
									'png',
									'tiff',
								],
							},
						},
						description: 'Sets the jpeg|png|tiff compression level from 0 to 100 (best).',
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

				files.forEach((file: string) => {
					const pathParts = pathParse(file);
					if (!pathParts.ext) {
						return;
					}

					returnData.push({
						name: pathParts.name,
						value: file,
					});
				});

				returnData.sort((a, b) => {
					if (a.name < b.name) { return -1; }
					if (a.name > b.name) { return 1; }
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


	async executeSingle(this: IExecuteSingleFunctions): Promise<INodeExecutionData> {
		const item = this.getInputData();

		const operation = this.getNodeParameter('operation', 0) as string;
		const dataPropertyName = this.getNodeParameter('dataPropertyName') as string;

		const options = this.getNodeParameter('options', {}) as IDataObject;

		// TODO: Later should make so that it sends directly a valid buffer and the buffer.from stuff is not needed anymore
		if (item.binary === undefined) {
			return item;
		}

		if (item.binary[dataPropertyName as string] === undefined) {
			return item;
		}

		let gmInstance = gm(Buffer.from(item.binary![dataPropertyName as string].data, BINARY_ENCODING));

		gmInstance = gmInstance.background('transparent');

		const cleanupFunctions: Array<() => void> = [];

		if (operation === 'blur') {
			const blur = this.getNodeParameter('blur') as number;
			const sigma = this.getNodeParameter('sigma') as number;
			gmInstance = gmInstance.blur(blur, sigma);
		} else if (operation === 'border') {
			const borderWidth = this.getNodeParameter('borderWidth') as number;
			const borderHeight = this.getNodeParameter('borderHeight') as number;
			const borderColor = this.getNodeParameter('borderColor') as string;

			gmInstance = gmInstance.borderColor(borderColor).border(borderWidth, borderHeight);
		} else if (operation === 'composite') {
			const dataPropertyNameComposite = this.getNodeParameter('dataPropertyNameComposite') as string;
			const positionX = this.getNodeParameter('positionX') as number;
			const positionY = this.getNodeParameter('positionY') as number;

			const geometryString = (positionX >= 0 ? '+' : '') + positionX + (positionY >= 0 ? '+' : '') + positionY;

			if (item.binary[dataPropertyNameComposite as string] === undefined) {
				throw new Error('');
			}

			const { fd, path, cleanup } = await file();
			cleanupFunctions.push(cleanup);
			fsWriteFileAsync(fd, Buffer.from(item.binary![dataPropertyNameComposite as string].data, BINARY_ENCODING));

			gmInstance = gmInstance.composite(path).geometry(geometryString);
		} else if (operation === 'crop') {
			const width = this.getNodeParameter('width') as number;
			const height = this.getNodeParameter('height') as number;

			const positionX = this.getNodeParameter('positionX') as number;
			const positionY = this.getNodeParameter('positionY') as number;

			gmInstance = gmInstance.crop(width, height, positionX, positionY);
		} else if (operation === 'draw') {
			const startPositionX = this.getNodeParameter('startPositionX') as number;
			const startPositionY = this.getNodeParameter('startPositionY') as number;
			const endPositionX = this.getNodeParameter('endPositionX') as number;
			const endPositionY = this.getNodeParameter('endPositionY') as number;
			const primitive = this.getNodeParameter('primitive') as string;
			const color = this.getNodeParameter('color') as string;

			gmInstance = gmInstance.fill(color);

			if (primitive === 'line') {
				gmInstance = gmInstance.drawLine(startPositionX, startPositionY, endPositionX, endPositionY);
			} else if (primitive === 'rectangle') {
				const cornerRadius = this.getNodeParameter('cornerRadius') as number;
				gmInstance = gmInstance.drawRectangle(startPositionX, startPositionY, endPositionX, endPositionY, cornerRadius || undefined);
			}

		} else if (operation === 'information') {
			const imageData = await new Promise<IDataObject>((resolve, reject) => {
				gmInstance = gmInstance.identify((error, imageData) => {
					if (error) {
						reject(error);
						return;
					}
					resolve(imageData as unknown as IDataObject);
				});
			});

			item.json = imageData;
		} else if (operation === 'resize')  {
			const width = this.getNodeParameter('width') as number;
			const height = this.getNodeParameter('height') as number;
			const resizeOption = this.getNodeParameter('resizeOption') as string;

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

			gmInstance = gmInstance.resize(width, height, option);
		} else if (operation === 'rotate')  {
			const rotate = this.getNodeParameter('rotate') as number;
			const backgroundColor = this.getNodeParameter('backgroundColor') as string;
			gmInstance = gmInstance.rotate(backgroundColor, rotate);
		} else if (operation === 'shear') {
			const xDegrees = this.getNodeParameter('degreesX') as number;
			const yDegress = this.getNodeParameter('degreesY') as number;
			gmInstance = gmInstance.shear(xDegrees, yDegress);
		} else if (operation === 'text') {
			const fontColor = this.getNodeParameter('fontColor') as string;
			const fontSize = this.getNodeParameter('fontSize') as number;
			const lineLength = this.getNodeParameter('lineLength') as number;
			const positionX = this.getNodeParameter('positionX') as number;
			const positionY = this.getNodeParameter('positionY') as number;
			const text = this.getNodeParameter('text') as string || '';

			// Split the text in multiple lines
			const lines: string[] = [];
			let currentLine = '';
			(text as string).split('\n').forEach((textLine: string) => {
				textLine.split(' ').forEach((textPart: string) => {
					if ((currentLine.length + textPart.length + 1) > lineLength) {
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

			if (options.font && options.font !== 'default') {
				gmInstance = gmInstance.font(options.font as string);
			}

			gmInstance = gmInstance
				.fill(fontColor)
				.fontSize(fontSize)
				.drawText(positionX, positionY, renderText);
		} else {
			throw new Error(`The operation "${operation}" is not supported!`);
		}

		const newItem: INodeExecutionData = {
			json: item.json,
			binary: {},
		};

		if (item.binary !== undefined) {
			// Create a shallow copy of the binary data so that the old
			// data references which do not get changed still stay behind
			// but the incoming data does not get changed.
			Object.assign(newItem.binary, item.binary);
			// Make a deep copy of the binary data we change
			newItem.binary![dataPropertyName as string] = JSON.parse(JSON.stringify(newItem.binary![dataPropertyName as string]));
		}

		if (options.quality !== undefined) {
			gmInstance = gmInstance.quality(options.quality as number);
		}

		if (options.format !== undefined) {
			gmInstance = gmInstance.setFormat(options.format as string);
			newItem.binary![dataPropertyName as string].fileExtension = options.format as string;
			newItem.binary![dataPropertyName as string].mimeType = `image/${options.format}`;
			const fileName = newItem.binary![dataPropertyName as string].fileName;
			if (fileName && fileName.includes('.')) {
				newItem.binary![dataPropertyName as string].fileName = fileName.split('.').slice(0, -1).join('.') + '.' + options.format;
			}
		}

		if (options.fileName !== undefined) {
			newItem.binary![dataPropertyName as string].fileName = options.fileName as string;
		}

		return new Promise<INodeExecutionData>((resolve, reject) => {
			gmInstance
				.toBuffer((error: Error | null, buffer: Buffer) => {
					cleanupFunctions.forEach(async cleanup => await cleanup());

					if (error) {
						return reject(error);
					}

					newItem.binary![dataPropertyName as string].data = buffer.toString(BINARY_ENCODING);

					return resolve(newItem);
				});
		});
	}
}
