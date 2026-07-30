export interface WorkflowTagUsage {
	workflowId: string;
	tag: { id: string; name: string };
}

/** Locale pinned so package output is byte-stable across environments. */
export const compareTagsByName = (
	a: { id: string; name: string },
	b: { id: string; name: string },
) => a.name.localeCompare(b.name, 'en') || a.id.localeCompare(b.id, 'en');
