#!/usr/bin/env node

import { findLangTracerSuite, LangTracerClient } from '../langtracer/client';
import { resolveLangTracerConfig } from '../langtracer/config';

async function main(): Promise<void> {
	const requested = process.argv[2]?.trim();
	if (!requested) throw new Error('A LangTracer suite slug or ID is required.');

	const client = new LangTracerClient(resolveLangTracerConfig());
	const suites = await client.listSuites();
	const suite = findLangTracerSuite(suites, requested);
	if (!suite) throw new Error(`LangTracer suite "${requested}" was not found.`);

	process.stdout.write(suite.slug);
}

void main().catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exitCode = 1;
});
