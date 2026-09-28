import { Args } from '@oclif/core';

import type { PromotionDirection } from '../../client';

const DIRECTIONS: readonly PromotionDirection[] = ['apply', 'promote'];

/** Positional argument for the commands that address one direction of a connection. */
export const directionArg = Args.string({
	description: 'Direction to address',
	options: [...DIRECTIONS],
	required: true,
});

/** oclif rejects any other value, so this only narrows the parsed string. */
export function toDirection(value: string): PromotionDirection {
	const direction = DIRECTIONS.find((candidate) => candidate === value);
	if (!direction) throw new Error(`Expected "apply" or "promote", got "${value}"`);
	return direction;
}
