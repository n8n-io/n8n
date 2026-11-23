import {
	WorkflowDependencies,
	WorkflowDependencyRepository,
	type WorkflowDependency,
} from '@n8n/db';
import { Container } from '@n8n/di';

import { stripToolSuffix } from '@/utils';

/**
 * Replaces the draft rows (`publishedVersionId` null) or the published rows of the workflow in the
 * dependency index with one row for each key.
 */
export async function indexVersion(
	workflow: { id: string; versionCounter: number },
	publishedVersionId: string | null,
	dependencyType: WorkflowDependency['dependencyType'],
	keys: string[],
) {
	const dependencies = new WorkflowDependencies(
		workflow.id,
		workflow.versionCounter + 1,
		publishedVersionId,
	);
	for (const [index, dependencyKey] of keys.entries()) {
		dependencies.add({
			dependencyType,
			dependencyKey,
			dependencyInfo: { nodeId: `node-${index}`, nodeVersion: 1 },
		});
	}
	await Container.get(WorkflowDependencyRepository).updateDependenciesForWorkflow(
		workflow.id,
		dependencies,
	);
}

/**
 * Fake for `NodeTypes.resolveBaseName`: a name that ends in `Tool` is a generated variant of its
 * base type, unless it is one of `realNodes`.
 */
export function fakeResolveBaseName(realNodes: Iterable<string> = []) {
	const real = new Set(realNodes);
	return (name: string) =>
		name.endsWith('Tool') && !real.has(name)
			? { baseName: stripToolSuffix(name), isSyntheticTool: true }
			: { baseName: name, isSyntheticTool: false };
}
