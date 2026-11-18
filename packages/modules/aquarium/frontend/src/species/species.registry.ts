import type { EntityKind, SizeTier } from '../aquarium.types';
import { SIZE_TIERS } from '../engine/scaling';
import { builtinSpecies } from './builtin';
import type { SpeciesDefinition } from './species.types';

const registry = new Map<string, SpeciesDefinition>(
	builtinSpecies.map((species) => [species.id, species]),
);

/** Adds or replaces a species at runtime. */
export function registerSpecies(species: SpeciesDefinition): void {
	registry.set(species.id, species);
}

export function getSpecies(id: string): SpeciesDefinition | undefined {
	return registry.get(id);
}

export function listSpecies(): SpeciesDefinition[] {
	return [...registry.values()];
}

/** Stable small hash, so one entity always gets the same species when several match. */
export function hashString(value: string): number {
	let hash = 0;
	for (let i = 0; i < value.length; i++) {
		hash = (hash * 31 + value.charCodeAt(i)) | 0;
	}
	return Math.abs(hash);
}

/**
 * Picks a species for the kind and tier. If no species has that tier, it uses the
 * species with the nearest tier.
 */
export function pickSpecies(
	kind: EntityKind,
	tier: SizeTier,
	seed: string,
	candidates: SpeciesDefinition[] = listSpecies(),
): SpeciesDefinition | undefined {
	const ofKind = candidates.filter((species) => species.kinds.includes(kind));
	if (ofKind.length === 0) return undefined;

	const tierIndex = SIZE_TIERS.indexOf(tier);
	const distance = (species: SpeciesDefinition) =>
		Math.min(...species.sizeTiers.map((t) => Math.abs(SIZE_TIERS.indexOf(t) - tierIndex)));
	const best = Math.min(...ofKind.map(distance));
	const matches = ofKind.filter((species) => distance(species) === best);

	return matches[hashString(seed) % matches.length];
}
