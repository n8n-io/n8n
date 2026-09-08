#!/usr/bin/env node
import { writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const outputFile = resolve(
	repositoryRoot,
	'packages/@n8n/instance-ai/src/tools/nodes/credential-setupability.json',
);
const endpoint = process.env.N8N_CREDENTIAL_SETUPABILITY_ENDPOINT;

const roundSetupability = (value) => (value === null ? null : Math.round(value * 20) / 20);
export const roundPopularity = (value) => (value === null ? null : Math.round(value * 10) / 10);

async function main() {
	if (!endpoint) {
		throw new Error('N8N_CREDENTIAL_SETUPABILITY_ENDPOINT is required.');
	}

	console.log('Fetching credential setupability data.');
	const response = await fetch(endpoint, { signal: AbortSignal.timeout(10_000) });
	if (!response.ok) {
		throw new Error(`Credential setupability endpoint returned HTTP ${response.status}.`);
	}

	const data = await response.json();
	if (!Array.isArray(data) || data.length === 0) {
		throw new Error('Credential setupability endpoint returned no data.');
	}

	const metrics = data.map(({ id, setupability, popularity }) => ({
		id,
		setupability: roundSetupability(setupability),
		popularity: roundPopularity(popularity),
	}));

	await writeFile(outputFile, `${JSON.stringify(metrics, null, '\t')}\n`, 'utf8');
	console.log(`Saved credential setupability data for ${metrics.length} credential types.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	main().catch((error) => {
		console.error(error instanceof Error ? error.message : String(error));
		process.exitCode = 1;
	});
}
