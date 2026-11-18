import { MAX_SWIM_SPEED, TOXIC_BUBBLES, WAKE } from '../aquarium.constants';
import { hashString } from '../species/species.registry';
import { toxicBubbleAt } from './glitch';
import { isAsleep, type Creature } from './simulation';
import { TOXIC_BUBBLES_EFFECT, WAKE_EFFECT } from './traits';

/** Draws extra pixels for a creature after its sprite. Must not keep state between frames. */
export interface CreatureEffect {
	id: string;
	/** Draw only from `ZOOM.detail`: too small to see further out, and it costs each frame. */
	detailOnly?: boolean;
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

/** How far wake ripple `index` has moved from the tail, from 0 to 1. */
export function wakeProgress(age: number, index: number): number {
	return (age / WAKE.lifeSeconds + index / WAKE.count) % 1;
}

/**
 * Ripple arcs, curved like "(", trail behind a swimming creature. A ripple stays where it was
 * made while the creature swims on, so it moves back at the swim speed, grows and fades.
 */
export const wakeEffect: CreatureEffect = {
	id: WAKE_EFFECT,
	detailOnly: true,
	draw(ctx, creature) {
		const { traits, species } = creature;
		if (species.motion !== 'swim' || traits.bellyUp || isAsleep(creature)) return;
		if (creature.speed < WAKE.minSpeed) return;

		const strength = Math.min(1, creature.speed / WAKE.fullSpeed);
		const tailX = creature.facing === 1 ? creature.x - 1 : creature.x + creature.width;
		const tailY = Math.round(creature.y + creature.height / 2);
		ctx.fillStyle = WAKE.color;
		for (let i = 0; i < WAKE.count; i++) {
			// Age, not tank time, so wakes are out of step, and reduced motion stops them.
			const progress = wakeProgress(creature.age, i);
			const back = 1 + progress * WAKE.lifeSeconds * creature.speed;
			const x = Math.round(tailX - creature.facing * back);
			const radius = (1 + Math.round(progress * 2)) * traits.scale;
			// Fades slowly at first, so the newest ripples read clearly.
			ctx.globalAlpha = WAKE.alpha * strength * (1 - progress * progress);
			for (let dy = -radius; dy <= radius; dy++) {
				const bend = Math.round((dy * dy) / (radius * 2));
				ctx.fillRect(x + creature.facing * bend, tailY + dy, 1, 1);
			}
		}
		ctx.globalAlpha = 1;
	},
};

/** Toxic bubble looks as it rises: a speck, a small bubble, a ring, then a pop. `.` is clear. */
const TOXIC_STAGES = [
	{ until: 0.2, rows: ['l'] },
	{ until: 0.5, rows: ['hl', 'ls'] },
	{ until: 0.9, rows: ['.hl.', 'l..s', 'l..s', '.ss.'] },
	{ until: 1, rows: ['p..p', '....', '....', 'p..p'] },
];
const TOXIC_PALETTE: Record<string, string> = {
	l: TOXIC_BUBBLES.lime,
	s: TOXIC_BUBBLES.shade,
	h: TOXIC_BUBBLES.shine,
	p: TOXIC_BUBBLES.pop,
};

/** A sick creature lets out a burst of suspicious green bubbles now and then. */
export const toxicBubblesEffect: CreatureEffect = {
	id: TOXIC_BUBBLES_EFFECT,
	draw(ctx, creature) {
		const scale = creature.traits.scale;
		const mouthRow = creature.species.mouthRow ?? creature.height / scale / 2;
		const mouthX = creature.facing === 1 ? creature.x + creature.width : creature.x - 1;
		const mouthY = creature.y + mouthRow * scale;
		const seed = hashString(creature.entity.id);

		for (let i = 0; i < TOXIC_BUBBLES.count; i++) {
			// Age, not tank time, so bursts are out of step, and reduced motion stops them.
			const progress = toxicBubbleAt(creature.age, seed, i);
			if (progress < 0) continue;
			let rows: readonly string[] = [];
			for (const stage of TOXIC_STAGES) {
				if (progress < stage.until) {
					rows = stage.rows;
					break;
				}
			}
			const half = Math.floor((rows[0]?.length ?? 1) / 2);
			const x = Math.round(
				mouthX + creature.facing * (1 + i) + Math.sin(progress * 7 + i * 2) * 1.5 - half,
			);
			const y = Math.round(mouthY - progress * TOXIC_BUBBLES.rise - i - half);
			for (let dy = 0; dy < rows.length; dy++) {
				const row = rows[dy] ?? '';
				for (let dx = 0; dx < row.length; dx++) {
					const color = TOXIC_PALETTE[row[dx] ?? '.'];
					if (!color) continue;
					ctx.fillStyle = color;
					ctx.fillRect(x + dx, y + dy, 1, 1);
				}
			}
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
	[toxicBubblesEffect.id, toxicBubblesEffect],
	[wakeEffect.id, wakeEffect],
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
