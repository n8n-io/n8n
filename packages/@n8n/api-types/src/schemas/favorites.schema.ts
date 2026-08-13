export type FavoriteResourceType =
	| 'workflow'
	| 'project'
	| 'dataTable'
	| 'folder'
	| 'agent'
	| 'file';
export const FAVORITE_RESOURCE_TYPES = [
	'workflow',
	'project',
	'dataTable',
	'folder',
	'agent',
	'file',
] as const;
