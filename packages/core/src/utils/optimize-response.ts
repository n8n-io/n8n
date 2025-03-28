import { Readability } from '@mozilla/readability';
import * as cheerio from 'cheerio';
import { convert } from 'html-to-text';
import { JSDOM } from 'jsdom';
import { get, set, unset } from 'lodash';
import {
	jsonParse,
	NodeOperationError,
	type GenericValue,
	type IDataObject,
	type ISupplyDataFunctions,
} from 'n8n-workflow';
import { hasKey } from 'n8n-workflow';

const htmlOptimizer = (ctx: ISupplyDataFunctions, itemIndex: number, maxLength: number) => {
	const cssSelector = ctx.getNodeParameter('cssSelector', itemIndex, '') as string;
	const onlyContent = ctx.getNodeParameter('onlyContent', itemIndex, false) as boolean;
	let elementsToOmit: string[] = [];

	if (onlyContent) {
		const elementsToOmitUi = ctx.getNodeParameter('elementsToOmit', itemIndex, '') as
			| string
			| string[];

		if (typeof elementsToOmitUi === 'string') {
			elementsToOmit = elementsToOmitUi
				.split(',')
				.filter((s) => s)
				.map((s) => s.trim());
		}
	}

	return <T>(response: T) => {
		if (typeof response !== 'string') {
			throw new NodeOperationError(
				ctx.getNode(),
				`The response type must be a string. Received: ${typeof response}`,
				{ itemIndex },
			);
		}
		const returnData: string[] = [];

		const html = cheerio.load(response);
		const htmlElements = html(cssSelector);

		htmlElements.each((_, el) => {
			let value = html(el).html() ?? '';

			if (onlyContent) {
				let htmlToTextOptions;

				if (elementsToOmit?.length) {
					htmlToTextOptions = {
						selectors: elementsToOmit.map((selector) => ({
							selector,
							format: 'skip',
						})),
					};
				}

				value = convert(value, htmlToTextOptions);
			}

			value = value
				.trim()
				.replace(/^\s+|\s+$/g, '')
				.replace(/(\r\n|\n|\r)/gm, '')
				.replace(/\s+/g, ' ');

			returnData.push(value);
		});

		const text = JSON.stringify(returnData, null, 2);

		if (maxLength > 0 && text.length > maxLength) {
			return text.substring(0, maxLength);
		}

		return text;
	};
};

const textOptimizer = (ctx: ISupplyDataFunctions, itemIndex: number, maxLength: number) => {
	return (response: unknown) => {
		if (typeof response === 'object') {
			try {
				response = JSON.stringify(response, null, 2);
			} catch (error) {}
		}

		if (typeof response !== 'string') {
			throw new NodeOperationError(
				ctx.getNode(),
				`The response type must be a string. Received: ${typeof response}`,
				{ itemIndex },
			);
		}

		const dom = new JSDOM(response);
		const article = new Readability(dom.window.document, {
			keepClasses: true,
		}).parse();

		const text = article?.textContent ?? '';

		if (maxLength > 0 && text.length > maxLength) {
			return text.substring(0, maxLength);
		}

		return text;
	};
};

type ResponseOptimizeValue = Exclude<GenericValue, object> | IDataObject | IDataObject[];
const jsonOptimizer = (ctx: ISupplyDataFunctions, itemIndex: number) => {
	return (response: ResponseOptimizeValue): ResponseOptimizeValue => {
		if (typeof response === 'string') {
			response = jsonParse(response, { fallbackValue: null });
		}

		if (typeof response !== 'object' || !response) {
			return response;
		}

		const dataField = ctx.getNodeParameter('dataField', itemIndex, '') as string;
		let returnData: IDataObject[] = [];

		if (!Array.isArray(response)) {
			if (dataField && hasKey(response, dataField)) {
				const data = response[dataField] as IDataObject | IDataObject[];
				if (Array.isArray(data)) {
					response = data;
				} else {
					response = [data];
				}
			} else {
				response = [response];
			}
		} else {
			if (dataField) {
				response = response.map((data) => data[dataField]) as IDataObject[];
			}
		}

		const fieldsToInclude = ctx.getNodeParameter('fieldsToInclude', itemIndex, 'all') as
			| 'all'
			| 'selected'
			| 'except';

		let fields: string | string[] = [];

		if (fieldsToInclude !== 'all') {
			fields = ctx.getNodeParameter('fields', itemIndex, []) as string[] | string;

			if (typeof fields === 'string') {
				fields = fields.split(',').map((field) => field.trim());
			}
		} else {
			returnData = response;
		}

		if (fieldsToInclude === 'selected') {
			for (const item of response) {
				const newItem: IDataObject = {};

				for (const field of fields) {
					set(newItem, field, get(item, field));
				}

				returnData.push(newItem);
			}
		}

		if (fieldsToInclude === 'except') {
			for (const item of response) {
				for (const field of fields) {
					unset(item, field);
				}

				returnData.push(item);
			}
		}

		return JSON.stringify(returnData, null, 2);
	};
};

// const jsonOptimizer = (ctx: ISupplyDataFunctions, itemIndex: number) => {
// 	return (response: string): string => {
// 		let responseData = jsonParse(response);

// 		if (typeof responseData !== 'object' || !responseData) {
// 			throw new NodeOperationError(
// 				ctx.getNode(),
// 				'The response type must be an object or an array of objects',
// 				{ itemIndex },
// 			);
// 		}

// 		const dataField = ctx.getNodeParameter('dataField', itemIndex, '') as string;
// 		let returnData: IDataObject[] = [];

// 		if (!Array.isArray(responseData)) {
// 			if (dataField) {
// 				const data = get(responseData, dataField) as unknown;
// 				if (Array.isArray(data)) {
// 					responseData = data;
// 				} else {
// 					responseData = [data];
// 				}
// 			} else {
// 				responseData = [responseData];
// 			}
// 		} else if (dataField) {
// 			responseData = responseData.map((data) => get(data, dataField) as unknown);
// 		}

// 		const fieldsToInclude = ctx.getNodeParameter('fieldsToInclude', itemIndex, 'all') as
// 			| 'all'
// 			| 'selected'
// 			| 'except';

// 		let fields: string | string[] = [];

// 		if (fieldsToInclude !== 'all') {
// 			fields = ctx.getNodeParameter('fields', itemIndex, []) as string[] | string;

// 			if (typeof fields === 'string') {
// 				fields = fields.split(',').map((field) => field.trim());
// 			}
// 		} else {
// 			// this is safe as there is no combination of parameters that arrives here but avoids
// 			// the block above that assigns a IDataObject[] to responseData
// 			returnData = responseData as IDataObject[];
// 		}

// 		if (fieldsToInclude === 'selected') {
// 			for (const item of responseData) {
// 				const newItem: IDataObject = {};

// 				for (const field of fields) {
// 					set(newItem, field, get(item, field));
// 				}

// 				returnData.push(newItem);
// 			}
// 		}

// 		if (fieldsToInclude === 'except') {
// 			for (const item of responseData) {
// 				for (const field of fields) {
// 					unset(item, field);
// 				}

// 				returnData.push(item);
// 			}
// 		}

// 		return JSON.stringify(returnData, null, 2);
// 	};
// };

export const configureResponseOptimizer = <T extends ResponseOptimizeValue>(
	ctx: ISupplyDataFunctions,
	itemIndex: number,
): ((response: T) => unknown) => {
	const optimizeResponse = ctx.getNodeParameter('optimizeResponse', itemIndex, false) as boolean;

	if (optimizeResponse) {
		const responseType = ctx.getNodeParameter('responseType', itemIndex) as
			| 'json'
			| 'text'
			| 'html';

		let maxLength = 0;
		const truncateResponse = ctx.getNodeParameter('truncateResponse', itemIndex, false) as boolean;

		if (truncateResponse) {
			maxLength = ctx.getNodeParameter('maxLength', itemIndex, 0) as number;
		}

		let optimizeFn = (x: ResponseOptimizeValue) => x;
		switch (responseType) {
			case 'html':
				optimizeFn = htmlOptimizer(ctx, itemIndex, maxLength);
				break;
			case 'text':
				optimizeFn = textOptimizer(ctx, itemIndex, maxLength);
				break;
			case 'json':
				optimizeFn = jsonOptimizer(ctx, itemIndex);
				return (x) => optimizeFn(x);
		}

		const optimizeRec = (x: unknown): unknown => {
			if (typeof x === 'string') {
				return optimizeFn(x);
			} else if (typeof x === 'object' && x !== null) {
				return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, optimizeRec(v)]));
			} else {
				return x;
			}
		};

		return (x) => optimizeRec(x);
	}

	return (x) => x;
};
