import {
	PACKAGE_ENTITY_LAYOUT,
	WORKFLOW_LIFECYCLE_FILE_NAME,
	type ManifestEntityCollection,
} from '../n8n-packages/io/manifest-entry';

const BASE_BRANCH_ENTITIES = {
	projects: { ...PACKAGE_ENTITY_LAYOUT.projects, type: 'project', includeRoot: true },
	folders: { ...PACKAGE_ENTITY_LAYOUT.folders, type: 'folder', includeRoot: false },
	workflows: { ...PACKAGE_ENTITY_LAYOUT.workflows, type: 'workflow', includeRoot: false },
	credentials: { ...PACKAGE_ENTITY_LAYOUT.credentials, type: 'credential', includeRoot: true },
	dataTables: { ...PACKAGE_ENTITY_LAYOUT.dataTables, type: 'dataTable', includeRoot: true },
	variables: { ...PACKAGE_ENTITY_LAYOUT.variables, type: 'variable', includeRoot: true },
	tags: { ...PACKAGE_ENTITY_LAYOUT.tags, type: 'tag', includeRoot: true },
} as const satisfies Record<ManifestEntityCollection, { type: string; includeRoot: boolean }>;

export type BaseBranchFile = {
	key: string;
	path: string;
	blobSha: string;
	type: (typeof BASE_BRANCH_ENTITIES)[ManifestEntityCollection]['type'];
};

export const BASE_BRANCH_DIRECTORIES: string[] = Object.values(BASE_BRANCH_ENTITIES)
	.filter(({ includeRoot }) => includeRoot)
	.map(({ directory }) => directory);

const ENTITIES_BY_DIRECTORY = new Map<
	string,
	(typeof BASE_BRANCH_ENTITIES)[ManifestEntityCollection]
>(Object.values(BASE_BRANCH_ENTITIES).map((entity) => [entity.directory, entity]));

function entityIdOfSegment(segment: string): string {
	return segment.slice(segment.lastIndexOf('-') + 1);
}

export function parseBaseBranchFiles(
	lsTreeOutput: string,
	{ exportRoot, projectId }: { exportRoot: string; projectId: string },
): BaseBranchFile[] {
	const { projects, folders } = BASE_BRANCH_ENTITIES;
	const files: BaseBranchFile[] = [];
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

		if (segments[0] === projects.directory) {
			if (entityIdOfSegment(segments[1]) !== projectId) continue;
		} else if (!BASE_BRANCH_DIRECTORIES.includes(segments[0])) {
			continue;
		}

		const fileName = segments[segments.length - 1];
		const entity =
			segments[0] === projects.directory &&
			segments[2] === folders.directory &&
			fileName === folders.fileName
				? folders
				: ENTITIES_BY_DIRECTORY.get(segments[segments.length - 3]);
		if (!entity) continue;
		const isWorkflowLifecycle =
			entity.type === 'workflow' && fileName === WORKFLOW_LIFECYCLE_FILE_NAME;
		if (fileName !== entity.fileName && !isWorkflowLifecycle) continue;
		const { type } = entity;

		const entitySegment = segments[segments.length - 2];
		const key =
			type === 'variable'
				? entitySegment.slice(0, entitySegment.lastIndexOf('-'))
				: entityIdOfSegment(entitySegment);
		files.push({ key, path, blobSha, type });
	}

	return files;
}
