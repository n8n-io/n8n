import { BIG_WHALE } from '../aquarium.constants';
import type { AquariumEntity } from '../aquarium.types';
import { maintainabilityOf } from './design';
import { complexityScore } from './scaling';

/**
 * The one workflow of the instance that is the Loch Ness monster: the biggest of the workflows
 * that are hard to maintain (the really big whales). A tie goes to the worse score, then the key.
 */
export function nessieKey(entities: AquariumEntity[]): string | undefined {
	const candidates = entities.flatMap((entity) => {
		if (entity.kind !== 'workflow' || entity.design === undefined) return [];
		const score = maintainabilityOf(entity.design).score;
		if (score >= BIG_WHALE.belowScore) return [];
		return [{ key: entity.key, size: complexityScore(entity.metrics), score }];
	});

	candidates.sort(
		(a, b) => b.size - a.size || a.score - b.score || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0),
	);
	return candidates[0]?.key;
}
