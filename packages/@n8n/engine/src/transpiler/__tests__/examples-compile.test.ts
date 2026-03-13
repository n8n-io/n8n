import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

import { describe, it, expect } from 'vitest';

import { TranspilerService } from '../transpiler.service';

const EXAMPLES_DIR = join(__dirname, '../../../examples');
const USE_CASES_DIR = join(__dirname, '../../../examples/use-cases');

describe('Example workflow compilation', () => {
	const transpiler = new TranspilerService();

	const exampleFiles = readdirSync(EXAMPLES_DIR)
		.filter((f) => f.endsWith('.ts'))
		.map((f) => join(EXAMPLES_DIR, f));

	const useCaseFiles = readdirSync(USE_CASES_DIR)
		.filter((f) => f.endsWith('.ts'))
		.map((f) => join(USE_CASES_DIR, f));

	const allFiles = [...exampleFiles, ...useCaseFiles];

	for (const file of allFiles) {
		const name = file.split('/').pop()!;

		it(`compiles ${name} without errors`, () => {
			const source = readFileSync(file, 'utf-8');
			const result = transpiler.compile(source);

			expect(
				result.errors,
				`Compilation errors in ${name}: ${result.errors.map((e) => e.message).join(', ')}`,
			).toHaveLength(0);
		});

		it(`${name} has at least one step node`, () => {
			const source = readFileSync(file, 'utf-8');
			const result = transpiler.compile(source);

			if (result.errors.length > 0) return; // skip if compilation failed

			const stepNodes = result.graph.nodes.filter((n) => n.type !== 'trigger');
			expect(stepNodes.length).toBeGreaterThan(0);
		});

		it(`${name} has a trigger node`, () => {
			const source = readFileSync(file, 'utf-8');
			const result = transpiler.compile(source);

			if (result.errors.length > 0) return; // skip if compilation failed

			const triggerNode = result.graph.nodes.find((n) => n.type === 'trigger');
			expect(triggerNode).toBeDefined();
		});

		it(`${name} has no undefined references in compiled code`, () => {
			const source = readFileSync(file, 'utf-8');
			const result = transpiler.compile(source);

			if (result.errors.length > 0) return; // skip if compilation failed

			// Check that compiled code doesn't reference undefined step IDs
			// by looking for ctx.input['...'] patterns and verifying the step IDs
			// exist as node IDs in the graph
			const inputRefPattern = /ctx\.input\['([^']+)'\]/g;
			let match;
			const nodeIds = new Set(result.graph.nodes.map((n) => n.id));

			while ((match = inputRefPattern.exec(result.code)) !== null) {
				const referencedId = match[1];
				expect(
					nodeIds.has(referencedId),
					`Compiled code references undefined step ID '${referencedId}' in ${name}`,
				).toBe(true);
			}
		});
	}
});
