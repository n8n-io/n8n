import type { AgentPersonalisation } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { icons as lucide } from '@iconify-json/lucide';
import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';

import { readRgbaPixels, type Rgba } from './png-pixels';
import { renderTeamsAppIcons } from '../teams-app-icons';

vi.mock('node:fs/promises', async (importOriginal) => {
	const actual = await importOriginal<typeof import('node:fs/promises')>();
	return { ...actual, readFile: vi.fn(actual.readFile) };
});

const logger = mockInstance(Logger);

const personalisation = (
	icon: string,
	gradient: Partial<AgentPersonalisation['gradient']> = {},
): AgentPersonalisation => ({
	icon,
	gradient: { from: '#FF0000', to: '#0000FF', angle: 90, fromStop: 0, toStop: 100, ...gradient },
});

async function render(value: AgentPersonalisation | null) {
	const icons = await renderTeamsAppIcons(value);
	if (!icons) throw new Error('expected icons');
	return icons;
}

const pixelsOf = (png: Buffer, size = 192) => {
	const pixels = readRgbaPixels(png);
	return (x: number, y: number): Rgba => pixels[y * size + x];
};

const isWhite = ({ r, g, b, a }: Rgba) => r === 255 && g === 255 && b === 255 && a === 255;

/** The default tolerance allows for rounding in the colour conversions. */
const expectColor = ({ r, g, b }: Rgba, expected: [number, number, number], tolerance = 3) =>
	[r, g, b].forEach((channel, i) =>
		expect(Math.abs(channel - expected[i])).toBeLessThanOrEqual(tolerance),
	);

describe('renderTeamsAppIcons', () => {
	it('draws a 192px colour icon and a 32px outline icon', async () => {
		const { color, outline } = await render(personalisation('bot'));

		expect([color.readUInt32BE(16), color.readUInt32BE(20)]).toEqual([192, 192]);
		expect([outline.readUInt32BE(16), outline.readUInt32BE(20)]).toEqual([32, 32]);
	});

	it('runs the gradient along its angle, from one stop to the other', async () => {
		const pixelAt = pixelsOf((await render(personalisation('bot'))).color);

		// Row 5 is above the glyph, so only the gradient shows there. Edge pixel
		// centres sit half a pixel inside the stops, so they are close but not exact.
		expectColor(pixelAt(0, 5), [255, 0, 0], 10);
		expectColor(pixelAt(191, 5), [0, 0, 255], 10);
	});

	it('holds each end colour outside its stop', async () => {
		const pixelAt = pixelsOf(
			(await render(personalisation('bot', { fromStop: 45, toStop: 55 }))).color,
		);

		expectColor(pixelAt(60, 5), [255, 0, 0]);
		expectColor(pixelAt(130, 5), [0, 0, 255]);
	});

	it('draws the glyph in white over the gradient', async () => {
		// The square's left edge sits at x=3 of 24, inside the glyph area centred on the tile.
		const pixelAt = pixelsOf((await render(personalisation('square'))).color);

		expect(isWhite(pixelAt(52, 96))).toBe(true);
		expect(isWhite(pixelAt(96, 96))).toBe(false);
	});

	it('mixes the gradient in oklch, so complementary colours stay saturated', async () => {
		// Mixed in sRGB, orange and azure meet at a flat grey.
		const { accentColor } = await render(
			personalisation('bot', { from: '#FF8000', to: '#0080FF' }),
		);
		const channels = [1, 3, 5].map((i) => parseInt(accentColor.slice(i, i + 2), 16));

		expect(Math.max(...channels) - Math.min(...channels)).toBeGreaterThan(100);
	});

	it('takes the accent colour from the middle of the tile, after the stops', async () => {
		const accentFor = async (fromStop: number, toStop: number) => {
			const { accentColor } = await render(personalisation('bot', { fromStop, toStop }));
			const [red, , blue] = [1, 3, 5].map((i) => parseInt(accentColor.slice(i, i + 2), 16));
			return { accentColor, red, blue };
		};

		const late = await accentFor(45, 100);
		const even = await accentFor(0, 100);
		const early = await accentFor(0, 55);

		expect(late.red).toBeGreaterThan(late.blue);
		expect(early.blue).toBeGreaterThan(early.red);
		expect(['#FF0000', '#0000FF']).not.toContain(even.accentColor);
	});

	it('draws the outline icon in white and transparency only', async () => {
		const pixels = readRgbaPixels((await render(personalisation('bot'))).outline);

		// Teams rejects a coloured outline icon with InvalidOutlineIconTransparency.
		expect(
			pixels.filter(({ r, g, b, a }) => a > 0 && (r !== 255 || g !== 255 || b !== 255)),
		).toEqual([]);
		expect(pixels.some(({ a }) => a === 255)).toBe(true);
		expect(pixels.some(({ a }) => a === 0)).toBe(true);
	});

	it('draws the default icon when the agent has no personalisation', async () => {
		await expect(renderTeamsAppIcons(null)).resolves.toBeDefined();
	});

	it('returns undefined for an icon name Lucide does not have', async () => {
		await expect(
			renderTeamsAppIcons(personalisation('not-a-lucide-icon')),
		).resolves.toBeUndefined();
	});

	describe('when the icon cannot be drawn', () => {
		const readFileMock = vi.mocked(readFile);

		it('keeps the bundled icons when the icon set cannot be read', async () => {
			readFileMock.mockRejectedValueOnce(new Error('EACCES'));

			await expect(renderTeamsAppIcons(personalisation('bot'))).resolves.toBeUndefined();
			expect(logger.warn).toHaveBeenCalledWith(
				'Could not draw the agent icon for the Teams app',
				expect.objectContaining({ icon: 'bot' }),
			);
		});

		it('keeps the bundled icons when a path uses syntax the renderer does not know', async () => {
			const body = '<path fill="none" stroke="currentColor" d="M0 0X1 1"/>';
			readFileMock.mockResolvedValueOnce(JSON.stringify({ icons: { bot: { body } } }));

			await expect(renderTeamsAppIcons(personalisation('bot'))).resolves.toBeUndefined();
			expect(logger.warn).toHaveBeenCalled();
		});

		it('does not log an icon name Lucide does not have', async () => {
			logger.warn.mockClear();

			await renderTeamsAppIcons(personalisation('not-a-lucide-icon'));

			expect(logger.warn).not.toHaveBeenCalled();
		});
	});

	it('draws every stroked Lucide icon', async () => {
		const missing: string[] = [];
		for (const name of Object.keys(lucide.icons)) {
			const icons = await renderTeamsAppIcons(personalisation(name));
			const drawn = icons && readRgbaPixels(icons.outline).some(({ a }) => a === 255);
			if (!drawn) missing.push(name);
		}

		// The one fill-only icon keeps the bundled icons.
		expect(missing).toEqual(['search-large']);
		// Draws all 1,803 icons, which takes a few seconds.
	}, 30_000);

	it('reads the same Lucide release the editor picker offers', () => {
		// The picker reads Lucide from `@iconify/json`, a separately versioned
		// package. If the two drift, a picked icon falls back to the n8n icons.
		const designSystem = join(__dirname, '../../../../../../../../frontend/@n8n/design-system');
		const editorSet: { lastModified?: number; icons: Record<string, unknown> } = JSON.parse(
			readFileSync(
				createRequire(join(designSystem, 'package.json')).resolve('@iconify/json/json/lucide.json'),
				'utf8',
			),
		);

		expect(lucide.lastModified).toBe(editorSet.lastModified);
		expect(Object.keys(lucide.icons).sort()).toEqual(Object.keys(editorSet.icons).sort());
	});
});
