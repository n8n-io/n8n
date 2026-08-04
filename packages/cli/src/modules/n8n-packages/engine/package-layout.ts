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

/** The entry bundling `name` for one scope: its own variables/ entry beats a top-level one, a tie is ambiguous. */
function variableBundleEntry(
	entries: ManifestEntry[] | undefined,
	basePrefix: string,
	name: string,
): ManifestEntry | undefined {
	const named = (entries ?? []).filter((entry) => entry.name === name);
	const scoped = named.filter((entry) => entry.target.startsWith(`${basePrefix}variables/`));
	const topLevel = named.filter((entry) => entry.target.startsWith('variables/'));
	const winning = scoped.length > 0 ? scoped : topLevel;

	// Only a hand-made package ties: the exporter blocks a same-directory name collision.
	if (winning.length > 1) {
		throw new UserError(`Package contains ambiguous variable entries for "${name}".`);
	}

	return winning[0];
}

interface VariableBundleLookup {
	requirements: PackageVariableRequirement[] | undefined;
	manifestVariables: ManifestEntry[] | undefined;
	bundledVariables?: Map<string, SerializedVariable>;
}

/** Resolves each requirement's bundled value and destination, so the variable importer never reads the manifest. */
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

/** Workflow and folder packages: the policy decides the scope, and a bundled entry only supplies the value. */
export function placeByPolicy(
	params: VariableBundleLookup & { policy: VariableParentPolicy },
): PlacedVariableRequirement[] | undefined {
	const global = params.policy === VariableParentPolicy.Global;
	return placeWith(params, '', () => global);
}

/**
 * Project packages follow the layout: bundled under the scope creates in that project, bundled at the
 * top level creates globally. An unbundled name — or one bundled only elsewhere — falls back to the scope.
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
