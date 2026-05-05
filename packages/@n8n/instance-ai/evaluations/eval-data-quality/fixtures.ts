import { existsSync, readFileSync, readdirSync } from 'fs';
import { basename, extname, join } from 'path';
import { z } from 'zod';

import { datasetSidecarSchema, type EvalDataQualityCase } from './types';
import type { WorkflowResponse } from '../clients/n8n-client';

export const DEFAULT_ROOT = join(__dirname, '..', 'data', 'eval-data-quality');

interface LoadEvalDataQualityCasesOptions {
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
		settings: z.record(z.string(), z.unknown()).optional(),
	})
	.passthrough();

export function loadEvalDataQualityCases(
	options: LoadEvalDataQualityCasesOptions = {},
): EvalDataQualityCase[] {
	const rootDir = options.rootDir ?? DEFAULT_ROOT;
	const workflowsDir = join(rootDir, 'workflows');
	const expectationsDir = join(rootDir, 'expectations');

	if (!existsSync(workflowsDir)) {
		return [];
	}

	return readdirSync(workflowsDir)
		.filter((fileName) => extname(fileName) === '.json')
		.sort()
		.map((fileName) => basename(fileName, '.json'))
		.filter((slug) => options.filter === undefined || slug.includes(options.filter))
		.map((slug) => {
			const workflowPath = join(workflowsDir, `${slug}.json`);
			const sidecarPath = join(expectationsDir, `${slug}.dataset.json`);

			if (!existsSync(sidecarPath)) {
				throw new Error(`Missing dataset sidecar for ${slug}: ${sidecarPath}`);
			}

			const workflow = loadWorkflow(workflowPath, slug);
			const sidecar = loadSidecar(sidecarPath);

			return {
				slug,
				workflowPath,
				sidecarPath,
				workflow,
				sidecar,
			};
		});
}

function loadWorkflow(workflowPath: string, slug: string): WorkflowResponse {
	const workflow = workflowFixtureSchema.safeParse(readJson(workflowPath));

	if (!workflow.success) {
		throw new Error(`Invalid workflow fixture ${workflowPath}: ${workflow.error.message}`);
	}

	return {
		...workflow.data,
		id: workflow.data.id ?? '',
		name: workflow.data.name ?? slug,
		active: workflow.data.active ?? false,
		nodes: workflow.data.nodes,
		connections: workflow.data.connections,
		pinData: workflow.data.pinData ?? {},
	};
}

function loadSidecar(sidecarPath: string) {
	const sidecar = datasetSidecarSchema.safeParse(readJson(sidecarPath));

	if (!sidecar.success) {
		throw new Error(`Invalid dataset sidecar ${sidecarPath}: ${sidecar.error.message}`);
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
