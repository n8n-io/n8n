import type { Schema } from '@/Interface';
import { ApplicationError, type INodeExecutionData } from 'n8n-workflow';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useNDVStore } from '@/stores/ndv.store';
import { useDataSchema } from '@/composables/useDataSchema';
import { executionDataToJson } from '@/utils/nodeTypesUtils';
import { generateCodeForPrompt } from '../../api/ai';
import { useRootStore } from '../../stores/root.store';
import { type AskAiRequest } from '../../types/assistant.types';
import { useSettingsStore } from '../../stores/settings.store';
import { format } from 'prettier';
import jsParser from 'prettier/plugins/babel';
import * as estree from 'prettier/plugins/estree';

export type TextareaRowData = {
	rows: string[];
	linesToRowsMap: number[][];
};

export function getParentNodes() {
	const activeNode = useNDVStore().activeNode;
	const { getCurrentWorkflow, getNodeByName } = useWorkflowsStore();
	const workflow = getCurrentWorkflow();

	if (!activeNode || !workflow) return [];

	return workflow
		.getParentNodesByDepth(activeNode?.name)
		.filter(({ name }, i, nodes) => {
			return name !== activeNode.name && nodes.findIndex((node) => node.name === name) === i;
		})
		.map((n) => getNodeByName(n.name))
		.filter((n) => n !== null);
}

export function getSchemas() {
	const parentNodes = getParentNodes();
	const parentNodesNames = parentNodes.map((node) => node?.name);
	const { getSchemaForExecutionData, getInputDataWithPinned } = useDataSchema();
	const parentNodesSchemas: Array<{ nodeName: string; schema: Schema }> = parentNodes
		.map((node) => {
			const inputData: INodeExecutionData[] = getInputDataWithPinned(node);

			return {
				nodeName: node?.name || '',
				schema: getSchemaForExecutionData(executionDataToJson(inputData), true),
			};
		})
		.filter((node) => node.schema?.value.length > 0);

	const inputSchema = parentNodesSchemas.shift();

	return {
		parentNodesNames,
		inputSchema,
		parentNodesSchemas,
	};
}

export async function generateCodeForAiTransform(prompt: string, path: string) {
	const schemas = getSchemas();

	const payload: AskAiRequest.RequestPayload = {
		question: prompt,
		context: {
			schema: schemas.parentNodesSchemas,
			inputSchema: schemas.inputSchema!,
			ndvPushRef: useNDVStore().pushRef,
			pushRef: useRootStore().pushRef,
		},
		forNode: 'transform',
	};

	let value;
	if (useSettingsStore().isAskAiEnabled) {
		const { restApiContext } = useRootStore();
		const { code } = await generateCodeForPrompt(restApiContext, payload);
		value = code;
	} else {
		throw new ApplicationError('AI code generation is not enabled');
	}

	if (value === undefined) return;

	const formattedCode = await format(String(value), {
		parser: 'babel',
		plugins: [jsParser, estree],
	});

	const updateInformation = {
		name: path,
		value: formattedCode,
	};

	return updateInformation;
}

//------ drag and drop ------

function splitText(textarea: HTMLTextAreaElement, textareaRowsData: TextareaRowData | null) {
	if (textareaRowsData) return textareaRowsData;
	const rows: string[] = [];
	const linesToRowsMap: number[][] = [];
	const style = window.getComputedStyle(textarea);

	const padding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
	const border = parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth);
	const textareaWidth = textarea.clientWidth - padding - border;

	const context = createTextContext(style);

	const lines = textarea.value.split('\n');

	lines.forEach((_) => {
		linesToRowsMap.push([]);
	});
	lines.forEach((line, index) => {
		if (line === '') {
			rows.push(line);
			linesToRowsMap[index].push(rows.length - 1);
			return;
		}
		let currentLine = '';
		const words = line.split(/(\s+)/);

		words.forEach((word) => {
			const testLine = currentLine + word;
			const testWidth = context.measureText(testLine).width;

			if (testWidth <= textareaWidth) {
				currentLine = testLine;
			} else {
				rows.push(currentLine.trimEnd());
				linesToRowsMap[index].push(rows.length - 1);
				currentLine = word;
			}
		});

		if (currentLine) {
			rows.push(currentLine.trimEnd());
			linesToRowsMap[index].push(rows.length - 1);
		}
	});

	return { rows, linesToRowsMap };
}

function createTextContext(style: CSSStyleDeclaration): CanvasRenderingContext2D {
	const canvas = document.createElement('canvas');
	const context = canvas.getContext('2d')!;
	context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
	return context;
}

const getRowIndex = (textareaY: number, lineHeight: string) => {
	const rowHeight = parseInt(lineHeight, 10);
	const snapPosition = textareaY - rowHeight / 2 - 1;
	return Math.floor(snapPosition / rowHeight);
};

const getColumnIndex = (rowText: string, textareaX: number, font: string) => {
	const span = document.createElement('span');
	span.style.font = font;
	span.style.visibility = 'hidden';
	span.style.position = 'absolute';
	span.style.whiteSpace = 'pre';
	document.body.appendChild(span);

	let left = 0;
	let right = rowText.length;
	let col = 0;

	while (left <= right) {
		const mid = Math.floor((left + right) / 2);
		span.textContent = rowText.substring(0, mid);
		const width = span.getBoundingClientRect().width;

		if (width <= textareaX) {
			col = mid;
			left = mid + 1;
		} else {
			right = mid - 1;
		}
	}

	document.body.removeChild(span);

	return rowText.length === col ? col : col - 1;
};

export function getUpdatedTextareaValue(
	event: MouseEvent,
	textareaRowsData: TextareaRowData | null,
	value: string,
) {
	const textarea = event.target as HTMLTextAreaElement;
	const rect = textarea.getBoundingClientRect();
	const textareaX = event.clientX - rect.left;
	const textareaY = event.clientY - rect.top;
	const { lineHeight, font } = window.getComputedStyle(textarea);

	const rowIndex = getRowIndex(textareaY, lineHeight);

	const rowsData = splitText(textarea, textareaRowsData);

	let newText = value;

	if (rowsData.rows[rowIndex] === undefined) {
		newText = `${textarea.value} ${value}`;
	}
	const { rows, linesToRowsMap } = rowsData;
	const rowText = rows[rowIndex];

	if (rowText === '') {
		rows[rowIndex] = value;
	} else {
		const col = getColumnIndex(rowText, textareaX, font);
		rows[rowIndex] = [rows[rowIndex].slice(0, col).trim(), value, rows[rowIndex].slice(col).trim()]
			.join(' ')
			.trim();
	}

	newText = linesToRowsMap
		.map((lineMap) => {
			return lineMap.map((index) => rows[index]).join(' ');
		})
		.join('\n');

	return newText;
}

export function getTextareaCursorPosition(
	textarea: HTMLTextAreaElement,
	textareaRowsData: TextareaRowData | null,
	clientX: number,
	clientY: number,
) {
	const rect = textarea.getBoundingClientRect();
	const textareaX = clientX - rect.left;
	const textareaY = clientY - rect.top;
	const { lineHeight, font } = window.getComputedStyle(textarea);

	const rowIndex = getRowIndex(textareaY, lineHeight);
	const { rows } = splitText(textarea, textareaRowsData);

	if (rowIndex < 0 || rowIndex >= rows.length) {
		return textarea.value.length;
	}

	const rowText = rows[rowIndex];

	const col = getColumnIndex(rowText, textareaX, font);

	const position = rows.slice(0, rowIndex).reduce((acc, curr) => acc + curr.length + 1, 0) + col;

	return position;
}
