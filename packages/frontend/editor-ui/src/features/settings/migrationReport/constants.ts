/** General breaking-changes docs for the target major version. */
export const BREAKING_CHANGES_DOCUMENTATION_URL =
	'https://docs.n8n.io/changelog/v30-breaking-changes';

/**
 * How the archive modal opens: `prompt` after a won't fix on a single row,
 * `confirm` before a bulk "Mark won't fix and archive".
 */
export type ArchiveWorkflowsModalMode = 'prompt' | 'confirm';
