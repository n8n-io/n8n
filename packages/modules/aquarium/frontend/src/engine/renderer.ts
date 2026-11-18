import { hashString } from '../species/species.registry';
import type { PixelSprite } from '../species/species.types';
import type { Camera, Size } from './camera';
import { getEffect } from './effects';
import { frameIndexOf, type Creature, type TankBounds } from './simulation';

const WATER_BANDS = ['#5fb4d9', '#4aa2cc', '#3a8fbd', '#2d7aa8', '#236690', '#1b5277'];
const SAND = { base: '#d9bd7f', speck: '#c2a160', light: '#ead29b' };
const SEAWEED = ['#2f8f4e', '#3fa65c', '#267a42'];
const AMBIENT_BUBBLE = 'rgba(220, 240, 255, 0.6)';
/** Fills the view outside the world when the world is smaller than the view. */
const OUTSIDE_WORLD = '#153e5c';
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

	private background: HTMLCanvasElement | undefined;

	private plants: Plant[] = [];

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

	setWorld(world: TankBounds): void {
		this.background = this.drawBackground(world);
		this.plants = this.layoutPlants(world);
	}

	render(
		creatures: Creature[],
		world: TankBounds,
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

		if (this.background) ctx.drawImage(this.background, 0, 0);
		this.drawPlants(world, time, left - CULL_MARGIN, right + CULL_MARGIN);
		this.drawAmbientBubbles(world, time);

		for (const creature of creatures) {
			const visible =
				creature.x + creature.width > left - CULL_MARGIN &&
				creature.x < right + CULL_MARGIN &&
				creature.y + creature.height > top - CULL_MARGIN &&
				creature.y < bottom + CULL_MARGIN;
			if (!visible) continue;
			this.drawCreature(creature);
			for (const effectId of creature.traits.effects) {
				getEffect(effectId)?.draw(ctx, creature, time);
			}
			if (creature.entity.key === highlightKey) this.drawHighlight(creature);
		}
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

	private drawBackground(bounds: TankBounds): HTMLCanvasElement {
		const canvas = createCanvas(bounds.width, bounds.height);
		const ctx = context2d(canvas);

		const bandHeight = Math.ceil(bounds.floor / WATER_BANDS.length);
		WATER_BANDS.forEach((color, i) => {
			ctx.fillStyle = color;
			ctx.fillRect(0, i * bandHeight, bounds.width, bandHeight);
		});

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

	private layoutPlants(bounds: TankBounds): Plant[] {
		const plants: Plant[] = [];
		for (let x = 3; x < bounds.width - 3; x += 7) {
			const hash = hashString(`plant${x}`);
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

	private drawPlants(bounds: TankBounds, time: number, fromX: number, toX: number): void {
		const ctx = this.ctx;
		for (const plant of this.plants) {
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
