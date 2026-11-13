import { pathToFileURL } from 'node:url';
import { z } from 'zod';

const overridesSchema = z.object({ exclude: z.record(z.string()) }).strict();

const moduleSchema = z.object({ overrides: overridesSchema });

export type Overrides = z.infer<typeof overridesSchema>;

export async function loadOverrides(file: string): Promise<Overrides> {
	const result = moduleSchema.safeParse(await import(pathToFileURL(file).href));
	if (result.success) return result.data.overrides;
	const issues = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
	throw new Error(`Cannot read the overrides in ${file}:\n- ${issues.join('\n- ')}`);
}
