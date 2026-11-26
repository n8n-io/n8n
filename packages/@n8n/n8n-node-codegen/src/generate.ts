import { readFile } from 'node:fs/promises';

import { buildProperties, renderProperties } from './build-properties';
import { loadOverrides } from './overrides';
import { formatReport } from './report';
import { resolveOperations } from './resolve-operations';
import { parseYaml } from './spec/parse-yaml';
import { readSpec } from './spec/read-spec';
import type { GenerateConfig, Spec } from './types';

interface GenerateResult {
	report: string;
	errors: string[];
	content: string;
}

async function loadSpec(config: GenerateConfig): Promise<Spec> {
	const [routes, envelope] = await Promise.all([
		readFile(config.routesFile, 'utf8'),
		readFile(config.envelopeFile, 'utf8'),
	]);
	return readSpec({ routes: parseYaml(routes), envelope: parseYaml(envelope) }, config.spec);
}

export async function generate(config: GenerateConfig): Promise<GenerateResult> {
	const [spec, { overrides, defaultResource }] = await Promise.all([
		loadSpec(config),
		loadOverrides(config.overridesFile),
	]);
	const { rows, errors } = resolveOperations(spec, overrides, defaultResource);
	const inNode = rows.filter((row) => row.excludeReason === undefined);
	return {
		report: formatReport(rows),
		errors,
		content: renderProperties(buildProperties(inNode, config.spec, defaultResource)),
	};
}
