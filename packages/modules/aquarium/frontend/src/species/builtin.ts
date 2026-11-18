import { angelfish } from './creatures/angelfish';
import { jellyfish } from './creatures/jellyfish';
import { minnow } from './creatures/minnow';
import { octopus } from './creatures/octopus';
import { seahorse } from './creatures/seahorse';
import { shark } from './creatures/shark';
import { tetra } from './creatures/tetra';
import { whale } from './creatures/whale';
import type { SpeciesDefinition } from './species.types';

/** Add a new creature here. The registry picks it for matching kinds and size tiers. */
export const builtinSpecies: SpeciesDefinition[] = [
	minnow,
	tetra,
	angelfish,
	shark,
	whale,
	jellyfish,
	octopus,
	seahorse,
];
