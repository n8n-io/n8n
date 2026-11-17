import { Flags } from '@oclif/core';

import type { PromotionEnvironmentSelectionProject } from '../../client';

type SelectionFlags = {
	project?: string[];
	workflow?: string[];
	folder?: string[];
	credential?: string[];
};

/**
 * The flags of a selection across projects. Each item names its project, because one command
 * holds items of several projects.
 */
export function environmentSelectionFlags(verb: 'promote' | 'apply') {
	return {
		project: Flags.string({
			char: 'p',
			description: `Project ID to ${verb} without an item of it (repeat for more than one). A project of a listed item is always included.`,
			multiple: true,
		}),
		workflow: Flags.string({
			char: 'w',
			description: `Workflow to ${verb}, as <projectId>:<workflowId> (repeat for more than one)`,
			multiple: true,
		}),
		folder: Flags.string({
			description: `Folder to ${verb}, as <projectId>:<folderId> (repeat for more than one)`,
			multiple: true,
		}),
		credential: Flags.string({
			description: `Credential to ${verb} that no selected workflow of its project uses, as <projectId>:<credentialId> (repeat for more than one)`,
			multiple: true,
		}),
	};
}

/** Groups the `<projectId>:<id>` flags by project. Fails before any request on a malformed value. */
export function toEnvironmentSelection(
	flags: SelectionFlags,
): PromotionEnvironmentSelectionProject[] {
	const projects = new Map<string, PromotionEnvironmentSelectionProject>();
	const projectOf = (projectId: string) => {
		const project = projects.get(projectId) ?? { projectId };
		projects.set(projectId, project);
		return project;
	};
	const add = (
		values: string[] | undefined,
		flag: string,
		field: 'workflowIds' | 'folderIds' | 'credentialIds',
	) => {
		for (const value of values ?? []) {
			const separator = value.indexOf(':');
			const projectId = value.slice(0, separator);
			const id = value.slice(separator + 1);
			if (separator < 1 || id === '') {
				throw new Error(`Expected --${flag} as <projectId>:<id>, got "${value}"`);
			}
			const project = projectOf(projectId);
			project[field] = [...(project[field] ?? []), id];
		}
	};

	for (const projectId of flags.project ?? []) {
		if (projectId.trim() === '') throw new Error('Expected a non-empty project ID');
		projectOf(projectId);
	}
	add(flags.workflow, 'workflow', 'workflowIds');
	add(flags.folder, 'folder', 'folderIds');
	add(flags.credential, 'credential', 'credentialIds');

	if (projects.size === 0) {
		throw new Error('Select at least one project, workflow, folder or credential');
	}
	return [...projects.values()];
}
