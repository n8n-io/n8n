import { PROP_LAYOUT, SHIMMER, ZOOM } from '../aquarium.constants';
import {
	isPropDead,
	layoutProps,
	tankFailureShare,
	tankHealthOf,
	tankScaleOf,
	type PlacedProp,
	type TankHealth,
} from '../decor/decor';
import type { PropDefinition } from '../decor/props';
import { hashString } from '../species/species.registry';
import type { PixelSprite } from '../species/species.types';
import type { Camera, Size } from './camera';
import { getEffect } from './effects';
import { FRAME_THICKNESS, paintFrame } from './frames';
import type { TankRegion } from './layout';
import { frameIndexOf, isAsleep, isResting, type Creature, type TankBounds } from './simulation';
import { GLITCH_STAGES, glitchStageAt, shimmerProgressAt } from './glitch';
import { toFaded } from './faded';
import { toSkeleton } from './skeleton';

/**
 * Water from the surface down, for each tank health. Neutral is the "water shallows" palette.
 * Positive is more saturated, Negative is murky green and Critical is dark and gloomy.
 */
const WATER: Record<TankHealth, readonly string[]> = {
	positive: ['#12c3db', '#0c86db', '#055566'],
	neutral: ['#0aa5bd', '#0b76bd', '#04454f'],
	negative: ['#4b9a7c', '#36745f', '#1f4a3e'],
	critical: ['#0f3b40', '#0a2629', '#011113'],
};
/** 4x4 ordered dither, so the water fades between palette colours and keeps crisp pixels. */
const BAYER_4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
/** Above 1, the light water reaches deeper before it turns dark. */
const WATER_DEPTH_CURVE = 1.6;
/** Sun through the surface: diagonal bands from the top left that fade with depth. */
const LIGHT_RAYS = {
	/** Left edge of each ray at the surface, and its width, as shares of the tank width. */
	rays: [
		{ at: 0.06, width: 0.035 },
		{ at: 0.13, width: 0.055 },
		{ at: 0.22, width: 0.025 },
	],
	/** Pixels to the right for each pixel down. */
	slope: 0.55,
	alpha: 0.2,
	/** Alpha steps, so the fade is banded like the dithered water, not smooth. */
	steps: 4,
	pulseSeconds: 9,
	/** Opacity lost for each tank scale step, so big tanks keep the light in the background. */
	fadePerScale: 0.12,
} as const;
/** The sun fades as a tank fails. */
const RAY_STRENGTH: Record<TankHealth, number> = {
	positive: 1,
	neutral: 0.75,
	negative: 0.35,
	critical: 0.08,
};
/** Pixels of foam above the surface crest at rest. */
const SURFACE_DEPTH = 2;
/** The moving line at the top of the water: lively when healthy, flat and dim when failing. */
const SURFACE: Record<TankHealth, { crest: string; foam: string; calm: number }> = {
	positive: { crest: 'rgba(255, 255, 255, 0.9)', foam: 'rgba(186, 239, 238, 0.4)', calm: 1 },
	neutral: { crest: 'rgba(255, 255, 255, 0.8)', foam: 'rgba(186, 239, 238, 0.35)', calm: 1 },
	negative: { crest: 'rgba(200, 220, 190, 0.55)', foam: 'rgba(150, 180, 150, 0.25)', calm: 0.6 },
	critical: { crest: 'rgba(140, 160, 150, 0.35)', foam: 'rgba(90, 110, 100, 0.2)', calm: 0.3 },
};

type Rgb = [number, number, number];

function rgbOf(hex: string): Rgb {
	return [
		parseInt(hex.slice(1, 3), 16),
		parseInt(hex.slice(3, 5), 16),
		parseInt(hex.slice(5, 7), 16),
	];
}

/**
 * Two slow waves of different lengths, so the crest never repeats the same shape. `calm` below
 * 1 makes the waves lower and slower.
 */
function surfaceCrestAt(x: number, time: number, calm: number): number {
	const wave =
		Math.sin(x * 0.19 + time * 1.4 * calm) * 1.1 + Math.sin(x * 0.053 - time * 0.7 * calm) * 1.2;
	return Math.round(SURFACE_DEPTH + wave * calm);
}

const SAND: Record<TankHealth, { base: string; speck: string; light: string }> = {
	positive: { base: '#e3c585', speck: '#c9a562', light: '#f2dca5' },
	neutral: { base: '#d9bd7f', speck: '#c2a160', light: '#ead29b' },
	negative: { base: '#b5a874', speck: '#978a5a', light: '#c7bb88' },
	critical: { base: '#4f4a3d', speck: '#3c382e', light: '#615b4b' },
};
const SEAWEED = ['#2f8f4e', '#3fa65c', '#267a42'];
const AMBIENT_BUBBLE = 'rgba(220, 240, 255, 0.6)';
/** Fills the view outside the tanks: the wall between project tanks, and space around the world. */
const OUTSIDE_WORLD = '#011113';
/** Logical pixels of world width for each column of ambient bubbles. */
const BUBBLE_COLUMN_SPACING = 80;
/** Extra pixels around the view, so effects and highlights at the edge still draw. */
const CULL_MARGIN = 16;
const HIGHLIGHT = '#ffffff';
const TINT_ALPHA = 0.65;

interface Plant {
	x: number;
	height: number;
	color: string;
	phase: number;
	/** Pixel multiplier: big tanks draw thicker plants. */
	scale: number;
}

function createCanvas(width: number, height: number): HTMLCanvasElement {
	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	return canvas;
}

function context2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('Canvas 2D is not available');
	ctx.imageSmoothingEnabled = false;
	return ctx;
}

/**
 * Draws the part of the world that the camera shows. CSS scales the canvas to the element. Zoomed
 * in, one canvas pixel is one logical pixel. Zoomed out, one canvas pixel is one device pixel and
 * the renderer scales the drawing. See `canvasResolutionFor()`.
 */
export class AquariumRenderer {
	private readonly ctx: CanvasRenderingContext2D;

	private readonly spriteCache = new Map<string, HTMLCanvasElement[]>();

	/** Keyed by tank size, so tanks of the same size share one background. */
	private readonly backgrounds = new Map<string, HTMLCanvasElement>();

	/** Light rays, keyed by tank size like the backgrounds. Drawn each frame with a slow pulse. */
	private readonly lightRays = new Map<string, HTMLCanvasElement>();

	private readonly plantsByTank = new Map<string, Plant[]>();

	/** Keyed by tank, size and health. Used when the zoom is below `ZOOM.detail`. */
	private readonly stillOverlays = new Map<string, HTMLCanvasElement>();

	private readonly propsByTank = new Map<string, PlacedProp[]>();

	/** Bone versions of the species sprites, made the first time a species dies. */
	private readonly skeletons = new Map<string, PixelSprite>();

	/** Washed-out versions of the species sprites, for creatures that stand still. */
	private readonly fadedSprites = new Map<string, PixelSprite>();

	/** Keyed by sprite, so a frame finds a prop image with no string keys. */
	private readonly propImages = new WeakMap<PixelSprite, HTMLCanvasElement>();

	/** Painted once for each tank, because frame noise and colours differ for each tank. */
	private readonly framesByTank = new Map<string, HTMLCanvasElement>();

	private regions: TankRegion[] = [];

	/** Canvas pixels for each logical pixel. See `canvasResolutionFor()`. */
	private resolution = 1;

	/** CSS pixels for each logical pixel of the zoomed-out water. 0 until the first zoomed-out frame. */
	private waterScale = 0;

	private lastZoom = 0;

	private zoomChangedAt = 0;

	constructor(private readonly canvas: HTMLCanvasElement) {
		this.ctx = context2d(canvas);
	}

	/**
	 * Sets the visible area in logical pixels, and the canvas pixels for each logical pixel. Call it
	 * when the zoom or the element size changes.
	 */
	setViewSize(size: Size, resolution = 1): void {
		this.resolution = resolution;
		const width = Math.max(1, Math.round(size.width * resolution));
		const height = Math.max(1, Math.round(size.height * resolution));
		if (this.canvas.width === width && this.canvas.height === height) return;
		this.canvas.width = width;
		this.canvas.height = height;
		this.ctx.imageSmoothingEnabled = false;
	}

	setRegions(regions: TankRegion[]): void {
		this.regions = regions;
		const sizeKeys = new Set<string>();
		const tankIds = new Set<string>();
		for (const region of regions) {
			const key = `${region.bounds.width}x${region.bounds.height}`;
			sizeKeys.add(key);
			tankIds.add(region.id);
			if (!this.lightRays.has(key)) this.lightRays.set(key, this.drawLightRays(region.bounds));
			this.plantsByTank.set(region.id, this.layoutPlants(region.bounds, region.id));
			this.propsByTank.set(region.id, layoutProps(region.bounds, region.id));

			const frameKey = `${region.id}|${region.frame}|${key}`;
			const frame = this.framesByTank.get(frameKey);
			if (!frame) {
				const painted = paintFrame({ style: region.frame, ...region.bounds, seed: region.id });
				if (painted) this.framesByTank.set(frameKey, painted);
			}
			tankIds.add(frameKey);
		}
		for (const key of this.backgrounds.keys())
			if (!sizeKeys.has(key.slice(0, key.indexOf('|')))) this.backgrounds.delete(key);
		for (const key of this.lightRays.keys()) if (!sizeKeys.has(key)) this.lightRays.delete(key);
		for (const id of this.plantsByTank.keys()) if (!tankIds.has(id)) this.plantsByTank.delete(id);
		for (const id of this.propsByTank.keys()) if (!tankIds.has(id)) this.propsByTank.delete(id);
		for (const key of this.framesByTank.keys())
			if (!tankIds.has(key)) this.framesByTank.delete(key);
		for (const key of this.stillOverlays.keys()) {
			const [id, size] = key.split('|');
			if (!tankIds.has(id) || !sizeKeys.has(size)) this.stillOverlays.delete(key);
		}
	}

	render(
		creaturesByTank: Map<string, Creature[]>,
		camera: Camera,
		time: number,
		highlightKey?: string,
	): void {
		const ctx = this.ctx;
		const left = Math.round(camera.x);
		const top = Math.round(camera.y);
		const right = left + this.canvas.width / this.resolution;
		const bottom = top + this.canvas.height / this.resolution;

		const detailed = camera.zoom >= ZOOM.detail;
		const waterScale = this.waterScaleFor(camera.zoom);

		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.fillStyle = OUTSIDE_WORLD;
		ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
		ctx.setTransform(this.resolution, 0, 0, this.resolution, 0, 0);
		ctx.translate(-left, -top);

		for (const region of this.regions) {
			const { width, height } = region.bounds;
			const border = FRAME_THICKNESS[region.frame];
			const visible =
				region.x + width + border > left &&
				region.x - border < right &&
				region.y + height + border > top &&
				region.y - border < bottom;
			if (!visible) continue;

			ctx.save();
			ctx.translate(region.x, region.y);
			// Bubbles and highlights stay inside their tank.
			ctx.beginPath();
			ctx.rect(0, 0, width, height);
			ctx.clip();
			this.drawTank(
				region,
				creaturesByTank.get(region.id) ?? [],
				time,
				highlightKey,
				{
					left: left - region.x,
					right: right - region.x,
					top: top - region.y,
					bottom: bottom - region.y,
				},
				detailed,
				waterScale,
			);
			ctx.restore();

			// After the water, so the porthole plate covers the corners of the window.
			const frame = this.framesByTank.get(
				`${region.id}|${region.frame}|${region.bounds.width}x${region.bounds.height}`,
			);
			if (frame) ctx.drawImage(frame, region.x - border, region.y - border);
		}
	}

	/** Draws one tank in its local coordinates. `view` is the visible area in those coordinates. */
	private drawTank(
		region: TankRegion,
		creatures: Creature[],
		time: number,
		highlightKey: string | undefined,
		view: { left: number; right: number; top: number; bottom: number },
		detailed: boolean,
		waterScale: number,
	): void {
		const ctx = this.ctx;
		const sizeKey = `${region.bounds.width}x${region.bounds.height}`;
		const failureShare = tankFailureShare(creatures);
		const health = tankHealthOf(failureShare);
		const scale = tankScaleOf(region.bounds);

		const { width, height } = region.bounds;
		const background = this.backgroundFor(region.bounds, sizeKey, health, waterScale);
		ctx.drawImage(background, 0, 0, width, height);
		const rays = this.lightRays.get(sizeKey);
		if (rays) {
			const pulse = 0.75 + 0.25 * Math.sin((time * 2 * Math.PI) / LIGHT_RAYS.pulseSeconds);
			ctx.globalAlpha = pulse * RAY_STRENGTH[health] * (1 - LIGHT_RAYS.fadePerScale * (scale - 1));
			ctx.drawImage(rays, 0, 0);
			ctx.globalAlpha = 1;
		}
		this.drawProps(region.bounds, this.propsByTank.get(region.id) ?? [], failureShare);
		if (detailed) {
			this.drawPlants(
				ctx,
				region.bounds,
				this.plantsByTank.get(region.id) ?? [],
				time,
				view.left - CULL_MARGIN,
				view.right + CULL_MARGIN,
			);
			this.drawAmbientBubbles(region.bounds, time);
			this.drawSurface(ctx, region.bounds, health, scale, time, view.left, view.right);
		} else {
			// Same layers, at rest: plants and surface sit above the props and the light rays.
			ctx.drawImage(this.stillOverlayFor(region, health), 0, 0);
		}

		for (const creature of creatures) {
			const visible =
				creature.x + creature.width > view.left - CULL_MARGIN &&
				creature.x < view.right + CULL_MARGIN &&
				creature.y + creature.height > view.top - CULL_MARGIN &&
				creature.y < view.bottom + CULL_MARGIN;
			if (!visible) continue;
			this.drawCreature(creature);
			for (const effectId of creature.traits.effects) {
				getEffect(effectId)?.draw(ctx, creature, time);
			}
			if (creature.entity.key === highlightKey) this.drawHighlight(creature);
		}
	}

	/** Props stand on the sand. A failing tank shows the dead look of more of them. */
	private drawProps(
		bounds: TankBounds,
		props: PlacedProp[],
		failureShare: number | undefined,
	): void {
		const ctx = this.ctx;
		for (const placed of props) {
			const image = this.propImage(placed.prop, isPropDead(placed, failureShare));
			if (!image) continue;
			const width = image.width * placed.scale;
			const height = image.height * placed.scale;
			ctx.globalAlpha = 1 - PROP_LAYOUT.fadePerScale * (placed.scale - 1);
			ctx.drawImage(
				image,
				placed.x,
				bounds.floor + PROP_LAYOUT.sink * placed.scale - height,
				width,
				height,
			);
		}
		ctx.globalAlpha = 1;
	}

	private propImage(prop: PropDefinition, dead: boolean): HTMLCanvasElement | undefined {
		const sprite = dead ? prop.dead : prop.healthy;
		const cached = this.propImages.get(sprite);
		if (cached) return cached;
		const [image] = this.spriteFrames(`prop:${prop.id}:${dead ? 'dead' : 'healthy'}`, sprite);
		if (image) this.propImages.set(sprite, image);
		return image;
	}

	private drawCreature(creature: Creature): void {
		const { tint, glitchEverySeconds, skeleton } = creature.traits;
		// Age, not tank time, so creatures glitch out of step, and reduced motion stops it.
		const stage = glitchEverySeconds ? glitchStageAt(creature.age, glitchEverySeconds) : -1;
		const tinted = tint !== undefined && (!glitchEverySeconds || stage >= 0);
		const scrambled = stage === GLITCH_STAGES.scrambled || stage === GLITCH_STAGES.scrambledAgain;
		let offsetX = stage === GLITCH_STAGES.jump ? 3 : 0;
		// A sick creature twitches between glitches; a skeleton rattles now and then.
		if (glitchEverySeconds && stage < 0 && creature.age % 0.8 < 0.07) {
			offsetX = Math.floor(creature.age * 30) % 2 ? 2 : -2;
		}
		if (skeleton && creature.age % 3.3 < 0.12) offsetX = Math.floor(creature.age * 40) % 2 ? 1 : -1;

		let frames: HTMLCanvasElement[];
		if (skeleton) {
			frames = this.spriteFrames(`${creature.species.id}:skeleton`, this.skeletonOf(creature));
		} else if (isResting(creature)) {
			frames = this.spriteFrames(`${creature.species.id}:faded`, this.fadedOf(creature));
		} else {
			frames = this.spriteFrames(
				creature.species.id,
				creature.species.sprite,
				tinted ? tint : undefined,
			);
		}
		const frameIndex = frameIndexOf(creature);
		const frame = frames[frameIndex];
		if (!frame) return;

		const ctx = this.ctx;
		const flipX = creature.facing === -1;
		// Belly-up: the same sprite upside down, with a gentle 1 px bob at the surface.
		const flipY = creature.traits.bellyUp === true;
		let x = Math.round(creature.x) + offsetX;
		let y = Math.round(creature.y) + (flipY ? Math.round(Math.sin(creature.age * 1.5)) : 0);
		if (flipX || flipY) {
			ctx.save();
			ctx.translate(flipX ? x + creature.width : x, flipY ? y + creature.height : y);
			ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
			x = 0;
			y = 0;
		}
		if (scrambled) {
			// A green ghost copy behind the scrambled fish, like a broken screen.
			ctx.globalAlpha = 0.5;
			ctx.drawImage(frame, x - 2, y, creature.width, creature.height);
			ctx.globalAlpha = 1;
			this.drawScrambled(frame, creature, x, y, stage);
		} else {
			ctx.drawImage(frame, x, y, creature.width, creature.height);
		}
		const running = (creature.activity?.running ?? 0) > 0;
		if (creature.traits.shimmer && running && !isAsleep(creature)) {
			const progress = shimmerProgressAt(creature.age, hashString(creature.entity.id));
			if (progress >= 0) this.drawShimmer(creature, frameIndex, x, y, progress);
		}
		if (flipX || flipY) ctx.restore();
	}

	/**
	 * A slanted band of gold that crosses the creature from tail to head, with a bright leading
	 * edge. It lights only the creature's own pixels.
	 */
	private drawShimmer(
		creature: Creature,
		frameIndex: number,
		x: number,
		y: number,
		progress: number,
	): void {
		const { id, sprite } = creature.species;
		const gold = this.spriteFrames(id, sprite, SHIMMER.gold)[frameIndex];
		const edge = this.spriteFrames(id, sprite, SHIMMER.edge)[frameIndex];
		if (!gold || !edge) return;

		const ctx = this.ctx;
		const scale = creature.traits.scale;
		const front = progress * (gold.width + SHIMMER.band + gold.height * SHIMMER.slant);
		for (let row = 0; row < gold.height; row++) {
			const right = Math.round(front - row * SHIMMER.slant);
			const from = Math.max(0, right - SHIMMER.band);
			const to = Math.min(gold.width, right);
			if (to <= from) continue;
			const dy = y + row * scale;
			ctx.drawImage(
				gold,
				from,
				row,
				to - from,
				1,
				x + from * scale,
				dy,
				(to - from) * scale,
				scale,
			);
			if (right <= gold.width) {
				ctx.drawImage(edge, right - 1, row, 1, 1, x + (right - 1) * scale, dy, scale, scale);
			}
		}
	}

	/** A glitch frame: each row shifts up to 4 px to the side. Each stage scrambles other rows. */
	private drawScrambled(
		frame: HTMLCanvasElement,
		creature: Creature,
		x: number,
		y: number,
		stage: number,
	): void {
		const scale = creature.traits.scale;
		for (let row = 0; row < frame.height; row++) {
			const shift = ((row * 7 + stage * 5) % 9) - 4;
			this.ctx.drawImage(
				frame,
				0,
				row,
				frame.width,
				1,
				x + shift * scale,
				y + row * scale,
				frame.width * scale,
				scale,
			);
		}
	}

	private skeletonOf(creature: Creature): PixelSprite {
		const cached = this.skeletons.get(creature.species.id);
		if (cached) return cached;
		const skeleton = toSkeleton(creature.species.sprite);
		this.skeletons.set(creature.species.id, skeleton);
		return skeleton;
	}

	private fadedOf(creature: Creature): PixelSprite {
		const cached = this.fadedSprites.get(creature.species.id);
		if (cached) return cached;
		const faded = toFaded(creature.species.sprite);
		this.fadedSprites.set(creature.species.id, faded);
		return faded;
	}

	private drawHighlight(creature: Creature): void {
		const ctx = this.ctx;
		const x = Math.round(creature.x) - 2;
		const y = Math.round(creature.y) - 2;
		const right = x + creature.width + 3;
		const bottom = y + creature.height + 3;
		ctx.fillStyle = HIGHLIGHT;
		for (const [cx, cy, dx, dy] of [
			[x, y, 1, 1],
			[right, y, -1, 1],
			[x, bottom, 1, -1],
			[right, bottom, -1, -1],
		]) {
			ctx.fillRect(cx, cy, 1, 1);
			ctx.fillRect(cx + dx, cy, 1, 1);
			ctx.fillRect(cx, cy + dy, 1, 1);
		}
	}

	private spriteFrames(id: string, sprite: PixelSprite, tint?: string): HTMLCanvasElement[] {
		const cacheKey = `${id}|${tint ?? ''}`;
		const cached = this.spriteCache.get(cacheKey);
		if (cached) return cached;

		const frames = sprite.frames.map((rows) => {
			const frame = createCanvas(rows[0]?.length ?? 0, rows.length);
			const ctx = context2d(frame);
			rows.forEach((row, y) => {
				[...row].forEach((char, x) => {
					const color = sprite.palette[char];
					if (!color) return;
					ctx.fillStyle = color;
					ctx.fillRect(x, y, 1, 1);
				});
			});
			if (tint) {
				ctx.globalCompositeOperation = 'source-atop';
				ctx.globalAlpha = TINT_ALPHA;
				ctx.fillStyle = tint;
				ctx.fillRect(0, 0, frame.width, frame.height);
			}
			return frame;
		});

		this.spriteCache.set(cacheKey, frames);
		return frames;
	}

	private drawLightRays(bounds: TankBounds): HTMLCanvasElement {
		const canvas = createCanvas(bounds.width, bounds.height);
		const ctx = context2d(canvas);
		ctx.fillStyle = '#ffffff';
		for (const ray of LIGHT_RAYS.rays) {
			const left = bounds.width * ray.at;
			const width = Math.max(2, Math.round(bounds.width * ray.width));
			for (let y = 0; y < bounds.floor; y++) {
				const fade = 1 - y / bounds.floor;
				// Banded alpha keeps the fade in a few flat steps, like pixel art.
				ctx.globalAlpha =
					(LIGHT_RAYS.alpha * Math.ceil(fade * LIGHT_RAYS.steps)) / LIGHT_RAYS.steps;
				ctx.fillRect(Math.round(left + y * LIGHT_RAYS.slope), y, width, 1);
			}
		}
		return canvas;
	}

	/** In a big tank, each wave pixel is a `scale` block, so the waves grow instead of repeating. */
	private drawSurface(
		ctx: CanvasRenderingContext2D,
		bounds: TankBounds,
		health: TankHealth,
		scale: number,
		time: number,
		fromX: number,
		toX: number,
	): void {
		const { crest, foam, calm } = SURFACE[health];
		const start = Math.max(0, Math.floor(fromX / scale));
		const end = Math.min(Math.ceil(bounds.width / scale), Math.ceil(toX / scale));

		ctx.fillStyle = foam;
		for (let x = start; x < end; x++) {
			const crestY = surfaceCrestAt(x, time, calm) * scale;
			if (crestY > 0) ctx.fillRect(x * scale, 0, scale, crestY);
		}
		ctx.fillStyle = crest;
		for (let x = start; x < end; x++) {
			const crestY = Math.max(0, surfaceCrestAt(x, time, calm)) * scale;
			ctx.fillRect(x * scale, crestY, scale, scale);
		}
	}

	/**
	 * Zoomed in, the water dither has one cell for each logical pixel. Zoomed out, it has one cell
	 * for each CSS pixel: a pattern of logical pixels shrunk below 1:1 aliases into large checks.
	 * The scale follows the zoom only after the zoom settles, so a wheel zoom does not repaint
	 * each step.
	 */
	private waterScaleFor(zoom: number): number {
		if (zoom >= ZOOM.detail) return 1;
		const now = performance.now();
		if (zoom !== this.lastZoom) {
			this.lastZoom = zoom;
			this.zoomChangedAt = now;
		}
		const settled = now - this.zoomChangedAt >= ZOOM.settleMs;
		if (this.waterScale === 0 || (settled && this.waterScale !== zoom)) {
			for (const key of this.backgrounds.keys()) {
				const scale = Number(key.slice(key.lastIndexOf('|') + 1));
				if (scale !== 1 && scale !== zoom) this.backgrounds.delete(key);
			}
			this.waterScale = zoom;
		}
		return this.waterScale;
	}

	/** Paints a background the first time a tank of this size has this health and water scale. */
	private backgroundFor(
		bounds: TankBounds,
		sizeKey: string,
		health: TankHealth,
		scale: number,
	): HTMLCanvasElement {
		const key = `${sizeKey}|${health}|${scale}`;
		const cached = this.backgrounds.get(key);
		if (cached) return cached;
		const background = this.drawBackground(bounds, health, scale);
		this.backgrounds.set(key, background);
		return background;
	}

	/** `scale` is background pixels for each logical pixel. Each background pixel is one dither cell. */
	private drawBackground(bounds: TankBounds, health: TankHealth, scale: number): HTMLCanvasElement {
		const width = Math.max(1, Math.round(bounds.width * scale));
		const height = Math.max(1, Math.round(bounds.height * scale));
		const floor = Math.min(height, Math.round(bounds.floor * scale));
		const canvas = createCanvas(width, height);
		const ctx = context2d(canvas);
		const water = WATER[health].map(rgbOf);
		const sand = SAND[health];
		const image = ctx.createImageData(width, height);
		const put = (x: number, y: number, [r, g, b]: Rgb) => {
			const i = (y * width + x) * 4;
			image.data[i] = r;
			image.data[i + 1] = g;
			image.data[i + 2] = b;
			image.data[i + 3] = 255;
		};

		const deepest = Math.max(1, floor - 1);
		const black: Rgb = [0, 0, 0];
		for (let y = 0; y < floor; y++) {
			const depth = (y / deepest) ** WATER_DEPTH_CURVE * (water.length - 1);
			const band = Math.min(water.length - 2, Math.floor(depth));
			const mix = depth - band;
			const upper = water[band] ?? black;
			const lower = water[band + 1] ?? black;
			for (let x = 0; x < width; x++) {
				const threshold = ((BAYER_4[(y % 4) * 4 + (x % 4)] ?? 0) + 0.5) / 16;
				put(x, y, mix > threshold ? lower : upper);
			}
		}

		const sandBase = rgbOf(sand.base);
		const sandLight = rgbOf(sand.light);
		const sandSpeck = rgbOf(sand.speck);
		for (let y = floor; y < height; y++) {
			for (let x = 0; x < width; x++) {
				if (y === floor) put(x, y, sandLight);
				else put(x, y, hashString(`${x},${y}`) % 7 === 0 ? sandSpeck : sandBase);
			}
		}

		ctx.putImageData(image, 0, 0);
		return canvas;
	}

	/** Plants and the water surface at rest, for tanks that are too small on screen to animate. */
	private stillOverlayFor(region: TankRegion, health: TankHealth): HTMLCanvasElement {
		const key = `${region.id}|${region.bounds.width}x${region.bounds.height}|${health}`;
		const cached = this.stillOverlays.get(key);
		if (cached) return cached;
		const canvas = createCanvas(region.bounds.width, region.bounds.height);
		const ctx = context2d(canvas);
		this.drawPlants(
			ctx,
			region.bounds,
			this.plantsByTank.get(region.id) ?? [],
			0,
			0,
			region.bounds.width,
		);
		this.drawSurface(
			ctx,
			region.bounds,
			health,
			tankScaleOf(region.bounds),
			0,
			0,
			region.bounds.width,
		);
		this.stillOverlays.set(key, canvas);
		return canvas;
	}

	/** Big tanks get thicker, taller and fewer plants, not more of the small ones. */
	private layoutPlants(bounds: TankBounds, seed: string): Plant[] {
		const scale = tankScaleOf(bounds);
		const plants: Plant[] = [];
		for (let x = 3 * scale; x < bounds.width - 3 * scale; x += 7 * scale) {
			const hash = hashString(`${seed}:plant${x}`);
			if (hash % 3 !== 0) continue;
			plants.push({
				x: x + (hash % 4) * scale,
				height: (6 + (hash % 18)) * scale,
				color: SEAWEED[hash % SEAWEED.length],
				phase: (hash % 100) / 10,
				scale,
			});
		}
		return plants;
	}

	private drawPlants(
		ctx: CanvasRenderingContext2D,
		bounds: TankBounds,
		plants: Plant[],
		time: number,
		fromX: number,
		toX: number,
	): void {
		for (const plant of plants) {
			if (plant.x < fromX || plant.x > toX) continue;
			ctx.fillStyle = plant.color;
			const { scale } = plant;
			for (let i = 0; i < plant.height; i += scale) {
				// The tip sways more than the root.
				const step = i / scale;
				const sway = Math.round(Math.sin(time * 1.2 + plant.phase + step * 0.35) * (step / 8));
				ctx.fillRect(plant.x + sway * scale, bounds.floor - i - scale + 1, 2 * scale, scale);
			}
		}
	}

	private drawAmbientBubbles(bounds: TankBounds, time: number): void {
		const ctx = this.ctx;
		ctx.fillStyle = AMBIENT_BUBBLE;
		const columns = Math.max(4, Math.round(bounds.width / BUBBLE_COLUMN_SPACING));
		for (let column = 0; column < columns; column++) {
			const x = ((column + 1) * bounds.width) / (columns + 1);
			for (let i = 0; i < 3; i++) {
				const progress = (((time * 0.08 + column * 0.31 + i / 3) % 1) + 1) % 1;
				const y = bounds.floor - progress * bounds.floor;
				ctx.fillRect(Math.round(x + Math.sin(progress * 12 + column) * 2), Math.round(y), 1, 1);
			}
		}
	}
}
