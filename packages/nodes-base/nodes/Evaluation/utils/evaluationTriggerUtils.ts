import type { IExecuteFunctions, INodeExecutionData, IDataObject } from 'n8n-workflow';

import { readSheet } from '../../Google/Sheet/v2/actions/utils/readOperation';
import { GoogleSheet } from '../../Google/Sheet/v2/helpers/GoogleSheet';
import type { ResourceLocator } from '../../Google/Sheet/v2/helpers/GoogleSheets.types';
import { getSpreadsheetId } from '../../Google/Sheet/v2/helpers/GoogleSheets.utils';

export async function getSheet(
	this: IExecuteFunctions,
	googleSheet: GoogleSheet,
): Promise<{
	title: string;
	sheetId: number;
}> {
	const sheetWithinDocument = this.getNodeParameter('sheetName', 0, undefined, {
		extractValue: true,
	}) as string;
	const { mode: sheetMode } = this.getNodeParameter('sheetName', 0) as {
		mode: ResourceLocator;
	};

	return await googleSheet.spreadsheetGetSheet(this.getNode(), sheetMode, sheetWithinDocument);
}

export function getGoogleSheet(this: IExecuteFunctions) {
	const { mode, value } = this.getNodeParameter('documentId', 0) as IDataObject;
	const spreadsheetId = getSpreadsheetId(this.getNode(), mode as ResourceLocator, value as string);

	const googleSheet = new GoogleSheet(spreadsheetId, this);

	return googleSheet;
}

export async function getFilteredResults(
	this: IExecuteFunctions,
	operationResult: INodeExecutionData[],
	googleSheet: GoogleSheet,
	result: { title: string; sheetId: number },
	startingRow: number,
	endingRow: number,
): Promise<INodeExecutionData[]> {
	const sheetName = result.title;

	operationResult = await readSheet.call(
		this,
		googleSheet,
		sheetName,
		0,
		operationResult,
		this.getNode().typeVersion,
		[],
		undefined,
		{
			rangeDefinition: 'specifyRange',
			headerRow: 1,
			firstDataRow: startingRow,
			includeHeadersWithEmptyCells: true,
		},
	);

	return operationResult.filter((row) => (row?.json?.row_number as number) <= endingRow);
}

export async function getNumberOfRowsLeftFiltered(
	this: IExecuteFunctions,
	googleSheet: GoogleSheet,
	sheetName: string,
	startingRow: number,
	endingRow: number,
) {
	const remainderSheet: INodeExecutionData[] = await readSheet.call(
		this,
		googleSheet,
		sheetName,
		0,
		[],
		this.getNode().typeVersion,
		[],
		undefined,
		{
			rangeDefinition: 'specifyRange',
			headerRow: 1,
			firstDataRow: startingRow,
		},
	);

	return remainderSheet.filter((row) => (row?.json?.row_number as number) <= endingRow).length;
}

export async function getResults(
	this: IExecuteFunctions,
	operationResult: INodeExecutionData[],
	googleSheet: GoogleSheet,
	result: { title: string; sheetId: number },
	rangeOptions: IDataObject,
): Promise<INodeExecutionData[]> {
	const sheetName = result.title;

	operationResult = await readSheet.call(
		this,
		googleSheet,
		sheetName,
		0,
		operationResult,
		this.getNode().typeVersion,
		[],
		undefined,
		{ ...rangeOptions, includeHeadersWithEmptyCells: true },
	);

	return operationResult;
}

export async function getRowsLeft(
	this: IExecuteFunctions,
	googleSheet: GoogleSheet,
	sheetName: string,
	rangeString: string,
) {
	const remainderSheet: INodeExecutionData[] = await readSheet.call(
		this,
		googleSheet,
		sheetName,
		0,
		[],
		this.getNode().typeVersion,
		[],
		rangeString,
	);

	return remainderSheet.length;
}
