import { SWIM_SPEED } from '../aquarium.constants';
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
		const cycle = 3 - (2 * creature.traits.speed) / SWIM_SPEED.max;

		ctx.fillStyle = BUBBLE_COLOR;
		for (let i = 0; i < 3; i++) {
			const progress = ((time + creature.age + (i * cycle) / 3) / cycle) % 1;
			const x = mouthX + creature.facing * progress * 2 + Math.sin(progress * 6 + i);
			const y = mouthY - progress * BUBBLE_RISE;
			ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
		}
	},
};

const registry = new Map<string, CreatureEffect>([[bubblesEffect.id, bubblesEffect]]);

export function registerEffect(effect: CreatureEffect): void {
	registry.set(effect.id, effect);
}

export function getEffect(id: string): CreatureEffect | undefined {
	return registry.get(id);
}
