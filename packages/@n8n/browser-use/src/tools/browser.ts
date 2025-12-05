import puppeteer, {
	type Browser,
	type KeyInput,
	type Page,
	type PuppeteerLifeCycleEvent,
} from 'puppeteer-core';

import type { ToolResult } from '../types.js';
import { BaseTool, ToolError } from './base.js';

const BROWSER_ACTIONS = [
	// Navigation
	'goto',
	'goBack',
	'goForward',
	'reload',
	// Interaction
	'click',
	'type',
	'hover',
	'select',
	'scroll',
	'press',
	// Extraction
	'screenshot',
	'content',
	'text',
	'attribute',
	'evaluate',
	// Wait
	'waitForSelector',
	'waitForNavigation',
	'waitForTimeout',
	// Script
	'script',
] as const;

type BrowserAction = (typeof BROWSER_ACTIONS)[number];

const WAIT_UNTIL_OPTIONS = ['load', 'domcontentloaded', 'networkidle0', 'networkidle2'] as const;

const SCROLL_DIRECTIONS = ['up', 'down', 'left', 'right'] as const;
type ScrollDirection = (typeof SCROLL_DIRECTIONS)[number];

// Type guards
function isBrowserAction(value: unknown): value is BrowserAction {
	return typeof value === 'string' && BROWSER_ACTIONS.includes(value as BrowserAction);
}

function isWaitUntilOption(value: unknown): value is PuppeteerLifeCycleEvent {
	return typeof value === 'string' && WAIT_UNTIL_OPTIONS.includes(value as PuppeteerLifeCycleEvent);
}

function isScrollDirection(value: unknown): value is ScrollDirection {
	return typeof value === 'string' && SCROLL_DIRECTIONS.includes(value as ScrollDirection);
}

function isStringArray(value: unknown): value is string[] {
	return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

interface BrowserToolInput {
	action: BrowserAction;
	// Navigation params
	url?: string;
	waitUntil?: PuppeteerLifeCycleEvent;
	// Selector params
	selector?: string;
	// Interaction params
	text?: string;
	key?: string;
	value?: string | string[];
	// Scroll params
	scrollDirection?: 'up' | 'down' | 'left' | 'right';
	scrollAmount?: number;
	// Extraction params
	attribute?: string;
	// Screenshot params
	fullPage?: boolean;
	// Evaluate/Script params
	script?: string;
	// Wait params
	timeout?: number;
}

const DEFAULT_TIMEOUT = 30000;
const CHROMIUM_PATH = process.env.PUPPETEER_EXECUTABLE_PATH ?? '/usr/bin/chromium';

export class BrowserTool extends BaseTool {
	name = 'browser';

	private browser: Browser | null = null;
	private page: Page | null = null;

	/**
	 * Initialize the browser instance
	 */
	async initialize(): Promise<void> {
		if (this.browser) return;

		console.log(`[${this.name}] Launching browser with executable: ${CHROMIUM_PATH}`);

		this.browser = await puppeteer.launch({
			executablePath: CHROMIUM_PATH,
			headless: true,
			args: [
				'--no-sandbox',
				'--disable-setuid-sandbox',
				'--disable-dev-shm-usage',
				'--disable-gpu',
				'--disable-software-rasterizer',
				'--window-size=1280,800',
			],
		});

		this.page = await this.browser.newPage();
		await this.page.setViewport({ width: 1280, height: 800 });

		console.log(`[${this.name}] Browser initialized`);
	}

	/**
	 * Close the browser instance
	 */
	async close(): Promise<void> {
		if (this.browser) {
			await this.browser.close();
			this.browser = null;
			this.page = null;
			console.log(`[${this.name}] Browser closed`);
		}
	}

	/**
	 * Ensure we have an active page
	 */
	private async ensurePage(): Promise<Page> {
		if (!this.browser) {
			await this.initialize();
		}
		if (!this.page || this.page.isClosed()) {
			this.page = await this.browser!.newPage();
			await this.page.setViewport({ width: 1280, height: 800 });
		}
		return this.page;
	}

	async execute(input: Record<string, unknown>): Promise<ToolResult> {
		if (!isBrowserAction(input.action)) {
			throw new ToolError(`Invalid or missing action: ${String(input.action)}`);
		}

		const params: BrowserToolInput = {
			action: input.action,
			url: typeof input.url === 'string' ? input.url : undefined,
			waitUntil: isWaitUntilOption(input.waitUntil) ? input.waitUntil : undefined,
			selector: typeof input.selector === 'string' ? input.selector : undefined,
			text: typeof input.text === 'string' ? input.text : undefined,
			key: typeof input.key === 'string' ? input.key : undefined,
			value: isStringArray(input.value)
				? input.value
				: typeof input.value === 'string'
					? input.value
					: undefined,
			scrollDirection: isScrollDirection(input.scrollDirection) ? input.scrollDirection : undefined,
			scrollAmount: typeof input.scrollAmount === 'number' ? input.scrollAmount : undefined,
			attribute: typeof input.attribute === 'string' ? input.attribute : undefined,
			fullPage: typeof input.fullPage === 'boolean' ? input.fullPage : undefined,
			script: typeof input.script === 'string' ? input.script : undefined,
			timeout: typeof input.timeout === 'number' ? input.timeout : undefined,
		};
		const { action } = params;

		console.log(`[${this.name}] Executing action: ${action}`, params);

		try {
			const page = await this.ensurePage();

			switch (action) {
				// Navigation
				case 'goto':
					return await this.goto(page, params);
				case 'goBack':
					return await this.goBack(page, params);
				case 'goForward':
					return await this.goForward(page, params);
				case 'reload':
					return await this.reload(page, params);

				// Interaction
				case 'click':
					return await this.click(page, params);
				case 'type':
					return await this.typeText(page, params);
				case 'hover':
					return await this.hover(page, params);
				case 'select':
					return await this.selectOption(page, params);
				case 'scroll':
					return await this.scroll(page, params);
				case 'press':
					return await this.pressKey(page, params);

				// Extraction
				case 'screenshot':
					return await this.takeScreenshot(page, params);
				case 'content':
					return await this.getContent(page);
				case 'text':
					return await this.getText(page, params);
				case 'attribute':
					return await this.getAttribute(page, params);
				case 'evaluate':
					return await this.evaluate(page, params);

				// Wait
				case 'waitForSelector':
					return await this.waitForSelector(page, params);
				case 'waitForNavigation':
					return await this.waitForNavigation(page, params);
				case 'waitForTimeout':
					return await this.waitForTimeout(params);

				// Script
				case 'script':
					return await this.executeScript(params);

				default: {
					const exhaustiveCheck: never = action;
					throw new ToolError(`Unknown action: ${String(exhaustiveCheck)}`);
				}
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			console.error(`[${this.name}] Error executing ${action}:`, errorMessage);
			return { error: errorMessage };
		}
	}

	// Navigation methods
	private async goto(page: Page, params: BrowserToolInput): Promise<ToolResult> {
		if (!params.url) {
			throw new ToolError('URL is required for goto action');
		}

		const response = await page.goto(params.url, {
			waitUntil: params.waitUntil ?? 'load',
			timeout: params.timeout ?? DEFAULT_TIMEOUT,
		});

		const status = response?.status() ?? 'unknown';
		return { output: `Navigated to ${params.url} (status: ${status})` };
	}

	private async goBack(page: Page, params: BrowserToolInput): Promise<ToolResult> {
		const response = await page.goBack({
			waitUntil: params.waitUntil ?? 'load',
			timeout: params.timeout ?? DEFAULT_TIMEOUT,
		});

		if (!response) {
			return { output: 'No previous page in history' };
		}
		return { output: `Navigated back to ${page.url()}` };
	}

	private async goForward(page: Page, params: BrowserToolInput): Promise<ToolResult> {
		const response = await page.goForward({
			waitUntil: params.waitUntil ?? 'load',
			timeout: params.timeout ?? DEFAULT_TIMEOUT,
		});

		if (!response) {
			return { output: 'No next page in history' };
		}
		return { output: `Navigated forward to ${page.url()}` };
	}

	private async reload(page: Page, params: BrowserToolInput): Promise<ToolResult> {
		await page.reload({
			waitUntil: params.waitUntil ?? 'load',
			timeout: params.timeout ?? DEFAULT_TIMEOUT,
		});
		return { output: `Reloaded page: ${page.url()}` };
	}

	// Interaction methods
	private async click(page: Page, params: BrowserToolInput): Promise<ToolResult> {
		if (!params.selector) {
			throw new ToolError('Selector is required for click action');
		}

		// Wait for element to be available before clicking
		await page.waitForSelector(params.selector, {
			timeout: params.timeout ?? DEFAULT_TIMEOUT,
		});
		await page.click(params.selector);

		return { output: `Clicked element: ${params.selector}` };
	}

	private async typeText(page: Page, params: BrowserToolInput): Promise<ToolResult> {
		if (!params.selector) {
			throw new ToolError('Selector is required for type action');
		}
		if (params.text === undefined) {
			throw new ToolError('Text is required for type action');
		}

		await page.type(params.selector, params.text, {
			delay: 50, // Type with a slight delay for realism
		});

		return { output: `Typed "${params.text}" into ${params.selector}` };
	}

	private async hover(page: Page, params: BrowserToolInput): Promise<ToolResult> {
		if (!params.selector) {
			throw new ToolError('Selector is required for hover action');
		}

		await page.hover(params.selector);
		return { output: `Hovered over element: ${params.selector}` };
	}

	private async selectOption(page: Page, params: BrowserToolInput): Promise<ToolResult> {
		if (!params.selector) {
			throw new ToolError('Selector is required for select action');
		}
		if (!params.value) {
			throw new ToolError('Value is required for select action');
		}

		const values = Array.isArray(params.value) ? params.value : [params.value];
		const selected = await page.select(params.selector, ...values);

		return { output: `Selected values [${selected.join(', ')}] in ${params.selector}` };
	}

	private async scroll(page: Page, params: BrowserToolInput): Promise<ToolResult> {
		const amount = params.scrollAmount ?? 300;
		const direction = params.scrollDirection ?? 'down';

		let deltaX = 0;
		let deltaY = 0;

		switch (direction) {
			case 'up':
				deltaY = -amount;
				break;
			case 'down':
				deltaY = amount;
				break;
			case 'left':
				deltaX = -amount;
				break;
			case 'right':
				deltaX = amount;
				break;
		}

		await page.evaluate(
			(dx, dy) => {
				window.scrollBy(dx, dy);
			},
			deltaX,
			deltaY,
		);

		return { output: `Scrolled ${direction} by ${amount}px` };
	}

	private async pressKey(page: Page, params: BrowserToolInput): Promise<ToolResult> {
		if (!params.key) {
			throw new ToolError('Key is required for press action');
		}

		// Cast key to KeyInput - Puppeteer will validate internally and throw if invalid
		await page.keyboard.press(params.key as KeyInput);
		return { output: `Pressed key: ${params.key}` };
	}

	// Extraction methods
	private async takeScreenshot(page: Page, params: BrowserToolInput): Promise<ToolResult> {
		let screenshotBuffer: Uint8Array;

		if (params.selector) {
			const element = await page.$(params.selector);
			if (!element) {
				throw new ToolError(`Element not found: ${params.selector}`);
			}
			screenshotBuffer = await element.screenshot({ type: 'png' });
		} else {
			screenshotBuffer = await page.screenshot({
				type: 'png',
				fullPage: params.fullPage ?? false,
			});
		}

		const base64Image = Buffer.from(screenshotBuffer).toString('base64');
		return {
			output: params.selector
				? `Screenshot of element: ${params.selector}`
				: params.fullPage
					? 'Full page screenshot captured'
					: 'Viewport screenshot captured',
			base64_image: base64Image,
		};
	}

	private async getContent(page: Page): Promise<ToolResult> {
		const content = await page.content();
		return { output: content };
	}

	private async getText(page: Page, params: BrowserToolInput): Promise<ToolResult> {
		if (!params.selector) {
			// Get all text from body
			const text = await page.evaluate(() => document.body.innerText);
			return { output: text };
		}

		const text = await page.$eval(params.selector, (el): string => {
			if ('innerText' in el) {
				return String(el.innerText);
			}
			return el.textContent ?? '';
		});
		return { output: text };
	}

	private async getAttribute(page: Page, params: BrowserToolInput): Promise<ToolResult> {
		if (!params.selector) {
			throw new ToolError('Selector is required for attribute action');
		}
		if (!params.attribute) {
			throw new ToolError('Attribute name is required for attribute action');
		}

		const value = await page.$eval(
			params.selector,
			(el, attr) => el.getAttribute(attr),
			params.attribute,
		);

		return { output: value ?? '' };
	}

	private async evaluate(page: Page, params: BrowserToolInput): Promise<ToolResult> {
		if (!params.script) {
			throw new ToolError('Script is required for evaluate action');
		}

		// Use page.evaluate with a string expression - Puppeteer handles this safely
		// The Function constructor is necessary here to evaluate user-provided scripts
		const result: unknown = await page.evaluate((scriptCode: string): unknown => {
			// eslint-disable-next-line @typescript-eslint/no-implied-eval
			const fn = new Function(`return (${scriptCode})`) as () => unknown;
			return fn();
		}, params.script);
		return { output: JSON.stringify(result, null, 2) };
	}

	// Wait methods
	private async waitForSelector(page: Page, params: BrowserToolInput): Promise<ToolResult> {
		if (!params.selector) {
			throw new ToolError('Selector is required for waitForSelector action');
		}

		await page.waitForSelector(params.selector, {
			timeout: params.timeout ?? DEFAULT_TIMEOUT,
		});

		return { output: `Element found: ${params.selector}` };
	}

	private async waitForNavigation(page: Page, params: BrowserToolInput): Promise<ToolResult> {
		await page.waitForNavigation({
			waitUntil: params.waitUntil ?? 'load',
			timeout: params.timeout ?? DEFAULT_TIMEOUT,
		});

		return { output: `Navigation completed: ${page.url()}` };
	}

	private async waitForTimeout(params: BrowserToolInput): Promise<ToolResult> {
		const timeout = params.timeout ?? 1000;
		await new Promise((resolve) => setTimeout(resolve, timeout));
		return { output: `Waited for ${timeout}ms` };
	}

	// Script execution
	private async executeScript(params: BrowserToolInput): Promise<ToolResult> {
		if (!params.script) {
			throw new ToolError('Script is required for script action');
		}

		const page = await this.ensurePage();
		const browser = this.browser!;

		// Create an async function that has access to page and browser
		// eslint-disable-next-line @typescript-eslint/no-implied-eval
		const scriptFn = new Function(
			'page',
			'browser',
			`return (async () => { ${params.script} })()`,
		) as (page: Page, browser: Browser) => Promise<unknown>;

		const result = await scriptFn(page, browser);

		if (result === undefined) {
			return { output: 'Script executed successfully' };
		}

		return { output: JSON.stringify(result, null, 2) };
	}
}
