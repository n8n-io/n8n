import { UserError } from 'n8n-workflow';

import type { PlacedVariableRequirement } from '../entities/variable/variable.types';
import { VariableParentPolicy } from '../n8n-packages.types';
import type { ManifestEntry } from '../spec/manifest.schema';
import type { PackageVariableRequirement } from '../spec/requirements.schema';
import type { SerializedVariable } from '../spec/serialized/variable.schema';

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

interface VariableBundleLookup {
	requirements: PackageVariableRequirement[] | undefined;
	manifestVariables: ManifestEntry[] | undefined;
	/** Absent under a mode that ignores package values, which never reads the bundled files. */
	bundledVariables?: Map<string, SerializedVariable>;
}

/**
 * Pairs each requirement with the value the package bundles for it and the scope a
 * creation would land in, so the variable importer never reads the manifest itself.
 * Callers differ only in how they decide the scope, which `isGlobal` supplies.
 */
function placeWith(
	{ requirements, manifestVariables, bundledVariables }: VariableBundleLookup,
	basePrefix: string,
	isGlobal: (bundle: ManifestEntry | undefined) => boolean,
): PlacedVariableRequirement[] | undefined {
	return requirements?.map((requirement) => {
		const bundle = variableBundleEntry(manifestVariables, basePrefix, requirement.name);
		const packageValue = bundle ? bundledVariables?.get(bundle.target)?.value : undefined;

		return {
			...requirement,
			globalPlacement: isGlobal(bundle),
			...(packageValue !== undefined ? { packageValue } : {}),
		};
	});
}

/**
 * Workflow and folder packages place every missing variable at the requested policy's
 * scope; a bundled entry only supplies the value, never the placement.
 */
export function placeByPolicy(
	params: VariableBundleLookup & { policy: VariableParentPolicy },
): PlacedVariableRequirement[] | undefined {
	const global = params.policy === VariableParentPolicy.Global;
	return placeWith(params, '', () => global);
}

/**
 * Project packages follow the package layout: a name bundled under the scope is created
 * in that project, one bundled at the top level globally. An unbundled name — including
 * one bundled only under a different project — defaults to the consuming project.
 */
export function placeByLayout(
	params: VariableBundleLookup & { scopePrefix: string },
): PlacedVariableRequirement[] | undefined {
	return placeWith(
		params,
		params.scopePrefix,
		(bundle) => bundle !== undefined && !bundle.target.startsWith(params.scopePrefix),
	);
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
