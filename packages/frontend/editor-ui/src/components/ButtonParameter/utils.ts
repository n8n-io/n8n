import type { Schema } from '@/Interface';
import { ApplicationError, type INodeExecutionData } from 'n8n-workflow';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useNDVStore } from '@/stores/ndv.store';
import { useDataSchema } from '@/composables/useDataSchema';
import { executionDataToJson } from '@/utils/nodeTypesUtils';
import { generateCodeForPrompt } from '@/api/ai';
import { useRootStore } from '@n8n/stores/useRootStore';
import { type AskAiRequest } from '@/features/assistant/assistant.types';
import { useSettingsStore } from '@/stores/settings.store';
import { format } from 'prettier';
import jsParser from 'prettier/plugins/babel';
import * as estree from 'prettier/plugins/estree';

export type TextareaRowData = {
	rows: string[];
	linesToRowsMap: number[][];
};

export function getParentNodes() {
	const activeNode = useNDVStore().activeNode;
	const { workflowObject, getNodeByName } = useWorkflowsStore();

	if (!activeNode || !workflowObject) return [];

	return workflowObject
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
				schema: getSchemaForExecutionData(executionDataToJson(inputData), false),
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

//------ Reduce payload ------

const estimateNumberOfTokens = (item: unknown, averageTokenLength: number): number => {
	if (typeof item === 'object') {
		return Math.ceil(JSON.stringify(item).length / averageTokenLength);
	}

	return 0;
};

const calculateRemainingTokens = (error: Error) => {
	// Expected message format:
	//'This model's maximum context length is 8192 tokens. However, your messages resulted in 10514 tokens.'
	const tokens = error.message.match(/\d+/g);

	if (!tokens || tokens.length < 2) throw error;

	const maxTokens = parseInt(tokens[0], 10);
	const currentTokens = parseInt(tokens[1], 10);

	return currentTokens - maxTokens;
};

const trimParentNodesSchema = (
	payload: AskAiRequest.RequestPayload,
	remainingTokensToReduce: number,
	averageTokenLength: number,
) => {
	//check if parent nodes schema takes more tokens than available
	let parentNodesTokenCount = estimateNumberOfTokens(payload.context.schema, averageTokenLength);

	if (remainingTokensToReduce > parentNodesTokenCount) {
		remainingTokensToReduce -= parentNodesTokenCount;
		payload.context.schema = [];
	}

	//remove parent nodes not referenced in the prompt
	if (payload.context.schema.length) {
		const nodes = [...payload.context.schema];

		for (let nodeIndex = 0; nodeIndex < nodes.length; nodeIndex++) {
			if (payload.question.includes(nodes[nodeIndex].nodeName)) continue;

			const nodeTokens = estimateNumberOfTokens(nodes[nodeIndex], averageTokenLength);
			remainingTokensToReduce -= nodeTokens;
			parentNodesTokenCount -= nodeTokens;
			payload.context.schema.splice(nodeIndex, 1);

			if (remainingTokensToReduce <= 0) break;
		}
	}

	return [remainingTokensToReduce, parentNodesTokenCount];
};

const trimInputSchemaProperties = (
	payload: AskAiRequest.RequestPayload,
	remainingTokensToReduce: number,
	averageTokenLength: number,
	parentNodesTokenCount: number,
) => {
	if (remainingTokensToReduce <= 0) return remainingTokensToReduce;

	//remove properties not referenced in the prompt from the input schema
	if (Array.isArray(payload.context.inputSchema.schema.value)) {
		const props = [...payload.context.inputSchema.schema.value];

		for (let index = 0; index < props.length; index++) {
			const key = props[index].key;

			if (key && payload.question.includes(key)) continue;

			const propTokens = estimateNumberOfTokens(props[index], averageTokenLength);
			remainingTokensToReduce -= propTokens;
			payload.context.inputSchema.schema.value.splice(index, 1);

			if (remainingTokensToReduce <= 0) break;
		}
	}

	//if tokensToReduce is still remaining, remove all parent nodes
	if (remainingTokensToReduce > 0) {
		payload.context.schema = [];
		remainingTokensToReduce -= parentNodesTokenCount;
	}

	return remainingTokensToReduce;
};

/**
 * Attempts to reduce the size of the payload to fit within token limits or throws an error if unsuccessful,
 * payload would be modified in place
 *
 * @param {AskAiRequest.RequestPayload} payload - The request payload to be trimmed,
 * 'schema' and 'inputSchema.schema' will be modified.
 * @param {Error} error - The error to throw if the token reduction fails.
 * @param {number} [averageTokenLength=4] - The average token length used for estimation.
 * @throws {Error} - Throws the provided error if the payload cannot be reduced sufficiently.
 */
export function reducePayloadSizeOrThrow(
	payload: AskAiRequest.RequestPayload,
	error: Error,
	averageTokenLength = 4,
) {
	let remainingTokensToReduce = calculateRemainingTokens(error);

	const [remaining, parentNodesTokenCount] = trimParentNodesSchema(
		payload,
		remainingTokensToReduce,
		averageTokenLength,
	);

	remainingTokensToReduce = remaining;

	remainingTokensToReduce = trimInputSchemaProperties(
		payload,
		remainingTokensToReduce,
		averageTokenLength,
		parentNodesTokenCount,
	);

	if (remainingTokensToReduce > 0) throw error;
}

export async function generateCodeForAiTransform(prompt: string, path: string, retries = 1) {
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

		let code = '';

		while (retries > 0) {
			try {
				const { code: generatedCode } = await generateCodeForPrompt(restApiContext, payload);
				code = generatedCode;
				break;
			} catch (e) {
				if (typeof e.message === 'string' && e.message.includes('maximum context length')) {
					reducePayloadSizeOrThrow(payload, e);
					continue;
				}

				retries--;
				if (!retries) throw e;
			}
		}

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
