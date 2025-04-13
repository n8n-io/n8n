import { type INodeTypeDescription, NodeConnectionType } from 'n8n-workflow';
import { existsSync, readFileSync } from 'node:fs';

function isRunningInContainer(): boolean {
	try {
		// Method 1: Check for .dockerenv file
		if (existsSync('/.dockerenv')) {
			console.log('Puppeteer node: Container detected via .dockerenv file');
			return true;
		}

		// Method 2: Check cgroup (Linux only)
		if (process.platform === 'linux') {
			try {
				const cgroupContent = readFileSync('/proc/1/cgroup', 'utf8');
				if (cgroupContent.includes('docker') || cgroupContent.includes('kubepods')) {
					console.log('Puppeteer node: Container detected via cgroup content');
					return true;
				}
			} catch (error) {
				console.log('Puppeteer node: cgroup check skipped');
			}
		}

		// Method 3: Check common container environment variables
		if (process.env.KUBERNETES_SERVICE_HOST ||
			process.env.DOCKER_CONTAINER ||
			process.env.DOCKER_HOST) {
			console.log('Puppeteer node: Container detected via environment variables');
			return true;
		}

		return false;
	} catch (error) {
		// If any error occurs during checks, log and return false
		console.log('Puppeteer node: Container detection failed:', (error as Error).message);
		return false;
	}
}

/**
 * Options to be displayed
 */
export const nodeDescription: INodeTypeDescription = {
	displayName: 'Puppeteer',
	name: 'puppeteer',
	group: ['puppeteer'],
	version: 1,
	description: 'Automate browser interactions using Puppeteer',
	defaults: {
		name: 'Puppeteer',
		color: '#125580',
	},
	icon: 'file:puppeteer.svg',
	inputs: [NodeConnectionType.Main],
	outputs: [NodeConnectionType.Main],
	usableAsTool: true,
	properties: [
		{
			displayName: 'URL',
			name: 'url',
			type: 'string',
			required: true,
			default: '',
			displayOptions: {
				show: {
					operation: ['getPageContent', 'getScreenshot', 'getPDF'],
				},
			},
		},
		{
			displayName: 'Operation',
			name: 'operation',
			type: 'options',
			options: [
				{
					name: 'Get Page Content',
					value: 'getPageContent',
					description: 'Gets the full HTML contents of the page',
				},
				{
					name: 'Get PDF',
					value: 'getPDF',
					description: 'Captures all or part of the page as a PDF',
				},
				{
					name: 'Get Screenshot',
					value: 'getScreenshot',
					description: 'Captures all or part of the page as an image',
				},
				{
					name: 'Run Custom Script',
					value: 'runCustomScript',
					description: 'Runs custom code to perform specific actions on the page',
				},
			],
			default: 'getPageContent',
		},
		{
			displayName: 'Script Code',
			name: 'scriptCode',
			type: 'string',
			typeOptions: {
				// @ts-ignore
				editor: 'codeNodeEditor',
				editorLanguage: 'javaScript',
			},
			required: true,
			default:
				'// Navigate to an IP lookup service\nawait $page.goto(\'https://httpbin.org/ip\');\n\n// Extract the IP address from the page content\nconst ipData = await $page.evaluate(() => {\n    const response = document.body.innerText;\n    const parsed = JSON.parse(response);\n    return parsed.origin;  // Extract the \'origin\' field, which typically contains the IP address\n});\n\nconsole.log("Hello, world!");\n\nconsole.log("IP Address", ipData);\n\n// Return the result in the required format\nreturn [{ ip: ipData, ...$json }];',
			description:
				'JavaScript code to execute with Puppeteer. You have access to the $browser and $page objects, which represent the Puppeteer browser and page.',
			noDataExpression: false,
			displayOptions: {
				show: {
					operation: ['runCustomScript'],
				},
			},
		},
		{
			displayName:
				'Use <code>$page</code>, <code>$browser</code>, or <code>$puppeteer</code> vars to access Puppeteer. <a target="_blank" href="https://docs.n8n.io/code-examples/methods-variables-reference/">Special vars/methods</a> are available. <br><br>Debug by using <code>console.log()</code> statements and viewing their output in the browser console.',
			name: 'notice',
			type: 'notice',
			displayOptions: {
				show: {
					operation: ['runCustomScript'],
				},
			},
			default: '',
		},
		{
			displayName: 'Property Name',
			name: 'dataPropertyName',
			type: 'string',
			required: true,
			default: 'data',
			description:
				'Name of the binary property in which  to store the image or PDF data.',
			displayOptions: {
				show: {
					operation: ['getScreenshot', 'getPDF'],
				},
			},
		},
		{
			displayName: 'Page Ranges',
			name: 'pageRanges',
			type: 'string',
			required: false,
			default: '',
			description: 'Paper ranges to print, e.g. 1-5, 8, 11-13.',
			displayOptions: {
				show: {
					operation: ['getPDF'],
				},
			},
		},
		{
			displayName: 'Scale',
			name: 'scale',
			type: 'number',
			typeOptions: {
				minValue: 0.1,
				maxValue: 2,
			},
			default: 1.0,
			required: true,
			description:
				'Scales the rendering of the web page. Amount must be between 0.1 and 2.',
			displayOptions: {
				show: {
					operation: ['getPDF'],
				},
			},
		},
		{
			displayName: 'Prefer CSS Page Size',
			name: 'preferCSSPageSize',
			type: 'boolean',
			required: true,
			default: true,
			displayOptions: {
				show: {
					operation: ['getPDF'],
				},
			},
			description:
				'Give any CSS @page size declared in the page priority over what is declared in the width or height or format option.',
		},
		{
			displayName: 'Format',
			name: 'format',
			type: 'options',
			options: [
				{
					name: 'Letter',
					value: 'Letter',
					description: '8.5in x 11in',
				},
				{
					name: 'Legal',
					value: 'Legal',
					description: '8.5in x 14in',
				},
				{
					name: 'Tabloid',
					value: 'Tabloid',
					description: '11in x 17in',
				},
				{
					name: 'Ledger',
					value: 'Ledger',
					description: '17in x 11in',
				},
				{
					name: 'A0',

					value: 'A0',
					description: '33.1in x 46.8in',
				},
				{
					name: 'A1',
					value: 'A1',
					description: '23.4in x 33.1in',
				},
				{
					name: 'A2',
					value: 'A2',
					description: '16.54in x 23.4in',
				},
				{
					name: 'A3',
					value: 'A3',
					description: '11.7in x 16.54in',
				},
				{
					name: 'A4',
					value: 'A4',
					description: '8.27in x 11.7in',
				},
				{
					name: 'A5',
					value: 'A5',
					description: '5.83in x 8.27in',
				},
				{
					name: 'A6',
					value: 'A6',
					description: '4.13in x 5.83in',
				},
			],
			default: 'Letter',
			description:
				'Valid paper format types when printing a PDF. eg: Letter, A4',
			displayOptions: {
				show: {
					operation: ['getPDF'],
					preferCSSPageSize: [false],
				},
			},
		},
		{
			displayName: 'Height',
			name: 'height',
			type: 'string',
			default: '',
			required: false,
			description:
				'Sets the height of paper. You can pass in a number or a string with a unit.',
			displayOptions: {
				show: {
					operation: ['getPDF'],
					preferCSSPageSize: [false],
				},
			},
		},
		{
			displayName: 'Width',
			name: 'width',
			type: 'string',
			default: '',
			required: false,
			description:
				'Sets the width of paper. You can pass in a number or a string with a unit.',
			displayOptions: {
				show: {
					operation: ['getPDF'],
					preferCSSPageSize: [false],
				},
			},
		},
		{
			displayName: 'Landscape',
			name: 'landscape',
			type: 'boolean',
			required: true,
			default: true,
			displayOptions: {
				show: {
					operation: ['getPDF'],
				},
			},
			description: 'Whether to show the header and footer.',
		},
		{
			displayName: 'Margin',
			name: 'margin',
			type: 'collection',
			placeholder: 'Add Margin',
			default: {},
			description: 'Set the PDF margins.',
			displayOptions: {
				show: {
					operation: ['getPDF'],
				},
			},
			options: [
				{
					displayName: 'Top',
					name: 'top',
					type: 'string',
					default: '',
					required: false,
				},
				{
					displayName: 'Bottom',
					name: 'bottom',
					type: 'string',
					default: '',
					required: false,
				},
				{
					displayName: 'Left',
					name: 'left',
					type: 'string',
					default: '',
					required: false,
				},
				{
					displayName: 'Right',
					name: 'right',
					type: 'string',
					default: '',
					required: false,
				},
			],
		},
		{
			displayName: 'Display Header/Footer',
			name: 'displayHeaderFooter',
			type: 'boolean',
			required: true,
			default: false,
			displayOptions: {
				show: {
					operation: ['getPDF'],
				},
			},
			description: 'Whether to show the header and footer.',
		},
		{
			displayName: 'Header Template',
			name: 'headerTemplate',
			typeOptions: {
				rows: 5,
			},
			type: 'string',
			default: "",
			description: `HTML template for the print header. Should be valid HTML with the following classes used to inject values into them: - date formatted print date

            - title document title

            - url document location

            - pageNumber current page number

            - totalPages total pages in the document`,
			noDataExpression: true,
			displayOptions: {
				show: {
					operation: ['getPDF'],
					displayHeaderFooter: [true],
				},
			},
		},
		{
			displayName: 'Footer Template',
			name: 'footerTemplate',
			typeOptions: {
				rows: 5,
			},
			type: 'string',
			default: "",
			description: "HTML template for the print footer. Should be valid HTML with the following classes used to inject values into them: - date formatted print date",
			noDataExpression: true,
			displayOptions: {
				show: {
					operation: ['getPDF'],
					displayHeaderFooter: [true],
				},
			},
		},
		{
			displayName: 'Transparent Background',
			name: 'omitBackground',
			type: 'boolean',
			required: true,
			default: false,
			displayOptions: {
				show: {
					operation: ['getPDF'],
				},
			},
			description:
				'Hides default white background and allows generating pdfs with transparency.',
		},
		{
			displayName: 'Background Graphics',
			name: 'printBackground',
			type: 'boolean',
			required: true,
			default: false,
			displayOptions: {
				show: {
					operation: ['getPDF'],
				},
			},
			description: 'Set to true to include background graphics.',
		},
		{
			displayName: 'Type',
			name: 'imageType',
			type: 'options',
			options: [
				{
					name: 'JPEG',
					value: 'jpeg',
				},
				{
					name: 'PNG',
					value: 'png',
				},
				{
					name: 'WebP',
					value: 'webp',
				},
			],
			displayOptions: {
				show: {
					operation: ['getScreenshot'],
				},
			},
			default: 'png',
			description: 'The image type to use. PNG, JPEG, and WebP are supported.',
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
					operation: ['getScreenshot'],
					imageType: ['jpeg', 'webp'],
				},
			},
			description:
				'The quality of the image, between 0-100. Not applicable to png images.',
		},
		{
			displayName: 'Full Page',
			name: 'fullPage',
			type: 'boolean',
			required: true,
			default: false,
			displayOptions: {
				show: {
					operation: ['getScreenshot'],
				},
			},
			description: 'When true, takes a screenshot of the full scrollable page.',
		},
		{
			displayName: 'Query Parameters',
			name: 'queryParameters',
			placeholder: 'Add Parameter',
			type: 'fixedCollection',
			typeOptions: {
				multipleValues: true,
			},
			displayOptions: {
				show: {
					operation: ['getPageContent', 'getScreenshot', 'getPDF'],
				},
			},
			description: 'The query parameter to send.',
			default: {},
			options: [
				{
					name: 'parameters',
					displayName: 'Parameters',
					values: [
						{
							displayName: 'Name',
							name: 'name',
							type: 'string',
							default: '',
							description: 'Name of the parameter.',
						},
						{
							displayName: 'Value',
							name: 'value',
							type: 'string',
							default: '',
							description: 'Value of the parameter.',
						},
					],
				},
			],
		},
		{
			displayName: 'Options',
			name: 'options',
			type: 'collection',
			placeholder: 'Add Option',
			default: {},
			options: [
				{
					displayName: 'Batch Size',
					name: 'batchSize',
					type: 'number',
					typeOptions: {
						minValue: 1,
					},
					default: 1,
					description:
						'Maximum number of pages to open simultaneously. More pages will consume more memory and CPU.',
				},
				{
					displayName: 'Browser WebSocket Endpoint',
					name: 'browserWSEndpoint',
					type: 'string',
					required: false,
					default: '',
					description: 'The WebSocket URL of the browser to connect to. When configured, puppeteer will skip the browser launch and connect to the browser instance.',
				},
				{
					displayName: 'Emulate Device',
					name: 'device',
					type: 'options',
					description: 'Emulate a specific device.',
					default: '',
					typeOptions: {
						loadOptionsMethod: 'getDevices',
					},
					required: false,
				},
				{
					displayName: 'Executable path',
					name: 'executablePath',
					type: 'string',
					required: false,
					default: '',
					description:
						'A path where Puppeteer expects to find the bundled browser. Has no effect when \'Browser WebSocket Endpoint\' is set.',
				},
				{
					displayName: 'Extra Headers',
					name: 'headers',
					placeholder: 'Add Header',
					type: 'fixedCollection',
					typeOptions: {
						multipleValues: true,
					},
					description: 'The headers to send.',
					default: {},
					options: [
						{
							name: 'parameter',
							displayName: 'Header',
							values: [
								{
									displayName: 'Name',
									name: 'name',
									type: 'string',
									default: '',
									description: 'Name of the header.',
								},
								{
									displayName: 'Value',
									name: 'value',
									type: 'string',
									default: '',
									description: 'Value to set for the header.',
								},
							],
						},
					],
				},
				{
					displayName: 'File Name',
					name: 'fileName',
					type: 'string',
					default: '',
					description: 'File name to set in binary data. Only applies to \'Get PDF\' and \'Get Screenshot\' operations.',
				},
				{
					displayName: 'Launch Arguments',
					name: 'launchArguments',
					placeholder: 'Add Argument',
					type: 'fixedCollection',
					typeOptions: {
						multipleValues: true,
					},
					description:
						'Additional command line arguments to pass to the browser instance. Has no effect when \'Browser WebSocket Endpoint\' is set.',
					default: {},
					options: [
						{
							name: 'args',
							displayName: '',
							values: [
								{
									displayName: 'Argument',
									name: 'arg',
									type: 'string',
									default: '',
									description:
										'The command line argument to pass to the browser instance.',
								},
							],
						},
					],
				},
				{
					displayName: 'Timeout',
					name: 'timeout',
					type: 'number',
					typeOptions: {
						minValue: 0,
					},
					default: 30000,
					description:
						'Maximum navigation time in milliseconds. Pass 0 to disable timeout. Has no effect on the \'Run Custom Script\' operation.',
				},
				{
					displayName: 'Protocol Timeout',
					name: 'protocolTimeout',
					type: 'number',
					typeOptions: {
						minValue: 0,
					},
					default: 30000,
					description:
						'Maximum time in milliseconds to wait for a protocol response. Pass 0 to disable timeout.',
				},
				{
					displayName: 'Wait Until',
					name: 'waitUntil',
					type: 'options',
					options: [
						{
							name: 'load',
							value: 'load',
							description: 'The load event is fired',
						},
						{
							name: 'domcontentloaded',
							value: 'domcontentloaded',
							description: 'The domcontentloaded event is fired',
						},
						{
							name: 'networkidle0',
							value: 'networkidle0',
							description: 'No more than 0 connections for at least 500 ms',
						},
						{
							name: 'networkidle2',
							value: 'networkidle2',
							description: 'No more than 2 connections for at least 500 ms',
						},
					],
					default: 'load',
					description: 'When to consider navigation succeeded. Has no effect on the \'Run Custom Script\' operation.',
				},
				{
					displayName: 'Page Caching',
					name: 'pageCaching',
					type: 'boolean',
					required: false,
					default: true,
					description:
						'Whether to enable page level caching. Defaults to true.',
				},
				{
					displayName: 'Headless mode',
					name: 'headless',
					type: 'boolean',
					required: false,
					default: true,
					description:
						'Whether to run browser in headless mode. Defaults to true.',
				},
				{
					displayName: 'Use Chrome Headless Shell',
					name: 'shell',
					type: 'boolean',
					required: false,
					default: false,
					description:
						'Whether to run browser in headless shell mode. Defaults to false. Headless mode must be enabled. chrome-headless-shell must be in $PATH.',
				},
				{
					displayName: 'Stealth mode',
					name: 'stealth',
					type: 'boolean',
					required: false,
					default: false,
					description:
						'When enabled, applies various techniques to make detection of headless Puppeteer harder.',
				},
				{
					displayName: 'Human typing mode',
					name: 'humanTyping',
					type: 'boolean',
					required: false,
					default: false,
					description:
						'Gives page the function .typeHuman() which "humanizes" the writing of input elements',
				},
				{
					displayName: 'Human Typing Options',
					name: 'humanTypingOptions',
					type: 'collection',
					placeholder: 'Add Option',
					default: {},
					displayOptions: {
						show: {
							humanTyping: [true],
						},
					},
					options: [
						{
							displayName: 'Backspace Maximum Delay (ms)',
							name: 'backspaceMaximumDelayInMs',
							type: 'number',
							required: false,
							default: 750 * 2,
							description: 'Maximum delay for simulating backspaces in milliseconds',
						},
						{
							displayName: 'Backspace Minimum Delay (ms)',
							name: 'backspaceMinimumDelayInMs',
							type: 'number',
							required: false,
							default: 750,
							description: 'Minimum delay for simulating backspaces in milliseconds',
						},
						{
							displayName: 'Maximum Delay (ms)',
							name: 'maximumDelayInMs',
							type: 'number',
							required: false,
							default: 650,
							description: 'Maximum delay between keystrokes in milliseconds',
						},
						{
							displayName: 'Minimum Delay (ms)',
							name: 'minimumDelayInMs',
							type: 'number',
							required: false,
							default: 150,
							description: 'Minimum delay between keystrokes in milliseconds',
						},
						{
							displayName: 'Chance to Keep a Typo (%)',
							name: 'chanceToKeepATypoInPercent',
							type: 'number',
							required: false,
							default: 0,
							description: 'Percentage chance to keep a typo',
						},
						{
							displayName: 'Typo Chance (%)',
							name: 'typoChanceInPercent',
							type: 'number',
							required: false,
							default: 15,
							description: 'Percentage chance to make a typo',
						},
					],
				},
				{
					displayName: 'Proxy Server',
					name: 'proxyServer',
					type: 'string',
					required: false,
					default: '',
					description:
						'This tells Puppeteer to use a custom proxy configuration. Examples: localhost:8080, socks5://localhost:1080, etc.',
				},
				{
					displayName: 'Add Container Arguments',
					name: 'addContainerArgs',
					type: 'boolean',
					default: isRunningInContainer(),
					description: 'Whether to add recommended arguments for container environments (--no-sandbox, --disable-setuid-sandbox, --disable-dev-shm-usage, --disable-gpu)',
					required: false,
				},
			],
		},
	],
};
