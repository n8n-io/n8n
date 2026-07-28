import { UserError } from 'n8n-workflow';

import type { PlacedVariableRequirement } from '../entities/variable/variable.types';
import { VariableParentPolicy } from '../n8n-packages.types';
import type { ManifestEntry } from '../spec/manifest.schema';
import type { PackageVariableRequirement } from '../spec/requirements.schema';
import type { ImportedVariable } from '../spec/serialized/variable.schema';

export function foldersInScope(
	entries: ManifestEntry[] | undefined,
	basePrefix = '',
): ManifestEntry[] {
	return (entries ?? []).filter((entry) => entry.target.startsWith(`${basePrefix}folders/`));
}

export function workflowsInScope(
	entries: ManifestEntry[] | undefined,
	basePrefix = '',
): ManifestEntry[] {
	return (entries ?? []).filter(
		(entry) =>
			entry.target.startsWith(`${basePrefix}workflows/`) ||
			entry.target.startsWith(`${basePrefix}folders/`),
	);
}

/** Workflow packages place variables by request policy; project packages follow the package layout. */
export type VariablePlacement = VariableParentPolicy | 'from-layout';

/**
 * The entry bundling `name` for one scope: the scope's own variables/ entry beats a
 * top-level one. Two entries at the winning tier are ambiguous and reject the import.
 */
function variableBundleEntry(
	entries: ManifestEntry[] | undefined,
	basePrefix: string,
	name: string,
): ManifestEntry | undefined {
	const named = (entries ?? []).filter((entry) => entry.name === name);
	const scoped = named.filter((entry) => entry.target.startsWith(`${basePrefix}variables/`));
	const topLevel = named.filter((entry) => entry.target.startsWith('variables/'));
	const winning = scoped.length > 0 ? scoped : topLevel;

	if (winning.length > 1) {
		throw new UserError(`Package contains ambiguous variable entries for "${name}".`);
	}

	return winning[0];
}

/**
 * Pairs each requirement with the value the package bundles for it and the scope a
 * creation would land in, so the variable importer never reads the manifest itself.
 * An unbundled name defaults to project placement.
 */
export function placeVariableRequirements({
	requirements,
	manifestVariables,
	basePrefix,
	placement,
	bundledVariables,
}: {
	requirements: PackageVariableRequirement[] | undefined;
	manifestVariables: ManifestEntry[] | undefined;
	basePrefix: string;
	placement: VariablePlacement;
	/** Absent under a mode that ignores package values, which never reads the bundled files. */
	bundledVariables?: Map<string, ImportedVariable>;
}): PlacedVariableRequirement[] | undefined {
	return requirements?.map((requirement) => {
		const bundle = variableBundleEntry(manifestVariables, basePrefix, requirement.name);
		const packageValue = bundle ? bundledVariables?.get(bundle.target)?.value : undefined;

		return {
			...requirement,
			globalPlacement:
				placement === 'from-layout'
					? bundle !== undefined && !bundle.target.startsWith(basePrefix)
					: placement === VariableParentPolicy.Global,
			...(packageValue !== undefined ? { packageValue } : {}),
		};
	});
}

export function deriveParentFolderId(
	workflowTarget: string,
	folderTargetToId: Map<string, string>,
): string | null {
	const idx = workflowTarget.lastIndexOf('/workflows/');
	if (idx === -1) return null;

	const containerTarget = workflowTarget.slice(0, idx);

	if (!containerTarget.includes('folders/')) return null;
	const folderId = folderTargetToId.get(containerTarget);
	if (folderId === undefined) {
		throw new UserError(
			`Package workflow at "${workflowTarget}" is nested under folder "${containerTarget}", which is missing from the manifest.`,
		);
	}
	return folderId;
}
