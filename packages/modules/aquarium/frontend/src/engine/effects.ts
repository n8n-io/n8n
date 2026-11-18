import { MAX_SWIM_SPEED } from '../aquarium.constants';
import { hashString } from '../species/species.registry';
import { isAsleep, type Creature } from './simulation';

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

/** Pixels grouped by colour, so a frame sets each colour once and allocates nothing. */
function toPixelGroups(
	rows: string[],
	palette: Record<string, string>,
): Array<{ color: string; points: Array<[number, number]> }> {
	const groups = new Map<string, Array<[number, number]>>();
	rows.forEach((row, y) => {
		[...row].forEach((char, x) => {
			const color = palette[char];
			if (!color) return;
			groups.set(color, [...(groups.get(color) ?? []), [x, y]]);
		});
	});
	return [...groups.entries()].map(([color, points]) => ({ color, points }));
}

const STRAND_COLOURS = ['#2f8f4e', '#3fa65c', '#1cbc52', '#79ec41', '#267a42'];
/** The seaweed stub in the seahorse's tail curl, in sprite pixels of the right-facing sprite. */
const STRAND_ANCHOR = { x: 2, y: 24 };
/** More strands than this would hide the seahorse. */
const STRAND_MAX = 8;

/**
 * One seaweed strand for each skill of an agent. Agents have a complexity of 1 + their skill
 * count. The agent id picks the colours, so a seahorse looks the same after a reload.
 */
export const skillStrandsEffect: CreatureEffect = {
	id: 'skillStrands',
	draw(ctx, creature) {
		const strands = Math.min(STRAND_MAX, Math.max(0, creature.entity.metrics.complexity - 1));
		if (strands === 0) return;
		const scale = creature.traits.scale;
		const fromX =
			creature.facing === 1
				? creature.x + STRAND_ANCHOR.x * scale
				: creature.x + creature.width - 1 - STRAND_ANCHOR.x * scale;
		const fromY = creature.y + STRAND_ANCHOR.y * scale;
		const seed = hashString(creature.entity.id);

		for (let i = 0; i < strands; i++) {
			ctx.fillStyle = STRAND_COLOURS[(seed + i) % STRAND_COLOURS.length] ?? '#2f8f4e';
			const length = 7 + ((seed >> (i % 8)) % 6);
			// Strands fan out from the tail, and each tip sways more than its root.
			const spread = (i - (strands - 1) / 2) * 0.4;
			for (let k = 1; k <= length; k++) {
				const sway = Math.sin(creature.age * 1.6 + i * 1.3 + k * 0.45) * (k / length) * 1.5;
				const x = Math.round(fromX - creature.facing * k);
				const y = Math.round(fromY + spread * k + sway);
				ctx.fillRect(x, y, 1, 2);
			}
		}
	},
};

/** A pixel "Z", 4 x 4. */
const ZZZ: ReadonlyArray<readonly [number, number]> = [
	[0, 0],
	[1, 0],
	[2, 0],
	[3, 0],
	[2, 1],
	[1, 2],
	[0, 3],
	[1, 3],
	[2, 3],
	[3, 3],
];
const ZZZ_COLOUR = '#e8f4ff';
const ZZZ_SECONDS = 2.4;

/** Two "Z"s rise from the head of a sleeping creature, drift a little and fade. */
export const zzzEffect: CreatureEffect = {
	id: 'zzz',
	draw(ctx, creature) {
		if (!isAsleep(creature)) return;
		const headX =
			creature.facing === 1
				? creature.x + creature.width * 0.75
				: creature.x + creature.width * 0.25;
		ctx.fillStyle = ZZZ_COLOUR;
		for (let i = 0; i < 2; i++) {
			const progress = ((creature.age + (i * ZZZ_SECONDS) / 2) % ZZZ_SECONDS) / ZZZ_SECONDS;
			const x = Math.round(headX + creature.facing * progress * 4);
			const y = Math.round(creature.y - 5 - progress * 10);
			ctx.globalAlpha = 1 - progress;
			for (const [px, py] of ZZZ) ctx.fillRect(x + px, y + py, 1, 1);
		}
		ctx.globalAlpha = 1;
	},
};

/** A small blue-grey companion fish, 12 x 7, facing right. Two frames: its tail flicks. */
const REMORA_PALETTE: Record<string, string> = {
	m: '#17252d', // outline
	g: '#7a95a3', // back
	b: '#d6e2e6', // belly
	e: '#ffffff', // eye
	k: '#0b1418', // pupil
};
const REMORA_FRAMES = [
	[
		'....mmmm....',
		'm..mggggmm..',
		'mmmgggggeemm',
		'mggggggggkem',
		'mmmbbbbbbbm.',
		'm..mbbbbmm..',
		'....mmmm....',
	],
	[
		'....mmmm....',
		'.m.mggggmm..',
		'mmmgggggeemm',
		'mggggggggkem',
		'mmmbbbbbbbm.',
		'.m.mbbbbmm..',
		'....mmmm....',
	],
].map((rows) => toPixelGroups(rows, REMORA_PALETTE));
const REMORA_WIDTH = 12;

/**
 * A remora trails just behind the tail of a workflow that has an error workflow. It faces the
 * same way as its host, bobs on its own and stays with its host while it sleeps or floats.
 */
export const remoraEffect: CreatureEffect = {
	id: 'remora',
	draw(ctx, creature) {
		const behind =
			creature.facing === 1 ? creature.x - REMORA_WIDTH - 1 : creature.x + creature.width + 1;
		const x = Math.round(behind);
		const y = Math.round(creature.y + creature.height * 0.55 - 3 + Math.sin(creature.age * 3 + 1));
		const frame = REMORA_FRAMES[Math.floor(creature.age * 6) % REMORA_FRAMES.length] ?? [];
		for (const { color, points } of frame) {
			ctx.fillStyle = color;
			for (const [px, py] of points) {
				ctx.fillRect(x + (creature.facing === 1 ? px : REMORA_WIDTH - 1 - px), y + py, 1, 1);
			}
		}
	},
};

const registry = new Map<string, CreatureEffect>([
	[bubblesEffect.id, bubblesEffect],
	[skillStrandsEffect.id, skillStrandsEffect],
	[zzzEffect.id, zzzEffect],
	[remoraEffect.id, remoraEffect],
]);

export function registerEffect(effect: CreatureEffect): void {
	registry.set(effect.id, effect);
}

export function getEffect(id: string): CreatureEffect | undefined {
	return registry.get(id);
}
