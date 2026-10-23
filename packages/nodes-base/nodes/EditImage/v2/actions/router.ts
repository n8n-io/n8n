import type { Canvas } from '@napi-rs/canvas';
import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { deepCopy, NodeOperationError, setSafeObjectProperty } from 'n8n-workflow';

import * as blur from './blur.operation';
import * as border from './border.operation';
import * as composite from './composite.operation';
import * as create from './create.operation';
import * as crop from './crop.operation';
import * as draw from './draw.operation';
import * as information from './information.operation';
import { isEditImageOperation } from './node.type';
import * as resize from './resize.operation';
import * as rotate from './rotate.operation';
import * as shear from './shear.operation';
import * as text from './text.operation';
import * as transparent from './transparent.operation';
import {
	assertSafeOutputPropertyName,
	collectOperations,
	detectImageFormat,
	encodeCanvas,
	type EditImageNodeOptions,
	getDataPropertyName,
	getMimeType,
	getOutputPropertyName,
	getString,
	loadCanvas,
	type OperationData,
	parseOptions,
	replaceFileExtension,
	toCanvasMatteColor,
} from '../helpers';

async function applyOperation(
	executeFunctions: IExecuteFunctions,
	itemIndex: number,
	canvas: Canvas,
	operation: OperationData,
	options: EditImageNodeOptions,
): Promise<Canvas> {
	const operationName = operation.operation;
	if (typeof operationName !== 'string' || !isEditImageOperation(operationName)) return canvas;

	switch (operationName) {
		case 'blur':
			return await blur.execute(canvas, operation);
		case 'border':
			return await border.execute(canvas, operation);
		case 'composite':
			return await composite.execute(executeFunctions, itemIndex, canvas, operation);
		case 'create':
			return await create.execute(operation);
		case 'crop':
			return await crop.execute(canvas, operation);
		case 'draw':
			return draw.execute(canvas, operation);
		case 'resize':
			return await resize.execute(canvas, operation);
		case 'rotate':
			return await rotate.execute(canvas, operation);
		case 'shear':
			return await shear.execute(canvas, operation);
		case 'text':
			return await text.execute(canvas, operation, options);
		case 'transparent':
			return await transparent.execute(canvas, operation);
		default:
			return canvas;
	}
}

export async function router(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];

	for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
		try {
			const item = items[itemIndex];
			const node = this.getNode();
			const operationValue = this.getNodeParameter('operation', itemIndex);
			if (typeof operationValue !== 'string') {
				throw new NodeOperationError(node, 'Operation must be a string');
			}
			const dataPropertyName = getDataPropertyName(
				this.getNodeParameter('dataPropertyName', itemIndex),
				node,
			);
			const options = parseOptions(this.getNodeParameter('options', itemIndex, {}), node);
			const operations = collectOperations(this, operationValue, itemIndex, node);
			if (operations.length === 0) {
				throw new NodeOperationError(node, 'Add at least one image operation');
			}

			let inputBuffer: Buffer | undefined;
			let canvas: Canvas;
			let jpegBackground: string | undefined;
			if (operations[0].operation === 'create') {
				const backgroundColor = getString(operations[0], 'backgroundColor');
				canvas = await create.execute(operations[0]);
				jpegBackground = toCanvasMatteColor(backgroundColor);
			} else {
				this.helpers.assertBinaryData(itemIndex, dataPropertyName);
				inputBuffer = await this.helpers.getBinaryDataBuffer(itemIndex, dataPropertyName);
				canvas = await loadCanvas(inputBuffer);
			}

			const newItem: INodeExecutionData = {
				json: item.json,
				binary: item.binary ? deepCopy(item.binary) : {},
				pairedItem: { item: itemIndex },
			};

			if (operationValue === 'information' && inputBuffer) {
				newItem.json = await information.execute(inputBuffer, canvas);
			}

			for (let operationIndex = 0; operationIndex < operations.length; operationIndex++) {
				const currentOperation = operations[operationIndex];
				if (
					currentOperation.operation === 'information' ||
					(operationIndex === 0 && currentOperation.operation === 'create')
				) {
					continue;
				}
				canvas = await applyOperation(this, itemIndex, canvas, currentOperation, options);
				if (currentOperation.operation === 'create' || currentOperation.operation === 'rotate') {
					jpegBackground = toCanvasMatteColor(getString(currentOperation, 'backgroundColor'));
				}
			}

			const format =
				options.format ?? (inputBuffer ? detectImageFormat(inputBuffer) : undefined) ?? 'png';
			const outputBuffer = await encodeCanvas(canvas, format, options.quality, jpegBackground);
			const binaryPropertyName = getOutputPropertyName(options, dataPropertyName);
			assertSafeOutputPropertyName(binaryPropertyName, node);
			const existingBinaryData = newItem.binary?.[binaryPropertyName];
			const preparedBinaryData = await this.helpers.prepareBinaryData(outputBuffer);
			const fileName =
				options.fileName || replaceFileExtension(existingBinaryData?.fileName, format);

			if (!newItem.binary) newItem.binary = {};
			setSafeObjectProperty(newItem.binary, binaryPropertyName, {
				...existingBinaryData,
				...preparedBinaryData,
				fileExtension: format,
				mimeType: getMimeType(format),
				...(fileName ? { fileName } : {}),
			});
			returnData.push(newItem);
		} catch (error) {
			if (this.continueOnFail()) {
				returnData.push({
					json: { error: error instanceof Error ? error.message : String(error) },
					pairedItem: { item: itemIndex },
				});
				continue;
			}
			throw error;
		}
	}

	return [returnData];
}
