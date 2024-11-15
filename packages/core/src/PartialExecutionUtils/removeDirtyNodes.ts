import type { IRunData } from 'n8n-workflow';

export function removeDirtyNodes(runData: IRunData, dirtyNodeNames: string[]) {
	const prunedRunData = { ...runData };
	// Remove run data for nodes that are dirty. Which means their parameters or
	// settings were changed in the editor in between runs.
	for (const dirtyNode of dirtyNodeNames) {
		delete prunedRunData[dirtyNode];
	}

	return prunedRunData;
}
