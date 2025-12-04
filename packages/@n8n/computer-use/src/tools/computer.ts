import { BaseTool, ToolError } from './base';
import { ComputerAction, ComputerActionSchema, ToolResult } from '../types';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

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

	private width: number;
	private height: number;
	private displayNum: string;
	private screenshotDelay = 2000; // ms
	private scalingEnabled = true;
	private typingDelayMs = 12;
	private typingGroupSize = 50;

	constructor() {
		super();
		this.width = parseInt(process.env.WIDTH || '1280', 10);
		this.height = parseInt(process.env.HEIGHT || '800', 10);
		this.displayNum = process.env.DISPLAY || ':1';
	}

	async execute(input: Record<string, any>): Promise<ToolResult> {
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
					throw new ToolError(`Unknown action: ${(action as any).action}`);
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
		const outputPath = join(tmpdir(), `screenshot_${Date.now()}.png`);

		try {
			// Use scrot or gnome-screenshot
			const { exitCode } = await this.execCommand('scrot', [outputPath], {
				env: { ...process.env, DISPLAY: this.displayNum },
			});

			if (exitCode !== 0) {
				throw new ToolError('Failed to capture screenshot');
			}

			// Read screenshot as buffer for efficiency
			const imageBuffer = await fs.readFile(outputPath);

			// Scale if needed
			const scaledBuffer = this.scalingEnabled ? await this.scaleImage(imageBuffer) : imageBuffer;

			// Convert to base64
			const base64Image = scaledBuffer.toString('base64');

			// Cleanup
			await fs.unlink(outputPath).catch(() => {});

			return {
				output: message,
				base64_image: base64Image,
			};
		} catch (error) {
			await fs.unlink(outputPath).catch(() => {});
			throw error;
		}
	}

	private async scaleImage(imageBuffer: Buffer): Promise<Buffer> {
		const target = this.getScalingTarget();
		if (!target) {
			return imageBuffer;
		}

		const tmpInput = join(tmpdir(), `scale_input_${Date.now()}.png`);
		const tmpOutput = join(tmpdir(), `scale_output_${Date.now()}.png`);

		try {
			await fs.writeFile(tmpInput, imageBuffer);

			const { exitCode } = await this.execCommand('convert', [
				tmpInput,
				'-resize',
				`${target.width}x${target.height}!`,
				tmpOutput,
			]);

			if (exitCode !== 0) {
				return imageBuffer; // Return original if scaling fails
			}

			const scaledBuffer = await fs.readFile(tmpOutput);

			await fs.unlink(tmpInput).catch(() => {});
			await fs.unlink(tmpOutput).catch(() => {});

			return scaledBuffer;
		} catch (error) {
			await fs.unlink(tmpInput).catch(() => {});
			await fs.unlink(tmpOutput).catch(() => {});
			return imageBuffer;
		}
	}

	private getScalingTarget(): Resolution | null {
		for (const target of Object.values(MAX_SCALING_TARGETS)) {
			if (this.width > target.width || this.height > target.height) {
				return target;
			}
		}
		return null;
	}

	private async getCursorPosition(): Promise<ToolResult> {
		const { stdout, stderr, exitCode } = await this.execCommand(
			'xdotool',
			['getmouselocation', '--shell'],
			{ env: { ...process.env, DISPLAY: this.displayNum } },
		);

		if (exitCode !== 0) {
			throw new ToolError(`Failed to get cursor position: exitCode=${exitCode}, stderr=${stderr}`);
		}

		const lines = stdout.split('\n');
		const x = lines.find((l) => l.startsWith('X='))?.split('=')[1];
		const y = lines.find((l) => l.startsWith('Y='))?.split('=')[1];

		return { output: `X=${x} Y=${y}` };
	}

	private async mouseMove(coordinate: [number, number]): Promise<ToolResult> {
		const [x, y] = this.scaleCoordinates(coordinate);

		const { exitCode, stderr } = await this.execCommand(
			'xdotool',
			['mousemove', '--sync', String(x), String(y)],
			{ env: { ...process.env, DISPLAY: this.displayNum } },
		);

		if (exitCode !== 0) {
			throw new ToolError(`Failed to move mouse: exitCode=${exitCode}, stderr=${stderr}`);
		}

		await this.delay(this.screenshotDelay);
		return this.captureScreenshot(`Moved mouse to (${x}, ${y})`);
	}

	private async click(
		button: 'left_click' | 'right_click' | 'middle_click' | 'double_click' | 'triple_click',
		coordinate?: [number, number],
	): Promise<ToolResult> {
		const buttonMap: Record<string, string[]> = {
			left_click: ['1'],
			right_click: ['3'],
			middle_click: ['2'],
			double_click: ['--repeat', '2', '--delay', '10', '1'],
			triple_click: ['--repeat', '3', '--delay', '10', '1'],
		};

		// xdotool click doesn't support coordinates directly.
		// We need to chain mousemove with click: xdotool mousemove x y click 1
		let args: string[];
		if (coordinate) {
			const [x, y] = this.scaleCoordinates(coordinate);
			// Chain mousemove and click in a single xdotool command
			args = ['mousemove', '--sync', String(x), String(y), 'click', ...buttonMap[button]];
		} else {
			args = ['click', ...buttonMap[button]];
		}

		const { exitCode, stderr } = await this.execCommand('xdotool', args, {
			env: { ...process.env, DISPLAY: this.displayNum },
		});

		if (exitCode !== 0) {
			throw new ToolError(`Failed to perform ${button}: exitCode=${exitCode}, stderr=${stderr}`);
		}

		await this.delay(this.screenshotDelay);
		return this.captureScreenshot(`Performed ${button}`);
	}

	private async drag(coordinate: [number, number]): Promise<ToolResult> {
		const [x, y] = this.scaleCoordinates(coordinate);

		const { exitCode, stderr } = await this.execCommand(
			'xdotool',
			[
				'mousemove',
				'--sync',
				String(x),
				String(y),
				'mousedown',
				'1',
				'mousemove_relative',
				'0',
				'0',
			],
			{ env: { ...process.env, DISPLAY: this.displayNum } },
		);

		if (exitCode !== 0) {
			throw new ToolError(`Failed to drag mouse: exitCode=${exitCode}, stderr=${stderr}`);
		}

		await this.delay(this.screenshotDelay);
		return this.captureScreenshot(`Dragged to (${x}, ${y})`);
	}

	private async mouseDown(): Promise<ToolResult> {
		const { exitCode, stderr } = await this.execCommand('xdotool', ['mousedown', '1'], {
			env: { ...process.env, DISPLAY: this.displayNum },
		});

		if (exitCode !== 0) {
			throw new ToolError(`Failed to press mouse button: exitCode=${exitCode}, stderr=${stderr}`);
		}

		return { output: 'Mouse button pressed' };
	}

	private async mouseUp(): Promise<ToolResult> {
		const { exitCode, stderr } = await this.execCommand('xdotool', ['mouseup', '1'], {
			env: { ...process.env, DISPLAY: this.displayNum },
		});

		if (exitCode !== 0) {
			throw new ToolError(`Failed to release mouse button: exitCode=${exitCode}, stderr=${stderr}`);
		}

		return { output: 'Mouse button released' };
	}

	private async scroll(
		direction?: 'up' | 'down' | 'left' | 'right',
		amount?: number,
		coordinate?: [number, number],
	): Promise<ToolResult> {
		if (coordinate) {
			const [x, y] = this.scaleCoordinates(coordinate);
			await this.execCommand('xdotool', ['mousemove', String(x), String(y)], {
				env: { ...process.env, DISPLAY: this.displayNum },
			});
		}

		const scrollMap: Record<string, string> = {
			up: '4',
			down: '5',
			left: '6',
			right: '7',
		};

		const button = scrollMap[direction || 'down'];
		const scrollAmount = amount || 5;

		const { exitCode, stderr } = await this.execCommand(
			'xdotool',
			['click', '--repeat', String(scrollAmount), button],
			{ env: { ...process.env, DISPLAY: this.displayNum } },
		);

		if (exitCode !== 0) {
			throw new ToolError(`Failed to scroll: exitCode=${exitCode}, stderr=${stderr}`);
		}

		await this.delay(this.screenshotDelay);
		return this.captureScreenshot(`Scrolled ${direction || 'down'} ${scrollAmount} times`);
	}

	private async type(text: string): Promise<ToolResult> {
		// Chunk typing for efficiency
		const chunks = this.chunkString(text, this.typingGroupSize);

		for (const chunk of chunks) {
			const { exitCode, stderr } = await this.execCommand(
				'xdotool',
				['type', '--delay', String(this.typingDelayMs), '--', chunk],
				{ env: { ...process.env, DISPLAY: this.displayNum } },
			);

			if (exitCode !== 0) {
				throw new ToolError(`Failed to type text: exitCode=${exitCode}, stderr=${stderr}`);
			}
		}

		await this.delay(this.screenshotDelay);
		return this.captureScreenshot(`Typed: ${text.slice(0, 50)}${text.length > 50 ? '...' : ''}`);
	}

	private async key(text: string): Promise<ToolResult> {
		const { exitCode, stderr } = await this.execCommand('xdotool', ['key', '--', text], {
			env: { ...process.env, DISPLAY: this.displayNum },
		});

		if (exitCode !== 0) {
			throw new ToolError(`Failed to press key: ${text}, exitCode=${exitCode}, stderr=${stderr}`);
		}

		await this.delay(this.screenshotDelay);
		return this.captureScreenshot(`Pressed key: ${text}`);
	}

	private async holdKey(text: string, duration = 1): Promise<ToolResult> {
		const { exitCode: downCode } = await this.execCommand('xdotool', ['keydown', text], {
			env: { ...process.env, DISPLAY: this.displayNum },
		});

		if (downCode !== 0) {
			throw new ToolError(`Failed to hold key: ${text}`);
		}

		// Hold for duration (in seconds)
		await this.delay(duration * 1000);

		const { exitCode: upCode } = await this.execCommand('xdotool', ['keyup', text], {
			env: { ...process.env, DISPLAY: this.displayNum },
		});

		if (upCode !== 0) {
			throw new ToolError(`Failed to release key: ${text}`);
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

		const outputPath = join(tmpdir(), `screenshot_${Date.now()}.png`);
		const croppedPath = join(tmpdir(), `cropped_${Date.now()}.png`);

		try {
			// Take screenshot
			await this.execCommand('scrot', [outputPath], {
				env: { ...process.env, DISPLAY: this.displayNum },
			});

			// Crop using ImageMagick
			const { exitCode } = await this.execCommand('convert', [
				outputPath,
				'-crop',
				`${width}x${height}+${x0}+${y0}`,
				croppedPath,
			]);

			if (exitCode !== 0) {
				throw new ToolError('Failed to crop screenshot');
			}

			const imageBuffer = await fs.readFile(croppedPath);
			const base64Image = imageBuffer.toString('base64');

			await fs.unlink(outputPath).catch(() => {});
			await fs.unlink(croppedPath).catch(() => {});

			return {
				output: `Zoomed to region (${x0}, ${y0}) to (${x1}, ${y1})`,
				base64_image: base64Image,
			};
		} catch (error) {
			await fs.unlink(outputPath).catch(() => {});
			await fs.unlink(croppedPath).catch(() => {});
			throw error;
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

		const xScale = this.width / target.width;
		const yScale = this.height / target.height;

		return [Math.round(coordinate[0] * xScale), Math.round(coordinate[1] * yScale)];
	}

	private chunkString(str: string, size: number): string[] {
		const chunks: string[] = [];
		for (let i = 0; i < str.length; i += size) {
			chunks.push(str.slice(i, i + size));
		}
		return chunks;
	}

	private delay(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}
