import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import { ActionConstants } from './../GenericFunctions';

import * as aiInvoiceParser from './aiInvoiceParser';
import * as mergePdf from './mergePdf';
import * as splitPdf from './splitPdf';
import * as htmlToPDF from './htmlToPDF';
import * as convertToPDF from './convertToPDF';
import * as convertFromPDF from './convertFromPDF';
import * as addTextImagesToPDF from './addTextImagesToPDF';
import * as fillPdfForm from './fillPdfForm';
import * as pdfInfo from './pdfInfo';
import * as compressPdf from './compressPdf';
import * as pdfSecurity from './pdfSecurity';
import * as rotatePdf from './rotatePdf';
import * as deletePdfPages from './deletePdfPages';
import * as searchPdf from './searchPdf';
import * as searchAndReplaceDelete from './searchAndReplaceDelete';
import * as barcodeReader from './barcodeReader';
import * as barcodeGenerator from './barcodeGenerator';
import * as makePdfSearchable from './makePdfSearchable';
import * as uploadFile from './uploadFile';

export async function router(this: IExecuteFunctions): Promise<INodeExecutionData[]> {
	const items = this.getInputData();
	const operationResult: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		const action = this.getNodeParameter('operation', i);

		try {
			if (action === ActionConstants.AiInvoiceParser) {
				operationResult.push(...(await aiInvoiceParser.execute.call(this, i)));
			} else if (action === ActionConstants.MergePdf) {
				operationResult.push(...(await mergePdf.execute.call(this, i)));
			} else if (action === ActionConstants.SplitPdf) {
				operationResult.push(...(await splitPdf.execute.call(this, i)));
			} else if (action === ActionConstants.UrlHtmlToPDF) {
				operationResult.push(...(await htmlToPDF.execute.call(this, i)));
			} else if (action === ActionConstants.ConvertToPDF) {
				operationResult.push(...(await convertToPDF.execute.call(this, i)));
			} else if (action === ActionConstants.ConvertFromPDF) {
				operationResult.push(...(await convertFromPDF.execute.call(this, i)));
			} else if (action === ActionConstants.AddTextImagesToPDF) {
				operationResult.push(...(await addTextImagesToPDF.execute.call(this, i)));
			} else if (action === ActionConstants.FillPdfForm) {
				operationResult.push(...(await fillPdfForm.execute.call(this, i)));
			} else if (action === ActionConstants.PDFInfo) {
				operationResult.push(...(await pdfInfo.execute.call(this, i)));
			} else if (action === ActionConstants.CompressPdf) {
				operationResult.push(...(await compressPdf.execute.call(this, i)));
			} else if (action === ActionConstants.PDFSecurity) {
				operationResult.push(...(await pdfSecurity.execute.call(this, i)));
			} else if (action === ActionConstants.RotatePdf) {
				operationResult.push(...(await rotatePdf.execute.call(this, i)));
			} else if (action === ActionConstants.DeletePdfPages) {
				operationResult.push(...(await deletePdfPages.execute.call(this, i)));
			} else if (action === ActionConstants.SearchPdf) {
				operationResult.push(...(await searchPdf.execute.call(this, i)));
			} else if (action === ActionConstants.SearchAndReplaceDelete) {
				operationResult.push(...(await searchAndReplaceDelete.execute.call(this, i)));
			} else if (action === ActionConstants.BarcodeReader) {
				operationResult.push(...(await barcodeReader.execute.call(this, i)));
			} else if (action === ActionConstants.BarcodeGenerator) {
				operationResult.push(...(await barcodeGenerator.execute.call(this, i)));
			} else if (action === ActionConstants.MakePdfSearchable) {
				operationResult.push(...(await makePdfSearchable.execute.call(this, i)));
			} else if (action === ActionConstants.UploadFile) {
				operationResult.push(...(await uploadFile.execute.call(this, i)));
			}
		} catch (err) {
			if (this.continueOnFail()) {
				operationResult.push({ json: this.getInputData(i)[0].json, error: err });
			} else {
				throw err;
			}
		}
	}

	return operationResult;
}
