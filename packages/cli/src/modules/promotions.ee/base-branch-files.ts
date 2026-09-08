export type BaseBranchEntityType =
	| 'project'
	| 'folder'
	| 'workflow'
	| 'credential'
	| 'dataTable'
	| 'variable'
	| 'tag';

export type BaseBranchFile = {
	path: string;
	blobSha: string;
	type: BaseBranchEntityType;
};

const ENTITY_TYPES_BY_DIRECTORY: Record<string, BaseBranchEntityType | undefined> = {
	projects: 'project',
	folders: 'folder',
	workflows: 'workflow',
	credentials: 'credential',
	'data-tables': 'dataTable',
	variables: 'variable',
	tags: 'tag',
};

const ENTITY_FILE_NAMES: Record<BaseBranchEntityType, string> = {
	project: 'project.json',
	folder: 'folder.json',
	workflow: 'workflow.json',
	credential: 'credential.json',
	dataTable: 'data-table.json',
	variable: 'variable.json',
	tag: 'tag.json',
};

const SHARED_DIRECTORIES = ['credentials', 'variables', 'tags'];

export function baseBranchPathspecs(exportRoot: string): string[] {
	return ['projects', ...SHARED_DIRECTORIES].map((directory) => `${exportRoot}/${directory}/`);
}

// Exact because ids never contain a hyphen (SAFE_ID in n8n-packages io/manifest-entry.ts)
// while every exported directory is named `<slug>-<id>`.
function entityIdOfSegment(segment: string): string {
	return segment.slice(segment.lastIndexOf('-') + 1);
}

function nameSlugOfSegment(segment: string): string {
	return segment.slice(0, segment.lastIndexOf('-'));
}

/** Parses NUL-delimited `git ls-tree -r -z` output; `-z` keeps paths unquoted. */
export function parseBaseBranchFiles(
	lsTreeOutput: string,
	{ exportRoot, projectId }: { exportRoot: string; projectId: string },
): Map<string, BaseBranchFile> {
	const files = new Map<string, BaseBranchFile>();
	const rootPrefix = `${exportRoot}/`;

	for (const record of lsTreeOutput.split('\0')) {
		const tabIndex = record.indexOf('\t');
		if (tabIndex === -1) continue;

		const [, objectType, blobSha] = record.slice(0, tabIndex).split(' ');
		if (objectType !== 'blob') continue;

		const path = record.slice(tabIndex + 1);
		if (!path.startsWith(rootPrefix)) continue;

		const segments = path.slice(rootPrefix.length).split('/');
		if (segments.length < 3) continue;

		if (segments[0] === 'projects') {
			if (entityIdOfSegment(segments[1]) !== projectId) continue;
		} else if (!SHARED_DIRECTORIES.includes(segments[0])) {
			continue;
		}

		const type = ENTITY_TYPES_BY_DIRECTORY[segments[segments.length - 3]];
		if (!type || segments[segments.length - 1] !== ENTITY_FILE_NAMES[type]) continue;

		const entitySegment = segments[segments.length - 2];
		const key =
			type === 'variable' ? nameSlugOfSegment(entitySegment) : entityIdOfSegment(entitySegment);
		files.set(key, { path, blobSha, type });
	}

	return files;
}
