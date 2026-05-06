import { readFileSync, readdirSync } from 'fs';
import { basename, extname, join } from 'path';
import { z } from 'zod';

import type { WorkflowResponse } from '../clients/n8n-client';
import { toWorkflowConnections } from '../eval-setup-topology/types';
import type { EvalEndToEndCase } from './types';

/**
 * Reuse the workflow JSON fixtures from the eval-setup-topology suite.
 * The end-to-end suite does not need its own datasets or expectation
 * sidecars — the agent generates the dataset (eval-data tool) and the
 * eval topology (eval-setup-with-agent), and the suite verifies the
 * result by actually executing the workflow.
 */
export const DEFAULT_ROOT = join(__dirname, '..', 'data', 'eval-setup-topology');

interface LoadOptions {
	rootDir?: string;
	filter?: string;
}

const workflowFixtureSchema = z
	.object({
		id: z.string().optional(),
		name: z.string().optional(),
		active: z.boolean().optional(),
		nodes: z.array(
			z
				.object({
					name: z.string(),
					type: z.string(),
					typeVersion: z.number().optional(),
					parameters: z.record(z.string(), z.unknown()).optional(),
					disabled: z.boolean().optional(),
					credentials: z.record(z.string(), z.unknown()).optional(),
				})
				.passthrough(),
		),
		connections: z.record(z.string(), z.unknown()),
		pinData: z.record(z.string(), z.unknown()).optional(),
	})
	.passthrough();

export function loadEvalEndToEndCases(options: LoadOptions = {}): EvalEndToEndCase[] {
	const rootDir = options.rootDir ?? DEFAULT_ROOT;
	const workflowsDir = join(rootDir, 'workflows');

	return readdirSync(workflowsDir)
		.filter((fileName) => extname(fileName) === '.json')
		.sort()
		.map((fileName) => basename(fileName, '.json'))
		.filter((slug) => options.filter === undefined || slug.includes(options.filter))
		.map((slug) => {
			const workflowPath = join(workflowsDir, `${slug}.json`);
			const workflow = loadWorkflow(workflowPath, slug);

			return {
				slug,
				workflowPath,
				workflow,
			};
		});
}

function loadWorkflow(workflowPath: string, slug: string): WorkflowResponse {
	const parsed = workflowFixtureSchema.safeParse(readJson(workflowPath));

	if (!parsed.success) {
		throw new Error(`Invalid workflow fixture ${workflowPath}: ${parsed.error.message}`);
	}

	return {
		...parsed.data,
		id: parsed.data.id ?? '',
		name: parsed.data.name ?? slug,
		active: parsed.data.active ?? false,
		nodes: parsed.data.nodes,
		connections: parseConnections(workflowPath, parsed.data.connections),
		pinData: parsed.data.pinData ?? {},
	};
}

function parseConnections(workflowPath: string, connections: WorkflowResponse['connections']) {
	try {
		return toWorkflowConnections(connections);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		throw new Error(`Invalid workflow fixture ${workflowPath}: ${message}`);
	}
}

function readJson(path: string): unknown {
	try {
		const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));
		return parsed;
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		throw new Error(`Invalid JSON fixture ${path}: ${message}`);
	}
}
