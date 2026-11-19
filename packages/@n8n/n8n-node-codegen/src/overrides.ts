import { pathToFileURL } from 'node:url';
import { z } from 'zod';

import { parse } from './parse';

const overridesSchema = z.object({ exclude: z.record(z.string()) }).strict();

const moduleSchema = z.object({ overrides: overridesSchema });

export type Overrides = z.infer<typeof overridesSchema>;

export async function loadOverrides(file: string): Promise<Overrides> {
	const loaded: unknown = await import(pathToFileURL(file).href);
	return parse(moduleSchema, loaded, `the overrides in ${file}`).overrides;
}
