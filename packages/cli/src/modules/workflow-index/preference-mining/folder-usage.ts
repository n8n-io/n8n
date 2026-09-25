import type { LabDataset, LabOptions } from './lab-types';
import { emptyResult, runCredentials, runNodes } from './preference-lab';

/** Expand the folder tree captured with this experiment. */
export function preferenceFolderIds(data: LabDataset, folderId: string) {
	const ids = new Set([folderId]);
	let changed = true;
	while (changed) {
		changed = false;
		for (const folder of data.folders) {
			if (folder.parentFolderId && ids.has(folder.parentFolderId) && !ids.has(folder.id)) {
				ids.add(folder.id);
				changed = true;
			}
		}
	}
	return [...ids];
}

export async function runFolderUsage(data: LabDataset, options: LabOptions) {
	const result = emptyResult('folder-usage');
	for (const folder of data.folders.filter((entry) => entry.projectId === options.projectId)) {
		const folderIds = preferenceFolderIds(data, folder.id);
		const scoped = {
			...data,
			workflows: data.workflows.filter(
				(workflow) => workflow.folderId && folderIds.includes(workflow.folderId),
			),
		};
		const nodes = await runNodes(scoped, options);
		const credentials = runCredentials(scoped, options);
		result.preferences.push(
			...[...nodes.preferences, ...credentials.preferences].map((preference) => ({
				...preference,
				content: `In folder ${folder.name} and its subfolders: ${preference.content.replace(' in this project.', '.')}`,
				id: `${folder.id}:${preference.id}`,
				folderId: folder.id,
				folderIds,
				origin: 'folder-usage' as const,
			})),
		);
	}
	result.notes.push(
		'Counts each folder with its descendants. Uses the same thresholds as project-wide usage. No model calls.',
	);
	return result;
}
