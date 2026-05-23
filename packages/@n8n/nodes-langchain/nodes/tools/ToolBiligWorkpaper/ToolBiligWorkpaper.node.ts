import { DynamicStructuredTool } from '@langchain/core/tools';
import {
	WorkPaper,
	createWorkPaperFromDocument,
	exportWorkPaperDocument,
	isPersistedWorkPaperDocument,
	parseWorkPaperDocument,
	serializeWorkPaperDocument,
} from '@bilig/workpaper';
import { logWrapper, getConnectionHintNoticeField } from '@n8n/ai-utilities';
import {
	type IExecuteFunctions,
	type INode,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	NodeConnectionTypes,
	NodeOperationError,
	type SupplyData,
	nodeNameToToolName,
} from 'n8n-workflow';
import { z } from 'zod';

type RawCellContent = string | number | boolean | null;
type WorkPaperInput = Record<string, RawCellContent[][]>;

const DEFAULT_WORKPAPER_JSON = JSON.stringify(
	{
		sheets: {
			Inputs: [
				['Metric', 'Value'],
				['Qualified opportunities', 20],
				['Win rate', 0.25],
				['Average ARR', 12000],
				['Expansion multiplier', 1.1],
			],
			Summary: [
				['Metric', 'Value'],
				['Expected customers', '=Inputs!B2*Inputs!B3'],
				['Expected ARR', '=B2*Inputs!B4'],
				['Expansion ARR', '=B3*Inputs!B5'],
				['Target gap', '=B4-100000'],
			],
		},
	},
	null,
	2,
);

const toolInputSchema = z.object({
	operation: z
		.enum(['read_range', 'set_cell_and_read', 'validate_formula'])
		.describe('Operation to run against the configured WorkPaper.'),
	range: z
		.string()
		.optional()
		.describe('Range to read after calculation, for example Summary!A1:B5.'),
	sheetName: z
		.string()
		.optional()
		.describe('Sheet name for set_cell_and_read, for example Inputs.'),
	cell: z.string().optional().describe('Cell address for set_cell_and_read, for example B3.'),
	value: z
		.union([z.string(), z.number(), z.boolean(), z.null()])
		.optional()
		.describe('Scalar value to write for set_cell_and_read.'),
	formula: z.string().optional().describe('Formula to validate, for example =SUM(1, 2).'),
});

type ToolInput = z.infer<typeof toolInputSchema>;

function getTool(ctx: ISupplyDataFunctions | IExecuteFunctions, itemIndex: number) {
	const node = ctx.getNode();
	const configuredWorkPaper = ctx.getNodeParameter('workpaperJson', itemIndex) as unknown;

	const tool = new DynamicStructuredTool({
		name: nodeNameToToolName(node),
		description:
			'Use this tool to read Bilig WorkPaper formula outputs, update one input cell, verify recalculated readback, or validate a formula without Excel or browser automation.',
		schema: toolInputSchema,
		func: async (input) => {
			const response = runWorkPaperOperation(configuredWorkPaper, input, node);
			return JSON.stringify(response);
		},
	});

	return tool;
}

function runWorkPaperOperation(rawWorkPaper: unknown, input: ToolInput, node: INode) {
	if (input.operation === 'validate_formula') {
		return validateFormula(input.formula, node);
	}

	const workPaper = loadWorkPaper(rawWorkPaper, node);
	const range = input.range ?? 'Summary!A1:B5';

	if (input.operation === 'read_range') {
		return {
			operation: input.operation,
			range,
			readback: readRange(workPaper, range, node),
		};
	}

	if (!input.sheetName) {
		throw new NodeOperationError(node, 'Sheet Name is required for set_cell_and_read');
	}

	if (!input.cell) {
		throw new NodeOperationError(node, 'Cell is required for set_cell_and_read');
	}

	if (!('value' in input)) {
		throw new NodeOperationError(node, 'Value is required for set_cell_and_read');
	}

	const before = readRange(workPaper, range, node);
	const previousValue = setCell(workPaper, input.sheetName, input.cell, input.value, node);
	const after = readRange(workPaper, range, node);
	const updatedWorkPaper = serializeWorkPaperDocument(
		exportWorkPaperDocument(workPaper, { includeConfig: true }),
	);
	const restored = createWorkPaperFromDocument(parseWorkPaperDocument(updatedWorkPaper));
	const afterRestore = readRange(restored, range, node);

	return {
		operation: input.operation,
		editedCell: `${input.sheetName}!${stripSheetPrefix(input.cell)}`,
		previousValue,
		newValue: input.value,
		range,
		before,
		after,
		afterRestore,
		updatedWorkPaper,
		persistedDocumentBytes: updatedWorkPaper.length,
		restoredMatchesAfter: JSON.stringify(afterRestore) === JSON.stringify(after),
	};
}

function loadWorkPaper(rawWorkPaper: unknown, node: INode): WorkPaper {
	const parsedWorkPaper = parseJsonLike(rawWorkPaper, node);

	if (isPersistedWorkPaperDocument(parsedWorkPaper)) {
		return createWorkPaperFromDocument(parsedWorkPaper);
	}

	const compactSheets =
		isRecord(parsedWorkPaper) && 'sheets' in parsedWorkPaper
			? parsedWorkPaper.sheets
			: parsedWorkPaper;

	return WorkPaper.buildFromSheets(normalizeSheets(compactSheets, node));
}

function parseJsonLike(value: unknown, node: INode): unknown {
	if (typeof value !== 'string') {
		return value;
	}

	try {
		return JSON.parse(value);
	} catch (error) {
		throw new NodeOperationError(node, 'WorkPaper JSON is not valid JSON', {
			description: error instanceof Error ? error.message : undefined,
		});
	}
}

function normalizeSheets(value: unknown, node: INode): WorkPaperInput {
	if (!isRecord(value)) {
		throw new NodeOperationError(
			node,
			'WorkPaper JSON must be a persisted WorkPaper document or a compact sheets object',
		);
	}

	const sheets: WorkPaperInput = {};
	for (const [sheetName, rows] of Object.entries(value)) {
		if (!Array.isArray(rows)) {
			throw new NodeOperationError(node, `Sheet "${sheetName}" must be an array of rows`);
		}

		sheets[sheetName] = rows.map((row, rowIndex) => {
			if (!Array.isArray(row)) {
				throw new NodeOperationError(
					node,
					`Sheet "${sheetName}" row ${rowIndex + 1} must be an array`,
				);
			}

			return row.map((cell) => normalizeCellContent(cell, node));
		});
	}

	return sheets;
}

function normalizeCellContent(value: unknown, node: INode): RawCellContent {
	if (value === null) return null;

	if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
		return value;
	}

	throw new NodeOperationError(
		node,
		'WorkPaper compact sheets only support string, number, boolean, and null cell values',
	);
}

function readRange(workPaper: WorkPaper, rangeRef: string, node: INode) {
	const range = workPaper.simpleCellRangeFromString(rangeRef);
	if (!range) {
		throw new NodeOperationError(node, `Invalid WorkPaper range: ${rangeRef}`);
	}

	const values = workPaper.getRangeValues(range);
	const formulas = workPaper.getRangeSerialized(range);

	return values.map((row, rowIndex) =>
		row.map((cell, columnIndex) => ({
			value: readCellValue(cell),
			formula: formulas[rowIndex]?.[columnIndex] ?? null,
		})),
	);
}

function setCell(
	workPaper: WorkPaper,
	sheetName: string,
	cellRef: string,
	value: RawCellContent | undefined,
	node: INode,
) {
	const sheetId = workPaper.getSheetId(sheetName);
	if (sheetId === undefined) {
		throw new NodeOperationError(node, `WorkPaper sheet not found: ${sheetName}`);
	}

	const cell = workPaper.simpleCellAddressFromString(stripSheetPrefix(cellRef), sheetId);
	if (!cell) {
		throw new NodeOperationError(node, `Invalid WorkPaper cell address: ${cellRef}`);
	}

	const previousValue = workPaper.getCellSerialized(cell);
	workPaper.setCellContents(cell, value ?? null);
	return previousValue;
}

function validateFormula(formula: string | undefined, node: INode) {
	if (!formula) {
		throw new NodeOperationError(node, 'Formula is required for validate_formula');
	}

	const normalizedFormula = formula.trim().startsWith('=') ? formula.trim() : `=${formula.trim()}`;

	try {
		const workPaper = WorkPaper.buildFromSheets({
			FormulaCheck: [['Result'], [normalizedFormula]],
		});
		const range = workPaper.simpleCellRangeFromString('FormulaCheck!A2:A2');
		if (!range) {
			throw new NodeOperationError(node, 'Formula check range is invalid');
		}

		return {
			operation: 'validate_formula',
			formula: normalizedFormula,
			valid: true,
			readback: readRange(workPaper, 'FormulaCheck!A2:A2', node),
		};
	} catch (error) {
		return {
			operation: 'validate_formula',
			formula: normalizedFormula,
			valid: false,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

function readCellValue(cell: unknown) {
	if (isRecord(cell) && 'value' in cell) {
		return cell.value;
	}

	return cell;
}

function stripSheetPrefix(cellRef: string) {
	const separatorIndex = cellRef.lastIndexOf('!');
	return separatorIndex === -1 ? cellRef : cellRef.slice(separatorIndex + 1);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export class ToolBiligWorkpaper implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Bilig WorkPaper',
		name: 'toolBiligWorkpaper',
		icon: 'fa:table',
		iconColor: 'black',
		group: ['transform'],
		version: 1,
		description: 'Let AI agents read and verify spreadsheet-style formulas from a WorkPaper',
		defaults: {
			name: 'Bilig WorkPaper',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Tools'],
				Tools: ['Recommended Tools'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.toolbiligworkpaper/',
					},
				],
			},
		},
		inputs: [],
		outputs: [NodeConnectionTypes.AiTool],
		outputNames: ['Tool'],
		properties: [
			getConnectionHintNoticeField([NodeConnectionTypes.AiAgent]),
			{
				displayName: 'WorkPaper JSON',
				name: 'workpaperJson',
				type: 'json',
				default: DEFAULT_WORKPAPER_JSON,
				description:
					'Bilig WorkPaper document JSON, or a compact object with a sheets property containing two-dimensional sheet arrays',
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions): Promise<SupplyData> {
		return {
			response: logWrapper(getTool(this, 0), this),
		};
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const input = this.getInputData();
		const response: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < input.length; itemIndex++) {
			const inputItem = input[itemIndex];
			if (inputItem === undefined) continue;

			const toolInput = toolInputSchema.parse(inputItem.json);
			const result = await getTool(this, itemIndex).invoke(toolInput);
			response.push({
				json: {
					response: result,
				},
				pairedItem: {
					item: itemIndex,
				},
			});
		}

		return [response];
	}
}
