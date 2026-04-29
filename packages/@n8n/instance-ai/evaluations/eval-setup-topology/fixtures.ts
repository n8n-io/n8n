import { existsSync, readFileSync, readdirSync } from 'fs';
import { basename, extname, join } from 'path';
import { z } from 'zod';

import type { WorkflowResponse } from '../clients/n8n-client';
import {
	datasetRowsSchema,
	type DatasetRow,
	type EvalSetupTopologyCase,
	topologySidecarSchema,
	toWorkflowConnections,
} from './types';

export const DEFAULT_ROOT = join(__dirname, '..', 'data', 'eval-setup-topology');

interface LoadEvalSetupTopologyCasesOptions {
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

export function loadEvalSetupTopologyCases(
	options: LoadEvalSetupTopologyCasesOptions = {},
): EvalSetupTopologyCase[] {
	const rootDir = options.rootDir ?? DEFAULT_ROOT;
	const workflowsDir = join(rootDir, 'workflows');
	const datasetsDir = join(rootDir, 'datasets');
	const expectationsDir = join(rootDir, 'expectations');

	return readdirSync(workflowsDir)
		.filter((fileName) => extname(fileName) === '.json')
		.sort()
		.map((fileName) => basename(fileName, '.json'))
		.filter((slug) => options.filter === undefined || slug.includes(options.filter))
		.map((slug) => {
			const workflowPath = join(workflowsDir, `${slug}.json`);
			const datasetPath = join(datasetsDir, `${slug}.rows.json`);
			const candidateSidecarPath = join(expectationsDir, `${slug}.topology.json`);

			if (!existsSync(datasetPath)) {
				throw new Error(`Missing dataset fixture for ${slug}`);
			}

			const workflow = loadWorkflow(workflowPath, slug);
			const datasetRows = loadDatasetRows(datasetPath);
			const sidecarPath = existsSync(candidateSidecarPath) ? candidateSidecarPath : undefined;
			const sidecar =
				sidecarPath === undefined
					? topologySidecarSchema.parse({})
					: loadTopologySidecar(sidecarPath);

			return {
				slug,
				workflowPath,
				datasetPath,
				...(sidecarPath === undefined ? {} : { sidecarPath }),
				workflow,
				datasetRows,
				datasetColumns: getDatasetColumns(datasetRows),
				sidecar,
			};
		});
}

function loadWorkflow(workflowPath: string, slug: string): WorkflowResponse {
	const workflow = workflowFixtureSchema.safeParse(readJson(workflowPath));

	if (!workflow.success) {
		throw new Error(`Invalid workflow fixture ${workflowPath}: ${workflow.error.message}`);
	}

	const response = {
		...workflow.data,
		id: workflow.data.id ?? '',
		name: workflow.data.name ?? slug,
		active: workflow.data.active ?? false,
		nodes: workflow.data.nodes,
		connections: parseWorkflowConnections(workflowPath, workflow.data.connections),
		pinData: workflow.data.pinData ?? {},
	};

	return response;
}

function parseWorkflowConnections(
	workflowPath: string,
	connections: WorkflowResponse['connections'],
) {
	try {
		return toWorkflowConnections(connections);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		throw new Error(`Invalid workflow fixture ${workflowPath}: ${message}`);
	}
}

function loadDatasetRows(datasetPath: string): DatasetRow[] {
	const rows = datasetRowsSchema.safeParse(readJson(datasetPath));

	if (!rows.success) {
		throw new Error(`Invalid dataset fixture ${datasetPath}: ${rows.error.message}`);
	}

	return rows.data;
}

function loadTopologySidecar(sidecarPath: string) {
	const sidecar = topologySidecarSchema.safeParse(readJson(sidecarPath));

	if (!sidecar.success) {
		throw new Error(`Invalid topology sidecar ${sidecarPath}: ${sidecar.error.message}`);
	}

	return sidecar.data;
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

function getDatasetColumns(rows: Array<Record<string, unknown>>): string[] {
	const columns = new Set<string>();

	for (const row of rows) {
		for (const columnName of Object.keys(row)) {
			columns.add(columnName);
		}
	}

	return [...columns];
}
