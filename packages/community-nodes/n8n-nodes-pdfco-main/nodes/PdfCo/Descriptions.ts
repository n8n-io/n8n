/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import { INodeTypeDescription } from 'n8n-workflow';

import * as aiInvoiceParse from './actions/aiInvoiceParser';
import * as mergePdf from './actions/mergePdf';
import * as splitPdf from './actions/splitPdf';
import * as htmlToPDF from './actions/htmlToPDF';
import * as convertToPDF from './actions/convertToPDF';
import * as convertFromPDF from './actions/convertFromPDF';
import * as addTextImagesToPDF from './actions/addTextImagesToPDF';
import * as fillPdfForm from './actions/fillPdfForm';
import * as pdfInfo from './actions/pdfInfo';
import * as compressPdf from './actions/compressPdf';
import * as pdfSecurity from './actions/pdfSecurity';
import * as rotatePdf from './actions/rotatePdf';
import * as deletePdfPages from './actions/deletePdfPages';
import * as searchPdf from './actions/searchPdf';
import * as editPdf from './actions/searchAndReplaceDelete';
import * as barcodeReader from './actions/barcodeReader';
import * as barcodeGenerator from './actions/barcodeGenerator';
import * as makePdfSearchable from './actions/makePdfSearchable';
import * as uploadFile from './actions/uploadFile';
import { ActionConstants } from './GenericFunctions';

export const descriptions: INodeTypeDescription = {
	displayName: 'PDF.co Api',
	name: 'PDFco Api',
	description:
		'Generate PDF, extract data from PDF, split PDF, merge PDF, convert PDF. Fill PDF forms, add text and images to pdf and much more with pdf.co!',
	defaults: {
		name: 'PDFco Api',
	},
	group: ['transform'],
	// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
	icon: 'file:pdfco.svg',
	inputs: ['main'],
	outputs: ['main'],
	credentials: [
		{
			name: 'pdfcoApi',
			required: true,
		},
	],
	properties: [
		{
			displayName: 'Action',
			name: 'operation',
			type: 'options',
			noDataExpression: true,
			options: [
				{
					name: 'AI Invoice Parser',
					description:
						'Transform your invoice processing with our advanced AI. Enjoy quick, accurate data extraction that eliminates manual effort and saves you valuable time.',
					value: ActionConstants.AiInvoiceParser,
					action: ActionConstants.AiInvoiceParser,
				},
				{
					name: 'URL/HTML to PDF',
					description:
						'Convert HTML or URL to PDF with advanced options (e.g. layout, orientation). Supports HTML templates (Handlebar and Mustache).',
					value: ActionConstants.UrlHtmlToPDF,
					action: ActionConstants.UrlHtmlToPDF,
				},
				{
					name: 'Merge PDF',
					description:
						'Combine multiple document formats into a single PDF. Supported formats include PDF, DOC, DOCX, XLS, JPG, PNG, and more.',
					value: ActionConstants.MergePdf,
					action: ActionConstants.MergePdf,
				},
				{
					name: 'Split PDF',
					description:
						'PDF Splitter that takes PDF file and splits into multiple PDF files using page index, page range, text search or barcode search',
					value: ActionConstants.SplitPdf,
					action: ActionConstants.SplitPdf,
				},
				{
					name: 'Convert To PDF',
					description:
						'Convert a variety of formats such as URLs, HTML code, documents, spreadsheets, presentations, images, and more into PDF',
					value: ActionConstants.ConvertToPDF,
					action: ActionConstants.ConvertToPDF,
				},
				{
					name: 'Convert From PDF',
					description:
						'Convert PDF pages to structured CSV, XML, JSON, Plain Text, Convert PDF to JPG, PDF to PNG, PDF to TIFF, and more',
					value: ActionConstants.ConvertFromPDF,
					action: ActionConstants.ConvertFromPDF,
				},
				{
					name: 'Add Text/Images to PDF',
					description:
						'Add text, images, and annotations to PDF documents with precise positioning and styling options',
					value: ActionConstants.AddTextImagesToPDF,
					action: ActionConstants.AddTextImagesToPDF,
				},
				{
					name: 'Fill a PDF Form',
					description:
						'Fill interactive PDF forms with text, checkboxes, and other form elements',
					value: ActionConstants.FillPdfForm,
					action: ActionConstants.FillPdfForm,
				},
				{
					name: 'PDF Information & Form Fields',
					description:
						'Extract metadata and form field information from PDF documents',
					value: ActionConstants.PDFInfo,
					action: ActionConstants.PDFInfo,
				},
				{
					name: 'Compress PDF',
					description:
						'Reduce PDF file size while maintaining quality',
					value: ActionConstants.CompressPdf,
					action: ActionConstants.CompressPdf,
				},
				{
					name: 'PDF Security',
					description:
						'Add or remove password protection and security features from PDF documents',
					value: ActionConstants.PDFSecurity,
					action: ActionConstants.PDFSecurity,
				},
				{
					name: 'Rotate PDF Pages',
					description:
						'Rotate PDF pages manually or automatically detect and fix rotation based on text analysis',
					value: ActionConstants.RotatePdf,
					action: ActionConstants.RotatePdf,
				},
				{
					name: 'Delete PDF Pages',
					description:
						'Remove specific pages from a PDF document',
					value: ActionConstants.DeletePdfPages,
					action: ActionConstants.DeletePdfPages,
				},
				{
					name: 'Search in PDF',
					description:
						'Search for specific text within PDF documents or scanned images',
					value: ActionConstants.SearchPdf,
					action: ActionConstants.SearchPdf,
				},
				{
					name: 'Search & Replace Text or Delete',
					description: 'Search and delete text, replace text, or replace text with images in PDF documents',
					value: ActionConstants.SearchAndReplaceDelete,
				},
				{
					name: 'Barcode Reader',
					description: 'Decode barcodes from images or PDF documents swiftly and accurately',
					value: ActionConstants.BarcodeReader,
				},
				{
					name: 'Barcode Generator',
					description: 'Generate various types of barcodes including QR codes, Code 128, Code 39, and more',
					value: ActionConstants.BarcodeGenerator,
				},
				{
					name: 'Make PDF Searchable or Unsearchable',
					description: 'Convert scanned PDF or image files into text-searchable PDFs using OCR or make them unsearchable/scanned',
					value: ActionConstants.MakePdfSearchable,
				},
				{
					name: 'Upload File',
					description: 'Upload a file to PDF.co and get a URL',
					value: ActionConstants.UploadFile,
					action: ActionConstants.UploadFile,
				}
			],
			default: 'AI Invoice Parser',
		},
		...aiInvoiceParse.description,
		...htmlToPDF.description,
		...mergePdf.description,
		...splitPdf.description,
		...convertToPDF.description,
		...convertFromPDF.description,
		...addTextImagesToPDF.description,
		...fillPdfForm.description,
		...pdfInfo.description,
		...compressPdf.description,
		...pdfSecurity.description,
		...rotatePdf.description,
		...deletePdfPages.description,
		...searchPdf.description,
		...editPdf.description,
		...barcodeReader.description,
		...barcodeGenerator.description,
		...makePdfSearchable.description,
		...uploadFile.description,
	],
	subtitle: '={{$parameter["operation"]}}',
	version: 1,
};
