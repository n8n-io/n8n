/** Summary of the versions created since a workflow's last published version. */
export type WorkflowChangelog = {
	authors: string[];
	from: string;
	to: string;
} | null;
