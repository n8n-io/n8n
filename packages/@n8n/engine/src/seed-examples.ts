/**
 * Seeds the database with example workflows from the examples/ directory.
 * Called on server startup — skips workflows that already exist (idempotent).
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import type { DataSource } from '@n8n/typeorm';

import { TranspilerService } from './transpiler/transpiler.service';
import { WorkflowEntity } from './database/entities/workflow.entity';

const EXAMPLES_DIR = join(__dirname, '../examples');

// After transpilation, extract trigger configs from the source code
function extractTriggers(source: string): Array<Record<string, unknown>> {
	const triggers: Array<Record<string, unknown>> = [];
	// Match webhook('/path', { method: 'POST', responseMode: '...' })
	const webhookRegex = /webhook\(\s*['"]([^'"]+)['"]\s*(?:,\s*\{([^}]*)\})?\s*\)/g;
	let match;
	while ((match = webhookRegex.exec(source)) !== null) {
		const path = match[1];
		const configStr = match[2] ?? '';
		const method = configStr.match(/method\s*:\s*['"]([^'"]+)['"]/)?.[1] ?? 'POST';
		const responseMode = configStr.match(/responseMode\s*:\s*['"]([^'"]+)['"]/)?.[1] ?? 'lastNode';
		triggers.push({
			type: 'webhook',
			config: { path, method, responseMode },
		});
	}
	return triggers;
}

export async function seedExampleWorkflows(dataSource: DataSource): Promise<void> {
	const transpiler = new TranspilerService();

	let files: string[];
	try {
		files = readdirSync(EXAMPLES_DIR)
			.filter((f) => f.endsWith('.ts'))
			.sort();
	} catch {
		console.log('No examples directory found, skipping seed');
		return;
	}

	const workflowRepo = dataSource.getRepository(WorkflowEntity);

	// Check if we already have workflows — if so, skip seeding
	const existingCount = await workflowRepo.count();
	if (existingCount > 0) {
		return;
	}

	console.log(`Seeding ${files.length} example workflows...`);

	for (const file of files) {
		const filePath = join(EXAMPLES_DIR, file);
		const source = readFileSync(filePath, 'utf-8');
		const raw = basename(file, '.ts');
		// "01-hello-world" → "01 - Hello World"
		const match = raw.match(/^(\d+)-(.+)$/);
		const name = match
			? `${match[1]} - ${match[2]
					.split('-')
					.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
					.join(' ')}`
			: raw
					.split('-')
					.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
					.join(' ');

		try {
			const compiled = transpiler.compile(source);

			if (compiled.errors.length > 0) {
				console.warn(`  Skipping ${file}: ${compiled.errors[0].message}`);
				continue;
			}

			const id = crypto.randomUUID();

			const workflow = workflowRepo.create({
				id,
				version: 1,
				name,
				code: source,
				compiledCode: compiled.code,
				triggers: extractTriggers(source),
				settings: {},
				graph: compiled.graph,
				sourceMap: compiled.sourceMap,
				active: false,
			});
			await workflowRepo.save(workflow);

			console.log(`  ✓ ${name}`);
		} catch (err) {
			console.warn(`  ✗ ${file}: ${(err as Error).message}`);
		}
	}
}
