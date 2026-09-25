import { z } from 'zod';

import { nodePreferenceGroupsSchema, preferenceThresholdsSchema } from './node-preference-miner';

const id = z.string().min(1).max(200);
const category = z.enum(['node', 'credential', 'folder', 'parameter', 'naming']);

export const labDatasetSchema = z
	.object({
		version: z.literal(1),
		name: id,
		projects: z.array(z.object({ id, name: id })).min(1),
		groups: nodePreferenceGroupsSchema,
		dimensions: z.array(
			z.object({ key: id, category, description: z.string(), contexts: z.array(id) }),
		),
		folders: z.array(
			z.object({ id, projectId: id, name: id, parentFolderId: id.nullable().optional() }),
		),
		credentials: z.array(
			z.object({
				id,
				name: id,
				type: id,
				projectIds: z.array(id),
				usable: z.boolean(),
			}),
		),
		workflows: z
			.array(
				z.object({
					id,
					name: id,
					projectId: id,
					folderId: id.nullable(),
					readable: z.boolean(),
					archived: z.boolean(),
					nodes: z.array(
						z.object({
							name: id,
							type: id,
							parameters: z.record(z.unknown()),
							credentials: z.record(id),
						}),
					),
					connections: z.record(z.unknown()),
				}),
			)
			.max(1000),
		threads: z
			.array(
				z.object({
					id,
					projectId: id,
					folderId: id.nullable(),
					createdAt: z.string().datetime(),
					messages: z.array(
						z.object({ id, role: z.enum(['user', 'assistant']), content: z.string().max(20000) }),
					),
				}),
			)
			.max(30),
		probes: z.array(
			z.object({
				id,
				projectId: id,
				folderId: id.nullable(),
				query: z.string(),
				contexts: z.array(id),
				expected: z.array(z.object({ key: id, value: id })),
				forbidden: z.array(z.object({ key: id, value: id })),
			}),
		),
	})
	.superRefine((data, ctx) => {
		for (const [name, items] of Object.entries({
			projects: data.projects.map((x) => x.id),
			workflows: data.workflows.map((x) => x.id),
			threads: data.threads.map((x) => x.id),
			folders: data.folders.map((x) => x.id),
			credentials: data.credentials.map((x) => x.id),
			dimensions: data.dimensions.map((x) => x.key),
			probes: data.probes.map((x) => x.id),
			messages: data.threads.flatMap((x) => x.messages.map((m) => m.id)),
		})) {
			if (new Set(items).size !== items.length)
				ctx.addIssue({ code: 'custom', message: `${name} must have unique IDs.` });
		}
		const projects = new Set(data.projects.map((x) => x.id));
		for (const item of [...data.workflows, ...data.threads, ...data.probes, ...data.folders]) {
			if (!projects.has(item.projectId))
				ctx.addIssue({ code: 'custom', message: `Unknown project: ${item.projectId}` });
			if (
				'folderId' in item &&
				item.folderId &&
				!data.folders.some((f) => f.id === item.folderId && f.projectId === item.projectId)
			) {
				ctx.addIssue({ code: 'custom', message: `Unknown folder in project: ${item.folderId}` });
			}
		}
	});

export const labOptionsSchema = z.object({
	projectId: id,
	thresholds: preferenceThresholdsSchema.default({}),
	topK: z.number().int().min(1).max(30).default(5),
});

export const MAXIMUM_CANDIDATES_PER_SOURCE = 12;
export const CONSOLIDATION_BATCH_SIZE = 8;

export const extractionSchema = z.object({
	preferences: z
		.array(
			z.object({
				key: id,
				value: z.string().min(1).max(500),
				content: z.string().min(1).max(280),
				contexts: z.array(id).min(1).max(6),
				folderId: id.nullable(),
				quote: z.string().min(1).max(160),
			}),
		)
		.max(MAXIMUM_CANDIDATES_PER_SOURCE),
});

export const consolidationSchema = z.object({
	preferences: z
		.array(
			z.object({
				candidateIds: z.array(id).min(1).max(CONSOLIDATION_BATCH_SIZE),
				content: z.string().min(1).max(280),
			}),
		)
		.max(CONSOLIDATION_BATCH_SIZE),
});

export const reflectionSchema = z.object({
	drop: z.array(z.string()),
	merge: z.array(z.object({ supersedes: z.array(z.string()), content: z.string() })),
});

export type LabDataset = z.infer<typeof labDatasetSchema>;
export type LabOptions = z.infer<typeof labOptionsSchema>;
export type Extraction = z.infer<typeof extractionSchema>;
export type Consolidation = z.infer<typeof consolidationSchema>;
export type Reflection = z.infer<typeof reflectionSchema>;
export type {
	PreferenceMiningApproach as Approach,
	MinedPreference as Preference,
	PreferenceMiningMetrics as LabMetrics,
	PreferenceMiningResult as LabResult,
} from '@n8n/api-types';

import type {
	MinedPreference as Preference,
	PreferenceMiningMetrics as LabMetrics,
} from '@n8n/api-types';

export interface LabModel {
	extract(instruction: string, data: unknown, sourceId?: string): Promise<Extraction>;
	consolidate(instruction: string, data: unknown, sourceId?: string): Promise<Consolidation>;
	reflect(instruction: string, data: unknown, sourceId?: string): Promise<Reflection>;
	metrics(): Omit<LabMetrics, 'elapsedMs'>;
}

export interface MemoryHelpers {
	hash(content: string): string;
	recall(preferences: Preference[], query: string, topK: number): string[];
	captureInstruction: string;
	reflectionInstruction: string;
}
