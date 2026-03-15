/**
 * Seeds the database with example workflows from the examples/ directory.
 * Called on server startup — skips workflows that already exist (idempotent).
 * Scans both examples/ (numbered examples) and examples/use-cases/ (ported fixtures).
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import type { DataSource } from '@n8n/typeorm';

import { TranspilerService } from './transpiler/transpiler.service';
import { WorkflowEntity } from './database/entities/workflow.entity';

const EXAMPLES_DIR = join(__dirname, '../examples');
const USE_CASES_DIR = join(__dirname, '../examples/use-cases');

/**
 * Scans a directory for .ts files and returns their full paths sorted alphabetically.
 */
function scanTsFiles(dir: string): string[] {
	if (!existsSync(dir)) {
		return [];
	}
	try {
		return readdirSync(dir)
			.filter((f) => f.endsWith('.ts'))
			.sort()
			.map((f) => join(dir, f));
	} catch {
		return [];
	}
}

/**
 * Extracts the workflow name from defineWorkflow({ name: '...' }) in the source.
 * Falls back to a filename-derived name if extraction fails.
 */
function extractWorkflowName(source: string, filePath: string): string {
	// Match the name property in the defineWorkflow() object literal.
	// Uses [\s\S]*? to cross any characters (including braces in preceding code).
	const match = source.match(/defineWorkflow\s*\(\s*\{[\s\S]*?name\s*:\s*['"]([^'"]+)['"]/);
	if (match) {
		return match[1];
	}
	return fileNameToDisplayName(filePath);
}

/**
 * Converts a filename to a human-readable workflow name.
 * - "01-hello-world" → "01 - Hello World"
 * - "f01-simple-chain" → "F01 - Simple Chain"
 * - "f31a-filter-string-contains" → "F31a - Filter String Contains"
 */
function fileNameToDisplayName(filePath: string): string {
	const raw = basename(filePath, '.ts');
	// Match numbered prefix (e.g., "01-...", "f01-...", "f31a-...")
	const match = raw.match(/^([a-zA-Z]?\d+[a-z]?)-(.+)$/);
	if (match) {
		const prefix = match[1].charAt(0).toUpperCase() + match[1].slice(1);
		const rest = match[2]
			.split('-')
			.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
			.join(' ');
		return `${prefix} - ${rest}`;
	}
	return raw
		.split('-')
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
		.join(' ');
}

/**
 * Generates a deterministic UUID from a workflow name.
 * Same name always produces the same ID, so multiple instances
 * seeding concurrently won't create duplicate workflows.
 */
function deterministicId(name: string): string {
	const hash = createHash('sha256').update(`engine-seed:${name}`).digest('hex');
	// Format as UUID: 8-4-4-4-12
	return [
		hash.slice(0, 8),
		hash.slice(8, 12),
		hash.slice(12, 16),
		hash.slice(16, 20),
		hash.slice(20, 32),
	].join('-');
}

export async function seedExampleWorkflows(dataSource: DataSource): Promise<void> {
	const transpiler = new TranspilerService();

	// Scan both directories
	const exampleFiles = scanTsFiles(EXAMPLES_DIR);
	const useCaseFiles = scanTsFiles(USE_CASES_DIR);
	const allFiles = [...exampleFiles, ...useCaseFiles];

	if (allFiles.length === 0) {
		console.log('No example files found, skipping seed');
		return;
	}

	const workflowRepo = dataSource.getRepository(WorkflowEntity);

	// Build a map of existing workflows by name for idempotency + update detection
	const existingWorkflows = await workflowRepo.find({ select: ['id', 'version', 'name', 'code'] });
	const existingByName = new Map(existingWorkflows.map((w) => [w.name, w]));

	let seeded = 0;
	let updated = 0;

	for (const filePath of allFiles) {
		const source = readFileSync(filePath, 'utf-8');
		const name = extractWorkflowName(source, filePath);

		// Check both the source-derived name and the filename-derived name
		// to handle renames (e.g., adding "(Not supported yet)" suffix)
		const fileBasedName = fileNameToDisplayName(filePath);
		const existing = existingByName.get(name) ?? existingByName.get(fileBasedName);

		// Skip if already seeded with identical code
		if (existing && existing.code === source) {
			continue;
		}

		try {
			const compiled = transpiler.compile(source);

			if (compiled.errors.length > 0) {
				console.warn(`  Skipping ${basename(filePath)}: ${compiled.errors[0].message}`);
				continue;
			}

			if (existing) {
				// Update existing workflow with new version
				const workflow = workflowRepo.create({
					id: existing.id,
					version: existing.version + 1,
					name,
					code: source,
					compiledCode: compiled.code,
					triggers: compiled.triggers,
					settings: {},
					graph: compiled.graph,
					sourceMap: compiled.sourceMap,
					active: false,
				});
				await workflowRepo.save(workflow);
				updated++;
				console.log(`  ↻ ${name} (updated)`);
			} else {
				const id = deterministicId(name);
				// Use INSERT ... ON CONFLICT DO NOTHING so concurrent instances
				// don't create duplicates (all generate the same deterministic id).
				const result = await workflowRepo
					.createQueryBuilder()
					.insert()
					.into(WorkflowEntity)
					.values({
						id,
						version: 1,
						name,
						code: source,
						compiledCode: compiled.code,
						triggers: compiled.triggers,
						settings: {},
						graph: compiled.graph,
						sourceMap: compiled.sourceMap,
						active: false,
					} as Record<string, unknown>)
					.orIgnore()
					.execute();

				if (result.identifiers.length > 0) {
					seeded++;
					console.log(`  ✓ ${name}`);
				}
			}
		} catch (err) {
			console.warn(`  ✗ ${basename(filePath)}: ${(err as Error).message}`);
		}
	}

	if (seeded > 0 || updated > 0) {
		console.log(`Seeding complete: ${seeded} new, ${updated} updated`);
	}
}
