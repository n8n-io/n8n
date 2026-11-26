import type { INodeProperties } from 'n8n-workflow';
import { readFile } from 'node:fs/promises';

import { buildProperties, renderProperties } from './build-properties';
import { overridesModuleSchema } from './overrides';
import { loadModule } from './parse';
import { formatReport } from './report';
import { resolveOperations } from './resolve-operations';
import { parseYaml } from './spec/parse-yaml';
import { readSpec } from './spec/read-spec';
import type { GenerateConfig, Spec } from './types';

interface GenerateResult {
	report: string;
	errors: string[];
	properties: INodeProperties[];
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
		loadModule({
			file: config.overridesFile,
			schema: overridesModuleSchema,
			subject: 'the overrides',
		}),
	]);
	const { rows, errors } = resolveOperations(spec, overrides, defaultResource);
	const inNode = rows.filter((row) => row.excludeReason === undefined);
	const properties = buildProperties(inNode, config.spec, defaultResource);
	return { report: formatReport(rows), errors, properties, content: renderProperties(properties) };
}
