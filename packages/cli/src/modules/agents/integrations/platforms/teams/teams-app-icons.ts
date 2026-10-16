import { resolveAgentPersonalisation, type AgentPersonalisation } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import { oklchMixer, rgbToHex, type Rgb } from '@n8n/utils/color/oklch';
import { isRecord } from '@n8n/utils/is-record';
import { runSerially } from '@n8n/utils/run-serially';
import { UnexpectedError } from 'n8n-workflow';
import { Worker, type ResourceLimits } from 'node:worker_threads';

/**
 * Draws the agent's personalisation icon as the two PNGs a Teams app package
 * needs: the Lucide glyph on the agent's gradient, built as SVG here and
 * rasterised by resvg in a worker thread.
 *
 * The worker keeps resvg's wasm memory out of the main isolate, which would
 * hold it for the life of the process. The process keeps a flat high-water
 * mark instead: about 12 MB of container memory, measured over 20 renders in
 * the Alpine image. Memory a terminated worker freed returns to the
 * allocator, not to the system, and the next worker reuses it.
 */

export interface TeamsAppIcons {
	/** 192×192, full bleed: Teams rounds the corners itself. */
	color: Buffer;
	/** 32×32, white on transparent: Teams rejects any other colour. */
	outline: Buffer;
	accentColor: string;
}

interface IconSvgs {
	color: string;
	outline: string;
	accentColor: string;
}

const COLOR_SIZE = 192;
const OUTLINE_SIZE = 32;
/** The glyph share of the tile in `AgentPersonalisationIcon.vue`. */
const GLYPH_RATIO = 0.6;
/** SVG gradients mix in sRGB, so the oklch path is sampled into this many stops. */
const GRADIENT_STOPS = 16;
/** Counted from when the worker runs, so a slow worker start does not use it up. */
const RENDER_TIMEOUT_MS = 5_000;
const WORKER_LIMITS: ResourceLimits = {
	maxYoungGenerationSizeMb: 2,
	maxOldGenerationSizeMb: 16,
	codeRangeSizeMb: 8,
	stackSizeMb: 1,
};

type Gradient = AgentPersonalisation['gradient'];

const renders = new Map<string, Promise<unknown>>();

/** Returns undefined for an icon that cannot be drawn, so the caller keeps the bundled icons. */
export async function renderTeamsAppIcons(
	personalisation?: AgentPersonalisation | null,
): Promise<TeamsAppIcons | undefined> {
	const { icon, gradient } = resolveAgentPersonalisation(personalisation);
	try {
		const svgs = await buildTeamsIconSvgs(icon, gradient);
		if (!svgs) return undefined;

		// Downloads at the same time would otherwise each hold a worker and its wasm memory.
		const { color, outline } = await runSerially(
			renders,
			'teams-app-icons',
			async () => await rasterise(svgs),
		);
		return { color, outline, accentColor: svgs.accentColor };
	} catch (error) {
		// Rendering is optional: the package is still valid with the bundled icons.
		Container.get(Logger).warn('Could not draw the agent icon for the Teams app', {
			icon,
			error,
		});
		return undefined;
	}
}

/** Returns undefined for an icon name Lucide does not have. */
export async function buildTeamsIconSvgs(
	iconName: string,
	gradient: Gradient,
): Promise<IconSvgs | undefined> {
	// Loaded once and cached. Parsing the set again on each call grows the V8
	// heap far more than the parsed set costs to keep.
	const { icons: lucide } = await import('@iconify-json/lucide');
	// Aliases are skipped, as the editor's icon loader skips them.
	if (!Object.hasOwn(lucide.icons, iconName)) return undefined;
	const icon = lucide.icons[iconName];
	const viewBox = `0 0 ${icon.width ?? lucide.width ?? 24} ${icon.height ?? lucide.height ?? 24}`;
	const glyph = icon.body.replaceAll('currentColor', '#FFFFFF');

	// Mixed in oklch, as the editor does: random agent gradients pair
	// complementary hues, which sRGB mixing would turn grey in the middle.
	const colorAt = oklchMixer(gradient.from, gradient.to);
	const glyphSize = COLOR_SIZE * GLYPH_RATIO;
	const offset = (COLOR_SIZE - glyphSize) / 2;

	return {
		color: svg(
			COLOR_SIZE,
			`0 0 ${COLOR_SIZE} ${COLOR_SIZE}`,
			`${gradientDefinition(gradient, colorAt)}<rect width="${COLOR_SIZE}" height="${COLOR_SIZE}" fill="url(#g)"/>` +
				`<svg x="${offset}" y="${offset}" width="${glyphSize}" height="${glyphSize}" viewBox="${viewBox}">${glyph}</svg>`,
		),
		outline: svg(OUTLINE_SIZE, viewBox, glyph),
		accentColor: rgbToHex(colorAt(stopProgress(gradient, 0.5))),
	};
}

function svg(size: number, viewBox: string, content: string): string {
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${viewBox}">${content}</svg>`;
}

/**
 * CSS angles point up at 0deg and turn clockwise, and the gradient line is
 * long enough that the stops land exactly on the corners. `pad` holds the end
 * colours outside the stops, as CSS does.
 */
function gradientDefinition(gradient: Gradient, colorAt: (progress: number) => Rgb): string {
	const radians = (gradient.angle * Math.PI) / 180;
	const [ux, uy] = [Math.sin(radians), -Math.cos(radians)];
	const half = (COLOR_SIZE * (Math.abs(ux) + Math.abs(uy))) / 2;
	const centre = COLOR_SIZE / 2;
	const stops = Array.from({ length: GRADIENT_STOPS + 1 }, (_, i) => {
		const progress = i / GRADIENT_STOPS;
		const offset = (gradient.fromStop + (gradient.toStop - gradient.fromStop) * progress) / 100;
		return `<stop offset="${offset}" stop-color="${rgbToHex(colorAt(progress))}"/>`;
	}).join('');
	return (
		'<defs><linearGradient id="g" gradientUnits="userSpaceOnUse" spreadMethod="pad" ' +
		`x1="${centre - ux * half}" y1="${centre - uy * half}" x2="${centre + ux * half}" y2="${centre + uy * half}">` +
		`${stops}</linearGradient></defs>`
	);
}

/** Where a point at `position` (0..1 along the gradient line) falls between the two stops. */
function stopProgress({ fromStop, toStop }: Gradient, position: number): number {
	return Math.max(0, Math.min(1, (position - fromStop / 100) / ((toStop - fromStop) / 100)));
}

// Inline, so no separate worker file has to ship or be built for tests. The
// module paths are resolved here, because eval'd code cannot resolve them.
const WORKER_SOURCE = `
const { parentPort, workerData } = require('node:worker_threads');
const { readFileSync } = require('node:fs');
const { initWasm, Resvg } = require(workerData.modulePath);
initWasm(readFileSync(workerData.wasmPath)).then(() => {
	const render = (svg) => {
		const image = new Resvg(svg).render();
		const png = image.asPng();
		image.free();
		return png;
	};
	parentPort.postMessage({ color: render(workerData.color), outline: render(workerData.outline) });
});
`;

async function rasterise(svgs: IconSvgs): Promise<Pick<TeamsAppIcons, 'color' | 'outline'>> {
	const worker = new Worker(WORKER_SOURCE, {
		eval: true,
		resourceLimits: WORKER_LIMITS,
		workerData: {
			modulePath: require.resolve('@resvg/resvg-wasm'),
			wasmPath: require.resolve('@resvg/resvg-wasm/index_bg.wasm'),
			color: svgs.color,
			outline: svgs.outline,
		},
	});
	try {
		const result = await new Promise<unknown>((resolve, reject) => {
			let timer: NodeJS.Timeout | undefined;
			worker.once('online', () => {
				timer = setTimeout(
					() => reject(new UnexpectedError('Rendering the Teams app icons timed out')),
					RENDER_TIMEOUT_MS,
				);
			});
			worker.once('message', (message) => {
				clearTimeout(timer);
				resolve(message);
			});
			worker.once('error', (error) => {
				clearTimeout(timer);
				reject(error);
			});
			// A clean exit can arrive right after the message; only a failure decides here.
			worker.once('exit', (code) => {
				if (code === 0) return;
				clearTimeout(timer);
				reject(new UnexpectedError(`The icon renderer exited with code ${code}`));
			});
		});
		if (
			!isRecord(result) ||
			!(result.color instanceof Uint8Array) ||
			!(result.outline instanceof Uint8Array)
		) {
			throw new UnexpectedError('The icon renderer returned no images');
		}
		return { color: Buffer.from(result.color), outline: Buffer.from(result.outline) };
	} finally {
		await worker.terminate();
	}
}
