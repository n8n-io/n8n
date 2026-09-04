export const FORMAT_VERSION = '1';

export const MANIFEST_FILE = 'manifest.json';

/** The kinds of entity a manifest lists, each under its own key. */
export const ENTITY_KINDS = [
	'projects',
	'folders',
	'workflows',
	'credentials',
	'dataTables',
	'variables',
	'tags',
] as const;

export type EntityKind = (typeof ENTITY_KINDS)[number];

/**
 * The file that holds one entity, inside the directory its entry targets. The
 * exporters write these and the parser reads them, so the file also marks what
 * a directory holds.
 */
export const ENTITY_FILES = {
	projects: 'project.json',
	folders: 'folder.json',
	workflows: 'workflow.json',
	credentials: 'credential.json',
	dataTables: 'data-table.json',
	variables: 'variable.json',
	tags: 'tag.json',
} as const satisfies Record<EntityKind, string>;
