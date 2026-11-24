import { z } from 'zod';

export const skillImportIssueSchema = z.object({
	type: z.literal('skill-conflict'),
	skillId: z.string(),
	message: z.string(),
});

export type SkillImportIssue = z.infer<typeof skillImportIssueSchema>;

export const importedSkillSummarySchema = z.object({
	sourceSkillId: z.string(),
	localId: z.string(),
	name: z.string(),
	projectId: z.string().nullable(),
	status: z.enum(['created', 'updated', 'unchanged', 'skipped', 'deleted']),
	followingAgentCount: z.number().int().nonnegative(),
});

export type ImportedSkillSummary = z.infer<typeof importedSkillSummarySchema>;

export const skillImportCountsSchema = z.object({
	created: z.number().int().nonnegative(),
	updated: z.number().int().nonnegative(),
	unchanged: z.number().int().nonnegative(),
	skipped: z.number().int().nonnegative(),
	deleted: z.number().int().nonnegative(),
});

export type SkillImportCounts = z.infer<typeof skillImportCountsSchema>;
