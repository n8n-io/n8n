import { readFileSync, readdirSync } from 'fs';
import { basename, extname, join } from 'path';
import { z } from 'zod';

import type { WorkflowJSON } from '@n8n/workflow-sdk';

import type { WorkflowResponse } from '../clients/n8n-client';
import { toWorkflowConnections } from '../eval-setup-topology/types';
import { detectAiNodes } from '../../src/tools/evals/detect-ai-nodes';
import type { EvalDataTableSpec, EvalEndToEndCase, EvalEndToEndMode } from './types';

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

const evalDataTableSchema = z.object({
	name: z.string().min(1),
	columns: z.array(
		z.object({
			name: z.string().min(1),
			type: z.enum(['string', 'number', 'boolean', 'date']),
		}),
	),
	rows: z.array(z.record(z.string(), z.unknown())),
});

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
		evalDataTable: evalDataTableSchema.optional(),
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
			const { workflow, evalDataTable } = loadWorkflow(workflowPath, slug);
			const mode = detectMode(workflow);

			return {
				slug,
				workflowPath,
				workflow,
				mode,
				...(evalDataTable === undefined ? {} : { evalDataTable }),
			};
		});
}

function detectMode(workflow: WorkflowResponse): EvalEndToEndMode {
	const detection = detectAiNodes(workflow as unknown as WorkflowJSON);
	if (detection.alreadyConfigured) return 'already-configured';
	if (!detection.isAiWorkflow) return 'no-ai-nodes';
	return 'eligible';
}

function loadWorkflow(
	workflowPath: string,
	slug: string,
): { workflow: WorkflowResponse; evalDataTable?: EvalDataTableSpec } {
	const parsed = workflowFixtureSchema.safeParse(readJson(workflowPath));

	if (!parsed.success) {
		throw new Error(`Invalid workflow fixture ${workflowPath}: ${parsed.error.message}`);
	}

	const { evalDataTable, ...workflowFields } = parsed.data;

	const workflow: WorkflowResponse = {
		...workflowFields,
		id: parsed.data.id ?? '',
		name: parsed.data.name ?? slug,
		active: parsed.data.active ?? false,
		nodes: parsed.data.nodes,
		connections: parseConnections(workflowPath, parsed.data.connections),
		pinData: parsed.data.pinData ?? {},
	};

	return evalDataTable === undefined ? { workflow } : { workflow, evalDataTable };
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
