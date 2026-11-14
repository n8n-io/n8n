import { readFile } from 'node:fs/promises';

import { loadOverrides } from './overrides';
import { formatReport } from './report';
import { resolveOperations } from './resolve-operations';
import { parseYaml } from './spec/parse-yaml';
import { readSpec } from './spec/read-spec';
import type { Spec, SpecOptions } from './types';

export interface GenerateConfig {
	envelopeFile: string;
	routesFile: string;
	overridesFile: string;
	spec: SpecOptions;
}

export interface GenerateResult {
	report: string;
	errors: string[];
}

async function loadSpec(config: GenerateConfig): Promise<Spec> {
	const [routes, envelope] = await Promise.all([
		readFile(config.routesFile, 'utf8'),
		readFile(config.envelopeFile, 'utf8'),
	]);
	return readSpec({ routes: parseYaml(routes), envelope: parseYaml(envelope) }, config.spec);
}

export async function generate(config: GenerateConfig): Promise<GenerateResult> {
	const [spec, overrides] = await Promise.all([
		loadSpec(config),
		loadOverrides(config.overridesFile),
	]);
	const { rows, errors } = resolveOperations(spec, overrides);
	return { report: formatReport(rows), errors };
}
