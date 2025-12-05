import { BaseTool, ToolError } from './base';
import { ComputerAction, ComputerActionSchema, ToolResult } from '../types';
import { VncClient, PointerButton, parseKeySpec, textToKeysyms } from '../vnc';

interface Resolution {
	width: number;
	height: number;
}

const MAX_SCALING_TARGETS: Record<string, Resolution> = {
	XGA: { width: 1024, height: 768 }, // 4:3
	WXGA: { width: 1280, height: 800 }, // 16:10
	FWXGA: { width: 1366, height: 768 }, // ~16:9
};

export class ComputerTool extends BaseTool {
	name = 'computer';

	private vncClient: VncClient;
	private screenshotDelay = 2000; // ms
	private scalingEnabled = true;
	private typingDelayMs = 12;
	private clickDelayMs = 50;

	constructor() {
		super();
		this.vncClient = VncClient.getInstance();
	}

	async execute(input: Record<string, unknown>): Promise<ToolResult> {
		const validated = ComputerActionSchema.parse(input);
		return this.handleAction(validated);
	}

	private async handleAction(action: ComputerAction): Promise<ToolResult> {
		try {
			switch (action.action) {
				case 'screenshot':
					return await this.screenshot();

				case 'cursor_position':
					return await this.getCursorPosition();

				case 'mouse_move':
					return await this.mouseMove(action.coordinate);

				case 'left_click':
					return await this.click('left_click', action.coordinate);

				case 'right_click':
					return await this.click('right_click', action.coordinate);

				case 'middle_click':
					return await this.click('middle_click', action.coordinate);

				case 'double_click':
					return await this.click('double_click', action.coordinate);

				case 'triple_click':
					return await this.click('triple_click', action.coordinate);

				case 'left_click_drag':
					return await this.drag(action.coordinate);

				case 'left_mouse_down':
					return await this.mouseDown();

				case 'left_mouse_up':
					return await this.mouseUp();

				case 'scroll':
					return await this.scroll(
						action.scroll_direction,
						action.scroll_amount,
						action.coordinate,
					);

				case 'type':
					return await this.type(action.text);

				case 'key':
					return await this.key(action.text);

				case 'hold_key':
					return await this.holdKey(action.text, action.duration);

				case 'wait':
					return await this.wait(action.duration);

				case 'zoom':
					return await this.zoom(action.region);

				default:
					throw new ToolError(`Unknown action: ${(action as { action: string }).action}`);
			}
		} catch (error) {
			if (error instanceof ToolError) {
				return { error: error.message };
			}
			return { error: `Computer tool error: ${error}` };
		}
	}

	private async screenshot(): Promise<ToolResult> {
		return this.captureScreenshot('Screenshot captured');
	}

	/**
	 * Capture a screenshot and return it as base64
	 * Used by screenshot action and to return screenshots after other actions
	 */
	private async captureScreenshot(message: string): Promise<ToolResult> {
		try {
			let pngBuffer: Buffer;

			// Scale if needed
			const target = this.getScalingTarget();
			if (this.scalingEnabled && target) {
				pngBuffer = await this.vncClient.captureScreenshotScaled(target.width, target.height);
			} else {
				pngBuffer = await this.vncClient.captureScreenshot();
			}

			const base64Image = pngBuffer.toString('base64');

			return {
				output: message,
				base64_image: base64Image,
			};
		} catch (error) {
			throw new ToolError(`Failed to capture screenshot: ${error}`);
		}
	}

	private getScalingTarget(): Resolution | null {
		const width = this.vncClient.framebufferWidth;
		const height = this.vncClient.framebufferHeight;

		for (const target of Object.values(MAX_SCALING_TARGETS)) {
			if (width > target.width || height > target.height) {
				return target;
			}
		}
		return null;
	}

	private async getCursorPosition(): Promise<ToolResult> {
		const pos = this.vncClient.getCursorPosition();
		return { output: `X=${pos.x} Y=${pos.y}` };
	}

	private async mouseMove(coordinate: [number, number]): Promise<ToolResult> {
		const [x, y] = this.scaleCoordinates(coordinate);

		await this.vncClient.sendPointerEvent(x, y, PointerButton.NONE);

		await this.delay(this.screenshotDelay);
		return this.captureScreenshot(`Moved mouse to (${x}, ${y})`);
	}

	private async click(
		button: 'left_click' | 'right_click' | 'middle_click' | 'double_click' | 'triple_click',
		coordinate?: [number, number],
	): Promise<ToolResult> {
		const buttonMaskMap: Record<string, number> = {
			left_click: PointerButton.LEFT,
			right_click: PointerButton.RIGHT,
			middle_click: PointerButton.MIDDLE,
			double_click: PointerButton.LEFT,
			triple_click: PointerButton.LEFT,
		};

		const buttonMask = buttonMaskMap[button];
		const clickCount = button === 'double_click' ? 2 : button === 'triple_click' ? 3 : 1;

		// Move to coordinate if specified
		if (coordinate) {
			const [x, y] = this.scaleCoordinates(coordinate);
			await this.vncClient.sendPointerEvent(x, y, PointerButton.NONE);
		}

		// Get current position for the click
		const pos = this.vncClient.getCursorPosition();

		// Perform clicks
		for (let i = 0; i < clickCount; i++) {
			// Button down
			await this.vncClient.sendPointerEvent(pos.x, pos.y, buttonMask);
			await this.delay(this.clickDelayMs);
			// Button up
			await this.vncClient.sendPointerEvent(pos.x, pos.y, PointerButton.NONE);

			if (i < clickCount - 1) {
				await this.delay(this.clickDelayMs);
			}
		}

		await this.delay(this.screenshotDelay);
		return this.captureScreenshot(`Performed ${button}`);
	}

	private async drag(coordinate: [number, number]): Promise<ToolResult> {
		const [x, y] = this.scaleCoordinates(coordinate);
		const startPos = this.vncClient.getCursorPosition();

		// Press button at current position
		await this.vncClient.sendPointerEvent(startPos.x, startPos.y, PointerButton.LEFT);
		await this.delay(this.clickDelayMs);

		// Move to target position while holding button
		await this.vncClient.sendPointerEvent(x, y, PointerButton.LEFT);
		await this.delay(this.clickDelayMs);

		// Release button
		await this.vncClient.sendPointerEvent(x, y, PointerButton.NONE);

		await this.delay(this.screenshotDelay);
		return this.captureScreenshot(`Dragged to (${x}, ${y})`);
	}

	private async mouseDown(): Promise<ToolResult> {
		const pos = this.vncClient.getCursorPosition();
		await this.vncClient.sendPointerEvent(pos.x, pos.y, PointerButton.LEFT);
		return { output: 'Mouse button pressed' };
	}

	private async mouseUp(): Promise<ToolResult> {
		const pos = this.vncClient.getCursorPosition();
		await this.vncClient.sendPointerEvent(pos.x, pos.y, PointerButton.NONE);
		return { output: 'Mouse button released' };
	}

	private async scroll(
		direction?: 'up' | 'down' | 'left' | 'right',
		amount?: number,
		coordinate?: [number, number],
	): Promise<ToolResult> {
		// Move to coordinate if specified
		if (coordinate) {
			const [x, y] = this.scaleCoordinates(coordinate);
			await this.vncClient.sendPointerEvent(x, y, PointerButton.NONE);
		}

		const scrollButtonMap: Record<string, number> = {
			up: PointerButton.SCROLL_UP,
			down: PointerButton.SCROLL_DOWN,
			left: PointerButton.SCROLL_LEFT,
			right: PointerButton.SCROLL_RIGHT,
		};

		const scrollButton = scrollButtonMap[direction ?? 'down'];
		const scrollAmount = amount ?? 5;
		const pos = this.vncClient.getCursorPosition();

		// Simulate scroll by pressing/releasing scroll button multiple times
		for (let i = 0; i < scrollAmount; i++) {
			// Button down
			await this.vncClient.sendPointerEvent(pos.x, pos.y, scrollButton);
			// Button up
			await this.vncClient.sendPointerEvent(pos.x, pos.y, PointerButton.NONE);
		}

		await this.delay(this.screenshotDelay);
		return this.captureScreenshot(`Scrolled ${direction ?? 'down'} ${scrollAmount} times`);
	}

	private async type(text: string): Promise<ToolResult> {
		const keysyms = textToKeysyms(text);

		for (const keysym of keysyms) {
			// Key down
			await this.vncClient.sendKeyEvent(keysym, true);
			await this.delay(this.typingDelayMs);
			// Key up
			await this.vncClient.sendKeyEvent(keysym, false);
		}

		await this.delay(this.screenshotDelay);
		return this.captureScreenshot(`Typed: ${text.slice(0, 50)}${text.length > 50 ? '...' : ''}`);
	}

	private async key(text: string): Promise<ToolResult> {
		const parsed = parseKeySpec(text);

		// Press modifiers
		for (const modifier of parsed.modifiers) {
			await this.vncClient.sendKeyEvent(modifier, true);
		}

		// Press main key
		await this.vncClient.sendKeyEvent(parsed.keysym, true);
		await this.delay(this.clickDelayMs);
		await this.vncClient.sendKeyEvent(parsed.keysym, false);

		// Release modifiers (in reverse order)
		for (let i = parsed.modifiers.length - 1; i >= 0; i--) {
			await this.vncClient.sendKeyEvent(parsed.modifiers[i], false);
		}

		await this.delay(this.screenshotDelay);
		return this.captureScreenshot(`Pressed key: ${text}`);
	}

	private async holdKey(text: string, duration = 1): Promise<ToolResult> {
		const parsed = parseKeySpec(text);

		// Press modifiers
		for (const modifier of parsed.modifiers) {
			await this.vncClient.sendKeyEvent(modifier, true);
		}

		// Press and hold main key
		await this.vncClient.sendKeyEvent(parsed.keysym, true);

		// Hold for duration (in seconds)
		await this.delay(duration * 1000);

		// Release main key
		await this.vncClient.sendKeyEvent(parsed.keysym, false);

		// Release modifiers (in reverse order)
		for (let i = parsed.modifiers.length - 1; i >= 0; i--) {
			await this.vncClient.sendKeyEvent(parsed.modifiers[i], false);
		}

		return this.captureScreenshot(`Held key ${text} for ${duration}s`);
	}

	private async wait(duration: number): Promise<ToolResult> {
		// Duration is in seconds (0-100)
		await this.delay(duration * 1000);
		return this.captureScreenshot(`Waited ${duration}s`);
	}

	private async zoom(region: [number, number, number, number]): Promise<ToolResult> {
		const [x0, y0, x1, y1] = region.map((c) => Math.round(c));
		const width = x1 - x0;
		const height = y1 - y0;

		try {
			const pngBuffer = await this.vncClient.captureRegion(x0, y0, width, height);
			const base64Image = pngBuffer.toString('base64');

			return {
				output: `Zoomed to region (${x0}, ${y0}) to (${x1}, ${y1})`,
				base64_image: base64Image,
			};
		} catch (error) {
			throw new ToolError(`Failed to capture region: ${error}`);
		}
	}

	private scaleCoordinates(coordinate: [number, number]): [number, number] {
		if (!this.scalingEnabled) {
			return coordinate;
		}

		const target = this.getScalingTarget();
		if (!target) {
			return coordinate;
		}

		const width = this.vncClient.framebufferWidth;
		const height = this.vncClient.framebufferHeight;

		const xScale = width / target.width;
		const yScale = height / target.height;

		return [Math.round(coordinate[0] * xScale), Math.round(coordinate[1] * yScale)];
	}

	private delay(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}
