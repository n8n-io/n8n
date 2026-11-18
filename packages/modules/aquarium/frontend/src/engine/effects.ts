import { MAX_SWIM_SPEED } from '../aquarium.constants';
import type { Creature } from './simulation';

/** Draws extra pixels for a creature after its sprite. Must not keep state between frames. */
export interface CreatureEffect {
	id: string;
	draw(ctx: CanvasRenderingContext2D, creature: Creature, time: number): void;
}

const BUBBLE_COLOR = 'rgba(220, 240, 255, 0.85)';
const BUBBLE_RISE = 12;

export const bubblesEffect: CreatureEffect = {
	id: 'bubbles',
	draw(ctx, creature, time) {
		const scale = creature.traits.scale;
		const mouthRow = creature.species.mouthRow ?? creature.height / scale / 2;
		const mouthX = creature.facing === 1 ? creature.x + creature.width : creature.x - 1;
		const mouthY = creature.y + mouthRow * scale;
		// Busy creatures breathe faster.
		const cycle = 3 - (2 * creature.speed) / MAX_SWIM_SPEED;

		ctx.fillStyle = BUBBLE_COLOR;
		for (let i = 0; i < 3; i++) {
			const progress = ((time + creature.age + (i * cycle) / 3) / cycle) % 1;
			const x = mouthX + creature.facing * progress * 2 + Math.sin(progress * 6 + i);
			const y = mouthY - progress * BUBBLE_RISE;
			ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
		}
	},
};

/** A cat in a diving helmet. Each character is one pixel, and `.` is clear. */
const CAT_ROWS = [
	'....ooooo....',
	'..oogggggoo..',
	'.ogdgggggdgo.',
	'.ogddgggddgo.',
	'ogdcccccccdgo',
	'ogdcecccecdgo',
	'ogdcpcccpcdgo',
	'ogdcwwnwwcdgo',
	'.ogdcwwwcdgo.',
	'.oggdddddggo.',
	'..oogggggoo..',
	'....ooooo....',
];

const CAT_PALETTE: Record<string, string> = {
	o: '#d8eef8', // helmet rim
	g: 'rgba(200, 230, 255, 0.35)', // helmet glass
	d: '#7a4320', // outline
	c: '#f0a050', // fur
	e: '#8ee07a', // eye
	p: '#14202a', // pupil, low in the eye, so the cat looks down at the creature
	n: '#f28aa0', // nose
	w: '#fff3e6', // muzzle
};

/** Pixels grouped by colour, so a frame sets each colour once and allocates nothing. */
function toPixelGroups(rows: string[]): Array<{ color: string; points: Array<[number, number]> }> {
	const groups = new Map<string, Array<[number, number]>>();
	rows.forEach((row, y) => {
		[...row].forEach((char, x) => {
			const color = CAT_PALETTE[char];
			if (!color) return;
			groups.set(color, [...(groups.get(color) ?? []), [x, y]]);
		});
	});
	return [...groups.entries()].map(([color, points]) => ({ color, points }));
}

const CAT_OPEN = toPixelGroups(CAT_ROWS);
const CAT_BLINK = toPixelGroups(CAT_ROWS.map((row) => row.replace(/e/g, 'c').replace(/p/g, 'd')));
const CAT_WIDTH = Math.max(...CAT_ROWS.map((row) => row.length));
const CAT_HEIGHT = CAT_ROWS.length;
const CAT_BLINK_EVERY_SECONDS = 4;
const CAT_BLINK_SECONDS = 0.2;

/** A cat watches a creature with a security risk. It floats above the creature and bobs. */
export const catEffect: CreatureEffect = {
	id: 'cat',
	draw(ctx, creature) {
		// Age, not tank time, so cats are out of step, and reduced motion stops them.
		const bob = Math.round(Math.sin(creature.age * 1.5));
		const x = Math.round(creature.x + creature.width / 2 - CAT_WIDTH / 2);
		const y = Math.max(0, Math.round(creature.y - CAT_HEIGHT - 2 + bob));
		const blinking = creature.age % CAT_BLINK_EVERY_SECONDS < CAT_BLINK_SECONDS;

		for (const { color, points } of blinking ? CAT_BLINK : CAT_OPEN) {
			ctx.fillStyle = color;
			for (const [px, py] of points) ctx.fillRect(x + px, y + py, 1, 1);
		}
	},
};

const registry = new Map<string, CreatureEffect>([
	[bubblesEffect.id, bubblesEffect],
	[catEffect.id, catEffect],
]);

export function registerEffect(effect: CreatureEffect): void {
	registry.set(effect.id, effect);
}

export function getEffect(id: string): CreatureEffect | undefined {
	return registry.get(id);
}
