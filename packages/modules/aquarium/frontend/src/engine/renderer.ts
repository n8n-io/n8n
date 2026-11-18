import { PROP_LAYOUT } from '../aquarium.constants';
import { isPropDead, layoutProps, tankFailureShare, type PlacedProp } from '../decor/decor';
import type { PropDefinition } from '../decor/props';
import { hashString } from '../species/species.registry';
import type { PixelSprite } from '../species/species.types';
import type { Camera, Size } from './camera';
import { getEffect } from './effects';
import { FRAME_THICKNESS, paintFrame } from './frames';
import type { TankRegion } from './layout';
import { frameIndexOf, type Creature, type TankBounds } from './simulation';

/** The "water shallows" palette, from the surface down. */
const WATER = ['#0aa5bd', '#0b76bd', '#04454f'];
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
	alpha: 0.16,
	/** Alpha steps, so the fade is banded like the dithered water, not smooth. */
	steps: 4,
	pulseSeconds: 9,
} as const;
/** The bright, moving line at the top of the water. */
const SURFACE = {
	crest: 'rgba(255, 255, 255, 0.8)',
	foam: 'rgba(186, 239, 238, 0.35)',
	/** Pixels of foam above the crest at rest. */
	depth: 2,
} as const;
/** Two slow waves of different lengths, so the crest never repeats the same shape. */
function surfaceCrestAt(x: number, time: number): number {
	return Math.round(
		SURFACE.depth + Math.sin(x * 0.19 + time * 1.4) * 1.1 + Math.sin(x * 0.053 - time * 0.7) * 1.2,
	);
}

const SAND = { base: '#d9bd7f', speck: '#c2a160', light: '#ead29b' };
const SEAWEED = ['#2f8f4e', '#3fa65c', '#267a42'];
const AMBIENT_BUBBLE = 'rgba(220, 240, 255, 0.6)';
/** Fills the view outside the tanks: the wall between project tanks, and space around the world. */
const OUTSIDE_WORLD = '#011113';
/** Logical pixels of world width for each column of ambient bubbles. */
const BUBBLE_COLUMN_SPACING = 80;
/** Extra pixels around the view, so effects and highlights at the edge still draw. */
const CULL_MARGIN = 16;
const HIGHLIGHT = '#ffffff';
const TINT_ALPHA = 0.45;

interface Plant {
	x: number;
	height: number;
	color: string;
	phase: number;
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
 * Draws the part of the world that the camera shows. The canvas holds the visible area in logical
 * pixels, and CSS scales it to the element, so the zoom is the CSS size over the canvas size.
 */
export class AquariumRenderer {
	private readonly ctx: CanvasRenderingContext2D;

	private readonly spriteCache = new Map<string, HTMLCanvasElement[]>();

	/** Keyed by tank size, so tanks of the same size share one background. */
	private readonly backgrounds = new Map<string, HTMLCanvasElement>();

	/** Light rays, keyed by tank size like the backgrounds. Drawn each frame with a slow pulse. */
	private readonly lightRays = new Map<string, HTMLCanvasElement>();

	private readonly plantsByTank = new Map<string, Plant[]>();

	private readonly propsByTank = new Map<string, PlacedProp[]>();

	/** Keyed by sprite, so a frame finds a prop image with no string keys. */
	private readonly propImages = new WeakMap<PixelSprite, HTMLCanvasElement>();

	/** Painted once for each tank, because frame noise and colours differ for each tank. */
	private readonly framesByTank = new Map<string, HTMLCanvasElement>();

	private regions: TankRegion[] = [];

	constructor(private readonly canvas: HTMLCanvasElement) {
		this.ctx = context2d(canvas);
	}

	/** Sets the visible area in logical pixels. Call it when the zoom or the element size changes. */
	setViewSize(size: Size): void {
		const width = Math.max(1, Math.round(size.width));
		const height = Math.max(1, Math.round(size.height));
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
			if (!this.backgrounds.has(key)) this.backgrounds.set(key, this.drawBackground(region.bounds));
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
		for (const key of this.backgrounds.keys()) if (!sizeKeys.has(key)) this.backgrounds.delete(key);
		for (const key of this.lightRays.keys()) if (!sizeKeys.has(key)) this.lightRays.delete(key);
		for (const id of this.plantsByTank.keys()) if (!tankIds.has(id)) this.plantsByTank.delete(id);
		for (const id of this.propsByTank.keys()) if (!tankIds.has(id)) this.propsByTank.delete(id);
		for (const key of this.framesByTank.keys())
			if (!tankIds.has(key)) this.framesByTank.delete(key);
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
		const right = left + this.canvas.width;
		const bottom = top + this.canvas.height;

		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.fillStyle = OUTSIDE_WORLD;
		ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
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
			this.drawTank(region, creaturesByTank.get(region.id) ?? [], time, highlightKey, {
				left: left - region.x,
				right: right - region.x,
				top: top - region.y,
				bottom: bottom - region.y,
			});
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
	): void {
		const ctx = this.ctx;
		const sizeKey = `${region.bounds.width}x${region.bounds.height}`;
		const background = this.backgrounds.get(sizeKey);
		if (background) ctx.drawImage(background, 0, 0);
		const rays = this.lightRays.get(sizeKey);
		if (rays) {
			ctx.globalAlpha = 0.75 + 0.25 * Math.sin((time * 2 * Math.PI) / LIGHT_RAYS.pulseSeconds);
			ctx.drawImage(rays, 0, 0);
			ctx.globalAlpha = 1;
		}
		this.drawProps(
			region.bounds,
			this.propsByTank.get(region.id) ?? [],
			tankFailureShare(creatures),
		);
		this.drawPlants(
			region.bounds,
			this.plantsByTank.get(region.id) ?? [],
			time,
			view.left - CULL_MARGIN,
			view.right + CULL_MARGIN,
		);
		this.drawAmbientBubbles(region.bounds, time);
		this.drawSurface(region.bounds, time, view.left, view.right);

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
	private drawProps(bounds: TankBounds, props: PlacedProp[], failureShare: number): void {
		for (const placed of props) {
			const image = this.propImage(placed.prop, isPropDead(placed, failureShare));
			if (image)
				this.ctx.drawImage(image, placed.x, bounds.floor + PROP_LAYOUT.sink - image.height);
		}
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
		const { tint, tintBlinkSeconds } = creature.traits;
		// Age, not tank time, so blinking creatures are out of step, and reduced motion stops it.
		const tintOn = !tintBlinkSeconds || creature.age % tintBlinkSeconds < tintBlinkSeconds / 2;
		const frames = this.spriteFrames(
			creature.species.id,
			creature.species.sprite,
			tintOn ? tint : undefined,
		);
		const frame = frames[frameIndexOf(creature)];
		if (!frame) return;

		const ctx = this.ctx;
		const x = Math.round(creature.x);
		const y = Math.round(creature.y);
		if (creature.facing === 1) {
			ctx.drawImage(frame, x, y, creature.width, creature.height);
			return;
		}
		ctx.save();
		ctx.translate(x + creature.width, y);
		ctx.scale(-1, 1);
		ctx.drawImage(frame, 0, 0, creature.width, creature.height);
		ctx.restore();
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

	/** A moving crest with a little foam above it. Drawn only for the visible columns. */
	private drawSurface(bounds: TankBounds, time: number, fromX: number, toX: number): void {
		const ctx = this.ctx;
		const start = Math.max(0, Math.floor(fromX));
		const end = Math.min(bounds.width, Math.ceil(toX));

		ctx.fillStyle = SURFACE.foam;
		for (let x = start; x < end; x++) {
			const crest = surfaceCrestAt(x, time);
			if (crest > 0) ctx.fillRect(x, 0, 1, crest);
		}
		ctx.fillStyle = SURFACE.crest;
		for (let x = start; x < end; x++) ctx.fillRect(x, Math.max(0, surfaceCrestAt(x, time)), 1, 1);
	}

	private drawBackground(bounds: TankBounds): HTMLCanvasElement {
		const canvas = createCanvas(bounds.width, bounds.height);
		const ctx = context2d(canvas);

		const deepest = Math.max(1, bounds.floor - 1);
		for (let y = 0; y < bounds.floor; y++) {
			const depth = (y / deepest) ** WATER_DEPTH_CURVE * (WATER.length - 1);
			const band = Math.min(WATER.length - 2, Math.floor(depth));
			const mix = depth - band;
			for (let x = 0; x < bounds.width; x++) {
				const threshold = ((BAYER_4[(y % 4) * 4 + (x % 4)] ?? 0) + 0.5) / 16;
				ctx.fillStyle = (mix > threshold ? WATER[band + 1] : WATER[band]) ?? '#000000';
				ctx.fillRect(x, y, 1, 1);
			}
		}

		ctx.fillStyle = SAND.base;
		ctx.fillRect(0, bounds.floor, bounds.width, bounds.height - bounds.floor);
		ctx.fillStyle = SAND.light;
		ctx.fillRect(0, bounds.floor, bounds.width, 1);
		for (let x = 0; x < bounds.width; x++) {
			for (let y = bounds.floor + 1; y < bounds.height; y++) {
				if (hashString(`${x},${y}`) % 7 === 0) {
					ctx.fillStyle = SAND.speck;
					ctx.fillRect(x, y, 1, 1);
				}
			}
		}

		return canvas;
	}

	/** `seed` gives each tank its own plants. */
	private layoutPlants(bounds: TankBounds, seed: string): Plant[] {
		const plants: Plant[] = [];
		for (let x = 3; x < bounds.width - 3; x += 7) {
			const hash = hashString(`${seed}:plant${x}`);
			if (hash % 3 !== 0) continue;
			plants.push({
				x: x + (hash % 4),
				height: 6 + (hash % 18),
				color: SEAWEED[hash % SEAWEED.length],
				phase: (hash % 100) / 10,
			});
		}
		return plants;
	}

	private drawPlants(
		bounds: TankBounds,
		plants: Plant[],
		time: number,
		fromX: number,
		toX: number,
	): void {
		const ctx = this.ctx;
		for (const plant of plants) {
			if (plant.x < fromX || plant.x > toX) continue;
			ctx.fillStyle = plant.color;
			for (let i = 0; i < plant.height; i++) {
				// The tip sways more than the root.
				const sway = Math.round(Math.sin(time * 1.2 + plant.phase + i * 0.35) * (i / 8));
				ctx.fillRect(plant.x + sway, bounds.floor - i, 2, 1);
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
