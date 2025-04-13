import {
	type IDataObject,
	type IExecuteFunctions,
	type ILoadOptionsFunctions,
	type INodeExecutionData,
	type INodePropertyOptions,
	type INodeType,
	type INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';
import { makeResolverFromLegacyOptions, NodeVM } from '@n8n/vm2';

import puppeteer from 'puppeteer-extra';
import pluginStealth from 'puppeteer-extra-plugin-stealth';
//@ts-ignore
import pluginHumanTyping from 'puppeteer-extra-plugin-human-typing'; 
import {
	type Browser,
	type Device,
	KnownDevices as devices,
	type Page,
	type PaperFormat,
	type PDFOptions,
	type PuppeteerLifeCycleEvent,
	type ScreenshotOptions,
} from 'puppeteer';

import { nodeDescription } from './Puppeteer.node.options';

const {
	NODE_FUNCTION_ALLOW_BUILTIN: builtIn,
	NODE_FUNCTION_ALLOW_EXTERNAL: external,
	CODE_ENABLE_STDOUT,
} = process.env;

const CONTAINER_LAUNCH_ARGS = [
	'--no-sandbox',
	'--disable-setuid-sandbox',
	'--disable-dev-shm-usage',
	'--disable-gpu'
];

export const vmResolver = makeResolverFromLegacyOptions({
	external: external
		? {
				modules: external.split(','),
				transitive: false,
			}
		: false,
	builtin: builtIn?.split(',') ?? [],
});

interface HeaderObject {
	parameter: Record<string, string>[];
}

interface QueryParameter {
	name: string;
	value: string;
}

type ErrorResponse = INodeExecutionData & {
	json: {
		error: string;
		url?: string;
		headers?: HeaderObject;
		statusCode?: number;
		body?: string;
	};
	pairedItem: {
		item: number;
	};
	[key: string]: unknown;
	error: Error;
};

const DEFAULT_USER_AGENT =
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.75 Safari/537.36';

async function handleError(
	this: IExecuteFunctions,
	error: Error,
	itemIndex: number,
	url?: string,
	page?: Page,
): Promise<INodeExecutionData[]> {
	if (page) {
		try {
			await page.close();
		} catch (closeError) {
			console.error('Error closing page:', closeError);
		}
	}

	if (this.continueOnFail()) {
		const nodeOperationError = new NodeOperationError(this.getNode(), error.message);

		const errorResponse: ErrorResponse = {
			json: {
				error: error.message,
			},
			pairedItem: {
				item: itemIndex,
			},
			error: nodeOperationError,
		};

		if (url) {
			errorResponse.json.url = url;
		}

		return [errorResponse];
	}

	throw new NodeOperationError(this.getNode(), error.message);
}

async function handleOptions(
	this: IExecuteFunctions,
	itemIndex: number,
	items: INodeExecutionData[],
	browser: Browser,
	page: Page,
): Promise<void> {
	const options = this.getNodeParameter('options', 0, {}) as IDataObject;
	const pageCaching = options.pageCaching !== false;
	const headers: HeaderObject = (options.headers || {}) as HeaderObject;

	const requestHeaders = (headers.parameter || []).reduce((acc, header) => {
		acc[header.name] = header.value;
		return acc;
	}, {});
	const device = options.device as string;

	await page.setCacheEnabled(pageCaching);

	if (device) {
		const emulatedDevice = devices[device as keyof typeof devices] as Device;
		if (emulatedDevice) {
			await page.emulate(emulatedDevice);
		}
	} else {
		const userAgent =
			requestHeaders['User-Agent'] ||
			requestHeaders['user-agent'] ||
			DEFAULT_USER_AGENT;
		await page.setUserAgent(userAgent);
	}

	await page.setExtraHTTPHeaders(requestHeaders);
}

async function runCustomScript(
	this: IExecuteFunctions,
	itemIndex: number,
	items: INodeExecutionData[],
	browser: Browser,
	page: Page,
): Promise<INodeExecutionData[]> {
	const scriptCode = this.getNodeParameter('scriptCode', itemIndex) as string;
	const context = {
		$getNodeParameter: this.getNodeParameter,
		$getWorkflowStaticData: this.getWorkflowStaticData,
		helpers: {
			...this.helpers,
			httpRequestWithAuthentication: this.helpers.httpRequestWithAuthentication.bind(this),
			requestWithAuthenticationPaginated: this.helpers.requestWithAuthenticationPaginated.bind(this),
		},
		...this.getWorkflowDataProxy(itemIndex),
		$browser: browser,
		$page: page,
		$puppeteer: puppeteer,
	};
	const vm = new NodeVM({
		console: 'redirect',
		sandbox: context,
		require: vmResolver,
		wasm: false,
	});

	vm.on(
		'console.log',
		this.getMode() === 'manual'
			? this.sendMessageToUI
			: CODE_ENABLE_STDOUT === 'true'
				? (...args: unknown[]) =>
					console.log(`[Workflow "${this.getWorkflow().id}"][Node "${this.getNode().name}"]`, ...args)
				: () => {},
	);

	try {
		const scriptResult = await vm.run(
			`module.exports = async function() { ${scriptCode}\n}()`,
		);

		if (!Array.isArray(scriptResult)) {
			return handleError.call(
				this,
				new Error(
					'Custom script must return an array of items. Please ensure your script returns an array, e.g., return [{ key: value }].',
				),
				itemIndex,
				undefined,
				page,
			);
		}

		return this.helpers.normalizeItems(scriptResult);
	} catch (error) {
		return handleError.call(this, error as Error, itemIndex, undefined, page);
	}
}

async function processPageOperation(
	this: IExecuteFunctions,
	operation: string,
	url: URL,
	page: Page,
	itemIndex: number,
	options: IDataObject,
): Promise<INodeExecutionData[]> {
	const waitUntil = options.waitUntil as PuppeteerLifeCycleEvent;
	const timeout = options.timeout as number;

	try {
		const response = await page.goto(url.toString(), {
			waitUntil,
			timeout,
		});

		const headers = await response?.headers();
		const statusCode = response?.status();

		if (!response || (statusCode && statusCode >= 400)) {
			return handleError.call(
				this,
				new Error(`Request failed with status code ${statusCode || 0}`),
				itemIndex,
				url.toString(),
				page,
			);
		}

		if (operation === 'getPageContent') {
			const body = await page.content();
			return [{
				json: {
					body,
					headers,
					statusCode,
					url: url.toString(),
				},
				pairedItem: {
					item: itemIndex,
				},
			}];
		}

		if (operation === 'getScreenshot') {
			try {
				const dataPropertyName = this.getNodeParameter(
					'dataPropertyName',
					itemIndex,
				) as string;
				const fileName = options.fileName as string;
				const type = this.getNodeParameter(
					'imageType',
					itemIndex,
				) as ScreenshotOptions['type'];
				const fullPage = this.getNodeParameter(
					'fullPage',
					itemIndex,
				) as boolean;
				const screenshotOptions: ScreenshotOptions = {
					type,
					fullPage,
				};

				if (type !== 'png') {
					const quality = this.getNodeParameter(
						'quality',
						itemIndex,
					) as number;
					screenshotOptions.quality = quality;
				}

				if (fileName) {
					screenshotOptions.path = fileName;
				}

				const screenshot = await page.screenshot(screenshotOptions);
				if (screenshot) {
					const binaryData = await this.helpers.prepareBinaryData(
						Buffer.from(screenshot),
						screenshotOptions.path,
						`image/${type}`,
					);
					return [{
						binary: { [dataPropertyName]: binaryData },
						json: {
							headers,
							statusCode,
							url: url.toString(),
						},
						pairedItem: {
							item: itemIndex,
						},
					}];
				}
			} catch (error) {
				return handleError.call(this, error as Error, itemIndex, url.toString(), page);
			}
		}

		if (operation === 'getPDF') {
			try {
				const dataPropertyName = this.getNodeParameter(
					'dataPropertyName',
					itemIndex,
				) as string;
				const pageRanges = this.getNodeParameter(
					'pageRanges',
					itemIndex,
				) as string;
				const displayHeaderFooter = this.getNodeParameter(
					'displayHeaderFooter',
					itemIndex,
				) as boolean;
				const omitBackground = this.getNodeParameter(
					'omitBackground',
					itemIndex,
				) as boolean;
				const printBackground = this.getNodeParameter(
					'printBackground',
					itemIndex,
				) as boolean;
				const landscape = this.getNodeParameter(
					'landscape',
					itemIndex,
				) as boolean;
				const preferCSSPageSize = this.getNodeParameter(
					'preferCSSPageSize',
					itemIndex,
				) as boolean;
				const scale = this.getNodeParameter('scale', itemIndex) as number;
				const margin = this.getNodeParameter(
					'margin',
					0,
					{},
				) as IDataObject;

				let headerTemplate = '';
				let footerTemplate = '';
				let height = '';
				let width = '';
				let format: PaperFormat = 'A4';

				if (displayHeaderFooter === true) {
					headerTemplate = this.getNodeParameter(
						'headerTemplate',
						itemIndex,
					) as string;
					footerTemplate = this.getNodeParameter(
						'footerTemplate',
						itemIndex,
					) as string;
				}

				if (preferCSSPageSize !== true) {
					height = this.getNodeParameter('height', itemIndex) as string;
					width = this.getNodeParameter('width', itemIndex) as string;

					if (!height || !width) {
						format = this.getNodeParameter(
							'format',
							itemIndex,
						) as PaperFormat;
					}
				}

				const pdfOptions: PDFOptions = {
					format,
					displayHeaderFooter,
					omitBackground,
					printBackground,
					landscape,
					headerTemplate,
					footerTemplate,
					preferCSSPageSize,
					scale,
					height,
					width,
					pageRanges,
					margin,
				};
				const fileName = options.fileName as string;
				if (fileName) {
					pdfOptions.path = fileName;
				}

				const pdf = await page.pdf(pdfOptions);
				if (pdf) {
					const binaryData = await this.helpers.prepareBinaryData(
						Buffer.from(pdf),
						pdfOptions.path,
						'application/pdf',
					);
					return [{
						binary: { [dataPropertyName]: binaryData },
						json: {
							headers,
							statusCode,
							url: url.toString(),
						},
						pairedItem: {
							item: itemIndex,
						},
					}];
				}
			} catch (error) {
				return handleError.call(this, error as Error, itemIndex, url.toString(), page);
			}
		}

		return handleError.call(
			this,
			new Error(`Unsupported operation: ${operation}`),
			itemIndex,
			url.toString(),
			page,
		);
	} catch (error) {
		return handleError.call(this, error as Error, itemIndex, url.toString(), page);
	}
}

export class Puppeteer implements INodeType {
	description: INodeTypeDescription = nodeDescription;

	methods = {
		loadOptions: {
			async getDevices(
				this: ILoadOptionsFunctions,
			): Promise<INodePropertyOptions[]> {
				const deviceNames = Object.keys(devices);
				const returnData: INodePropertyOptions[] = [];

				for (const name of deviceNames) {
					const device = devices[name as keyof typeof devices] as Device;
					returnData.push({
						name,
						value: name,
						description: `${device.viewport.width} x ${device.viewport.height} @ ${device.viewport.deviceScaleFactor}x`,
					});
				}

				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const options = this.getNodeParameter('options', 0, {}) as IDataObject;
		const operation = this.getNodeParameter('operation', 0) as string;
		let headless: 'shell' | boolean = options.headless !== false;
		const headlessShell = options.shell === true;
		const executablePath = options.executablePath as string;
		const browserWSEndpoint = options.browserWSEndpoint as string;
		const stealth = options.stealth === true;
		const humanTyping = options.humanTyping === true;
		const humanTypingOptions =  {
			keyboardLayout: "en",
			...((options.humanTypingOptions as IDataObject) || {})
		};
		const launchArguments = (options.launchArguments as IDataObject) || {};
		const launchArgs: IDataObject[] = launchArguments.args as IDataObject[];
		const args: string[] = [];
		const device = options.device as string;
		const protocolTimeout = options.protocolTimeout as number;
		let batchSize = options.batchSize as number;

		if (!Number.isInteger(batchSize) || batchSize < 1) {
			batchSize = 1;
		}

		// More on launch arguments: https://www.chromium.org/developers/how-tos/run-chromium-with-flags/
		if (launchArgs && launchArgs.length > 0) {
			args.push(...launchArgs.map((arg: IDataObject) => arg.arg as string));
		}

		const addContainerArgs = options.addContainerArgs === true;
		if (addContainerArgs) {
			const missingContainerArgs = CONTAINER_LAUNCH_ARGS.filter(arg => !args.some(
				existingArg => existingArg === arg || existingArg.startsWith(`${arg}=`)
			));

			if (missingContainerArgs.length > 0) {
				console.log('Puppeteer node: Adding container optimizations:', missingContainerArgs);
				args.push(...missingContainerArgs);
			} else {
				console.log('Puppeteer node: Container optimizations already present in launch arguments');
			}
		}

		// More on proxying: https://www.chromium.org/developers/design-documents/network-settings
		if (options.proxyServer) {
			args.push(`--proxy-server=${options.proxyServer}`);
		}

		if (stealth) {
			puppeteer.use(pluginStealth());
		}
		if (humanTyping) {
			puppeteer.use(pluginHumanTyping(humanTypingOptions));
		}

		if (headless && headlessShell) {
			headless = 'shell';
		}

		let browser: Browser;
		try {
			if (browserWSEndpoint) {
				browser = await puppeteer.connect({
					browserWSEndpoint,
					protocolTimeout,
				});
			} else {
				browser = await puppeteer.launch({
					headless,
					args,
					executablePath,
					protocolTimeout,
				});
			}
		} catch (error) {
			throw new Error(`Failed to launch/connect to browser: ${(error as Error).message}`);
		}

		const processItem = async (
			item: INodeExecutionData,
			itemIndex: number,
		): Promise<INodeExecutionData[]> => {
			let page: Page | undefined;
			try {
				page = await browser.newPage();
				await handleOptions.call(this, itemIndex, items, browser, page);

				if (operation === 'runCustomScript') {
					console.log(
						`Processing ${itemIndex + 1} of ${items.length}: [${operation}]${device ? ` [${device}] ` : ' '} Custom Script`,
					);
					return await runCustomScript.call(
						this,
						itemIndex,
						items,
						browser,
						page,
					);
				}
					const urlString = this.getNodeParameter('url', itemIndex) as string;
					const queryParametersOptions = this.getNodeParameter(
						'queryParameters',
						itemIndex,
						{},
					) as IDataObject;

					const queryParameters = (queryParametersOptions.parameters as QueryParameter[]) || [];
					let url: URL;

					try {
						url = new URL(urlString);
						for (const queryParameter of queryParameters) {
							url.searchParams.append(queryParameter.name, queryParameter.value);
						}
					} catch (error) {
						return handleError.call(
							this,
							new Error(`Invalid URL: ${urlString}`),
							itemIndex,
							urlString,
							page,
						);
					}

					console.log(
						`Processing ${itemIndex + 1} of ${items.length}: [${operation}]${device ? ` [${device}] ` : ' '}${url}`,
					);

					return await processPageOperation.call(
						this,
						operation,
						url,
						page,
						itemIndex,
						options,
					);
			} catch (error) {
				return handleError.call(
					this,
					error as Error,
					itemIndex,
					undefined,
					page,
				);
			} finally {
				if (page) {
					try {
						await page.close();
					} catch (error) {
						console.error('Error closing page:', error);
					}
				}
			}
		};

		try {
			for (let i = 0; i < items.length; i += batchSize) {
				const batch = items.slice(i, i + batchSize);
				const results = await Promise.all(
					batch.map((item, idx) => processItem(item, i + idx)),
				);
				if (results?.length) {
					returnData.push(...results.flat());
				}
			}
		} finally {
			if (browser) {
				try {
					if (browserWSEndpoint) {
						await browser.disconnect();
					} else {
						await browser.close();
					}	
				} catch (error) {
					console.error('Error closing browser:', error);
				}
			}
		}

		return this.prepareOutputData(returnData);
	}
}
