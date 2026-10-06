import { migrateVersion } from '@n8n/node-contract-compat';
import type { Action } from '@n8n/node-sdk';
import { compat, type AnyCredentialType } from '@n8n/node-sdk/credentials';
import { toVersionedNodeType, type FrozenVersion, type HostRuntime } from '@n8n/node-sdk/host';
import {
	contractCatalogOf,
	contractNodeTypeOf,
	embeddedCompatTypeOf,
	parentNodeOf,
	type ContractCatalog,
	type ParentNode,
	type SourcePackage,
} from '@n8n/node-sdk/registry';
import { MIGRATED_NODES } from '@n8n/nodes-integrations/catalog';
import { FIRST_PARTY_PACKAGES } from '@n8n/workflow-sdk/next';
import { isRecord } from '@n8n/utils/is-record';
import { once } from '@n8n/utils/once';
import { VersionedNodeType, type IVersionedNodeType } from 'n8n-workflow';
import path from 'path';

export { MIGRATED_NODES };

/**
 * The package of the stored versions and credential types that no first-party package ships,
 * e.g. of a community node. Such a node is for one product, so it is not a core node.
 */
export const FALLBACK_PACKAGE = '@n8n/nodes-integrations';

/** A first-party package. Its folder resolves from its name. */
const sourcePackageOf = (name: string): SourcePackage => ({
	name,
	dir: path.dirname(require.resolve(`${name}/package.json`)),
});

/** The first-party packages, in catalog order. */
export const firstPartyPackages = (): readonly SourcePackage[] =>
	FIRST_PARTY_PACKAGES.map(sourcePackageOf);

/** The package of `FALLBACK_PACKAGE`. */
export const fallbackPackage = () => sourcePackageOf(FALLBACK_PACKAGE);

/**
 * The contracts of the embedded stores of the first-party packages. The stores do not change
 * while n8n runs, so the catalog is read once, at its first use.
 */
export const firstPartyCatalog = once(
	(): ContractCatalog => contractCatalogOf(firstPartyPackages()),
);

/** The first-party package of an id: the package that ships it, else `FALLBACK_PACKAGE`. */
export const packageNameOf = (id: string) =>
	firstPartyCatalog().packageOf(id)?.name ?? FALLBACK_PACKAGE;

/** The n8n node type of an id, e.g. `@n8n/nodes-integrations.notionDatabasePageGetAll`. */
export const nodeTypeOf = (id: string) => contractNodeTypeOf(packageNameOf(id), id);

/** Whether a node type is a node type of a contract package, e.g. `@n8n/nodes-core.noOpPass`. */
export const isContractNodeType = (nodeType: string) =>
	FIRST_PARTY_PACKAGES.some((name) => nodeType.startsWith(`${name}.`));

/** The catalog entries of the actions that the host also gives as agent tools. */
export const toolEntries = once(() =>
	firstPartyCatalog().entries.filter(({ toolType }) => toolType !== undefined),
);

/** The action id of a tool node type of a contract package. */
export const toolIdOf = (nodeType: string) =>
	toolEntries().find(({ toolType }) => toolType === nodeType)?.manifest.id;

/**
 * The credential type of a name without a credential manifest, for a sandboxed bundle: the compat
 * type of a shipped node, else a compat type when n8n has the name (`known`). A type with a
 * manifest comes from the store first. The hosts and the base URL never come from the bundle
 * that runs.
 */
export const sandboxCredentialTypeOf =
	(known: (name: string) => boolean) =>
	(name: string): AnyCredentialType | undefined =>
		embeddedCompatTypeOf(firstPartyCatalog(), name) ?? (known(name) ? compat(name) : undefined);

/** A slot of a migrated legacy node version: the action and the major that run it. */
export interface MigratedSlot {
	readonly id: string;
	readonly major: number;
	/** The `resource` parameter value of the slot. */
	readonly resource: string;
	/** The `operation` parameter value of the slot. */
	readonly operation: string;
}

/** The slots of a migrated node version, with the resource and operation of each action. */
function migratedSlotsOf(nodeType: string, typeVersion: number): MigratedSlot[] {
	const { entries } = firstPartyCatalog();
	return (MIGRATED_NODES[nodeType]?.[typeVersion]?.slots ?? []).flatMap(({ action, major }) => {
		const entry = entries.find(({ manifest }) => manifest.id === action);
		return entry?.resource === undefined
			? []
			: [{ id: action, major, resource: entry.resource, operation: entry.operation }];
	});
}

/** A workflow node, as saved or built. */
export interface WorkflowNodeRef {
	readonly type: string;
	readonly typeVersion?: number;
	readonly parameters?: unknown;
}

/** The slot a node of a migrated version runs, or `undefined` when its legacy version runs it. */
export function migratedSlotOf({ type, typeVersion, parameters }: WorkflowNodeRef) {
	if (typeVersion === undefined) return undefined;
	const { resource, operation } = isRecord(parameters) ? parameters : {};
	return migratedSlotsOf(type, typeVersion).find(
		(slot) => slot.resource === resource && slot.operation === operation,
	);
}

/**
 * `legacy` plus its migrated versions. The newest version becomes the default: the nodes
 * panel shows the newest version and adds the default one, so the two must agree.
 * `loadedVersionsOf` gives the versions of an action that the host loads. A migrated version
 * that has a slot without its action major is not added, as the host does not load that action.
 * The slots run with `runtime`.
 */
export function withMigratedVersions(
	nodeType: string,
	legacy: IVersionedNodeType,
	loadedVersionsOf: (actionId: string) => readonly FrozenVersion[],
	runtime: HostRuntime,
) {
	const migrated = Object.entries(MIGRATED_NODES[nodeType] ?? {}).flatMap(
		([version, { legacy: base, slots }]) => {
			const known = migratedSlotsOf(nodeType, Number(version));
			const loaded = known.map((slot) => ({ ...slot, versions: loadedVersionsOf(slot.id) }));
			const hasMajors =
				known.length === slots.length &&
				loaded.every(({ major, versions }) =>
					versions.some(({ manifest }) => manifest.contract.version === major),
				);
			if (!hasMajors) return [];
			return [
				[
					Number(version),
					migrateVersion({
						legacy: legacy.getNodeType(base),
						version: Number(version),
						slots: loaded.map(({ resource, operation, major, versions }) => ({
							resource,
							operation,
							action: new (toVersionedNodeType(versions, runtime))().getNodeType(major),
						})),
					}),
				] as const,
			];
		},
	);
	if (migrated.length === 0) return legacy;
	const defaultVersion = Math.max(...migrated.map(([version]) => version));
	const versions = migrated.map(([version, type]) => [
		version,
		{ ...type, description: { ...type.description, defaultVersion } },
	]);
	return new VersionedNodeType(
		{ ...legacy.nodeVersions, ...Object.fromEntries(versions) },
		{ ...legacy.description, defaultVersion },
	);
}

/**
 * The action that a workflow node runs, as its embedded bundle exports it: a node type of a
 * contract package, or a slot of a migrated node. For a host check that needs the code of the
 * action, e.g. its request binding. `undefined` for any other node.
 */
export function actionOfNode(node: WorkflowNodeRef): Action | undefined {
	const slot = migratedSlotOf(node);
	const { entries, bundleOf } = firstPartyCatalog();
	const entry = slot
		? entries.find(
				({ manifest }) => manifest.id === slot.id && manifest.contract.version === slot.major,
			)
		: entries.find(({ nodeType }) => nodeType === node.type);
	const bundle = entry && bundleOf(entry.manifest.id);
	return bundle && !('kind' in bundle) ? bundle : undefined;
}

/** The actions that the first-party packages ship, as their bundles export them. */
const firstPartyActions = once((): readonly Action[] =>
	firstPartyCatalog().entries.flatMap(({ manifest }) => {
		if (!('bundleHash' in manifest) || manifest.kind === 'trigger') return [];
		const bundle = firstPartyCatalog().bundleOf(manifest.id);
		return bundle && !('kind' in bundle) ? [bundle] : [];
	}),
);

/** A shipped node as a custom action that extends it copies it, or why it cannot be extended. */
export const parentNode = (nodeId: string): ParentNode | undefined =>
	parentNodeOf(firstPartyActions(), nodeId);

/** Each shipped node with actions, as `parentNode` gives it. */
export const parentNodes = (): ParentNode[] =>
	[...new Set(firstPartyActions().map(({ node }) => node.id))].flatMap(
		(id) => parentNode(id) ?? [],
	);

/**
 * The credential type of a name for a custom action: the type of a shipped node, else a compat
 * type when n8n has the name (`known`). Its config is data, so it never gives the base URL or
 * the hosts.
 */
export const customActionCredentialTypeOf =
	(known: (name: string) => boolean) =>
	(name: string): AnyCredentialType | undefined =>
		firstPartyActions()
			.flatMap(({ node }) => node.credential?.types ?? [])
			.find((type) => type.name === name) ?? (known(name) ? compat(name) : undefined);
