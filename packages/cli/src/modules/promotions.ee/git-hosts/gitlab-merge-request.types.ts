import { z } from 'zod';

export const mergeRequestSchema = z.object({
	iid: z.number().int(),
	project_id: z.number().int(),
	web_url: z.string().refine((value) => {
		try {
			const { protocol } = new URL(value);
			return protocol === 'http:' || protocol === 'https:';
		} catch {
			return false;
		}
	}),
	title: z.string(),
	description: z.string().nullable(),
	state: z.enum(['opened', 'locked', 'merged', 'closed']),
	source_branch: z.string(),
	target_branch: z.string(),
	has_conflicts: z.boolean().optional().default(false),
	merged_at: z.string().nullable().optional(),
	closed_at: z.string().nullable().optional(),
	detailed_merge_status: z.string().nullable().optional(),
	author: z.object({ name: z.string() }).nullable().optional(),
	diff_refs: z
		.object({ base_sha: z.string().nullable(), head_sha: z.string().nullable() })
		.nullable()
		.optional(),
});

export type GitLabMergeRequest = z.infer<typeof mergeRequestSchema>;

export type MergeRequestRef = Readonly<{ projectId: number; iid: number }>;

export type MergeRequestInput = {
	projectPath: string;
	sourceBranch: string;
	targetBranch: string;
	title: string;
	description: string;
};
