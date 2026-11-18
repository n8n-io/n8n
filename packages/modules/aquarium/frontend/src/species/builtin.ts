import { angelfish } from './creatures/angelfish';
import { minnow } from './creatures/minnow';
import { nessie } from './creatures/nessie';
import { penguin } from './creatures/penguin';
import { seahorse } from './creatures/seahorse';
import { shark } from './creatures/shark';
import { tetra } from './creatures/tetra';
import { turtle } from './creatures/turtle';
import { whale } from './creatures/whale';
import type { SpeciesDefinition } from './species.types';

/**
 * Add a new creature here. The registry picks it for matching kinds and size tiers. A species
 * with no kinds, like the turtle, the penguin or Nessie, is never picked: only a trait rule sets it.
 */
export const builtinSpecies: SpeciesDefinition[] = [
	minnow,
	tetra,
	angelfish,
	shark,
	whale,
	seahorse,
	turtle,
	penguin,
	nessie,
];
