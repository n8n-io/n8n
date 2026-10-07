export const LINKED_INSTANCE_STATUSES = [
	'online',
	'offline',
	'unauthorised',
	'mcp-disabled',
	'unknown',
] as const;

/** Result of the last check of a linked instance. */
export type LinkedInstanceStatus = (typeof LINKED_INSTANCE_STATUSES)[number];

/** What a user can see of a linked instance. It never holds the access token. */
export type LinkedInstanceSummary = {
	id: string;
	name: string;
	baseUrl: string;
	status: LinkedInstanceStatus;
	lastVerifiedAt: string | null;
	createdAt: string;
};
