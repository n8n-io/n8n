import { Monitor } from 'node-screenshots';
import sharp from 'sharp';
import { z } from 'zod';

import type { McpImageContent, ToolContext, ToolDefinition } from '../types';

const screenshotSchema = z.object({
	display: z
		.number()
		.int()
		.optional()
		.describe('Display index (0-based). Defaults to the primary monitor.'),
});

const screenshotRegionSchema = z.object({
	x: z.number().int().describe('Region left position in pixels (absolute screen coordinates)'),
	y: z.number().int().describe('Region top position in pixels (absolute screen coordinates)'),
	width: z.number().int().describe('Region width in pixels'),
	height: z.number().int().describe('Region height in pixels'),
	display: z
		.number()
		.int()
		.optional()
		.describe('Display index (0-based). Defaults to the primary monitor.'),
});

async function toJpeg(
	rawBuffer: Buffer,
	width: number,
	height: number,
	logicalWidth?: number,
	logicalHeight?: number,
): Promise<Buffer> {
	let pipeline = sharp(rawBuffer, { raw: { width, height, channels: 4 } });
	if (logicalWidth && logicalHeight && (width !== logicalWidth || height !== logicalHeight)) {
		pipeline = pipeline.resize(logicalWidth, logicalHeight);
	}
	return await pipeline.jpeg({ quality: 80 }).toBuffer();
}

function getMonitor(displayIndex?: number): Monitor {
	const monitors = Monitor.all();
	if (monitors.length === 0) throw new Error('No monitors available');
	if (displayIndex === undefined || displayIndex === null) {
		return monitors.find((m) => m.isPrimary()) ?? monitors[0];
	}
	const monitor = monitors[displayIndex];
	if (!monitor) {
		throw new Error(`Display index ${displayIndex} out of range (${monitors.length} displays)`);
	}
	return monitor;
}

export const screenshotTool: ToolDefinition<typeof screenshotSchema, McpImageContent> = {
	name: 'screen_screenshot',
	description: 'Capture a screenshot of the full screen and return it as a base64-encoded JPEG',
	inputSchema: screenshotSchema,
	annotations: { defaultPermission: 'allow', readOnly: true },
	async execute({ display }: z.infer<typeof screenshotSchema>, _context: ToolContext) {
		const monitor = getMonitor(display);
		const image = await monitor.captureImage();
		const rawBuffer = await image.toRaw();
		const jpegBuffer = await toJpeg(
			rawBuffer,
			image.width,
			image.height,
			monitor.width(),
			monitor.height(),
		);
		return {
			content: [
				{
					type: 'media' as const,
					data: jpegBuffer.toString('base64'),
					mediaType: 'image/jpeg',
				},
			],
		};
	},
};

export const screenshotRegionTool: ToolDefinition<typeof screenshotRegionSchema, McpImageContent> =
	{
		name: 'screen_screenshot_region',
		description: 'Capture a specific region of the screen and return it as a base64-encoded JPEG',
		inputSchema: screenshotRegionSchema,
		annotations: { defaultPermission: 'allow', readOnly: true },
		async execute(
			{ x, y, width, height, display }: z.infer<typeof screenshotRegionSchema>,
			_context: ToolContext,
		) {
			const monitor = getMonitor(display);
			const image = await monitor.captureImage();
			const scaleFactor = monitor.scaleFactor();

			// Inputs are in logical pixels (same space as robotjs / mouse tools).
			// Translate to monitor-relative logical coords, then scale to physical pixels for the crop.
			const logicalRelX = Math.max(0, x - monitor.x());
			const logicalRelY = Math.max(0, y - monitor.y());
			const logicalClampedW = Math.min(width, monitor.width() - logicalRelX);
			const logicalClampedH = Math.min(height, monitor.height() - logicalRelY);

			const physRelX = Math.round(logicalRelX * scaleFactor);
			const physRelY = Math.round(logicalRelY * scaleFactor);
			const physW = Math.round(logicalClampedW * scaleFactor);
			const physH = Math.round(logicalClampedH * scaleFactor);

			const cropped = await image.crop(physRelX, physRelY, physW, physH);
			const rawBuffer = await cropped.toRaw();
			// Resize back to logical dimensions so model coordinates stay consistent
			const jpegBuffer = await toJpeg(
				rawBuffer,
				cropped.width,
				cropped.height,
				logicalClampedW,
				logicalClampedH,
			);

			return {
				content: [
					{
						type: 'media' as const,
						data: jpegBuffer.toString('base64'),
						mediaType: 'image/jpeg',
					},
				],
			};
		},
	};
