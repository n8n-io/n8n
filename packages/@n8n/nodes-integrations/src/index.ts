import type { Action, Trigger } from '@n8n/node-sdk';
import { compat, type AnyCredentialType } from '@n8n/node-sdk/credentials';
import { isToolContract, nodeNameOf } from '@n8n/node-sdk/host';
import { toContract } from '@n8n/node-sdk/registry';

import { flowNatives, nativeTriggers as coreNativeTriggers } from '@n8n/nodes-core';

import { migratedSlotOf, type WorkflowNodeRef } from './migrated';
import { nativeTriggers as integrationNativeTriggers } from './nodes';
import { FIRST_PARTY_PACKAGES, packageOf } from './registry';

export { flowNatives };
export {
	bundledCredentialsOf,
	bundledIdsOf,
	FALLBACK_PACKAGE,
	FIRST_PARTY_PACKAGES,
	packageOf,
	versionsOf,
} from './registry';
export {
	MIGRATED_NODES,
	migratedSlotOf,
	migratedTargetOf,
	withMigratedVersions,
	type MigratedSlotSpec,
	type MigratedTarget,
	type MigratedVersionSpec,
	type WorkflowNodeRef,
} from './migrated';
export {
	contractStore,
	contractVersionLoader,
	deniedPermissionClassOf,
	exportContractStore,
	importContractStore,
	isNodeContractPin,
	permissionClassesOf,
	syncContractStore,
	useContractRegistry,
	type ContractInstall,
	type ContractKeys,
	type ContractPermissionClass,
	type ContractRegistryOptions,
	type ContractStore,
	type ContractStoreOptions,
	type ContractSyncResult,
	type InstanceStore,
	type PinnedNode,
	type StoredVersion,
} from './contract-registry';
// The cli builds node and credential types from manifests and checks eval mock values with the
// node-sdk instance of this package.
export { matches } from '@n8n/node-sdk';
export {
	credentialTypeOfManifest,
	exampleOf,
	nodeDescriptionOf,
	nodeNameOf,
	permissionsOf,
	runsNodeContract,
	setCodeLanguages,
	setFileExtractor,
	storedParametersOf,
	toVersionedNodeType,
	toVersionedToolType,
	toVersionedTriggerType,
	type FrozenVersion,
	type RefusedPermission,
	type RunProfile,
} from '@n8n/node-sdk/host';
export {
	isStoreStatusRecord,
	STORE_CATALOG_FILE,
	storeFilesOfDir,
	storeIndexFileOf,
	storeReader,
	type CredentialManifest,
	type NodeContractLock,
	type StoreStatusRecord,
	type VersionManifest,
} from '@n8n/node-sdk/registry';
// The cli makes the runtimes of the runtime policy with the node-sdk instance of this package.
export {
	containerRuntime,
	pooledRuntime,
	RUNTIME_NAMES,
	wasmReuseRuntime,
	workerRuntime,
	type RuntimeAvailability,
	type RuntimeLists,
	type RuntimeName,
	type RuntimePolicy,
} from '@n8n/node-sdk/runtimes';
export { warmSandbox, wasmSidecarRuntime, type GuestRuntime } from '@n8n/node-sdk/sandbox';
// The cli loads the embedded store of each first-party package.
export { embeddedStoreDirOf, type SourcePackage } from '@n8n/node-sdk/registry';

/**
 * Every action of the first-party packages, one n8n node type each. The type name has the package
 * name as prefix, e.g. `@n8n/nodes-core.noOpPass`.
 */
export const actions: readonly Action[] = FIRST_PARTY_PACKAGES.flatMap((pkg) => pkg.actions);

/** Every trigger with a bundle of the first-party packages, one n8n node type each. */
export const triggers: readonly Trigger[] = FIRST_PARTY_PACKAGES.flatMap((pkg) => pkg.triggers);

/**
 * The triggers of the first-party packages that a legacy node runs. They have no bundle and no
 * node type of a contract package: the typed flow emits the legacy node with the typed parameters.
 */
export const nativeTriggers: readonly Trigger[] = [
	...coreNativeTriggers,
	...integrationNativeTriggers,
];

/** Whether a node type is a node type of a contract package, e.g. `@n8n/nodes-core.noOpPass`. */
export const isContractNodeType = (nodeType: string) =>
	FIRST_PARTY_PACKAGES.some(({ name }) => nodeType.startsWith(`${name}.`));

/**
 * The credential type of a name without a credential manifest, for a sandboxed bundle: the compat
 * type of a shipped node, else a compat type when n8n has the name (`known`). A type with a
 * manifest comes from the store (`useContractRegistry`). The hosts and the base URL never come
 * from the bundle.
 */
export function sandboxCredentialTypeOf(known: (name: string) => boolean) {
	const shipped = new Map(
		FIRST_PARTY_PACKAGES.flatMap((pkg) => [...pkg.actions, ...pkg.triggers, ...pkg.natives])
			.flatMap(({ node }) => node.credential?.types ?? [])
			.filter(({ scheme }) => scheme.kind === 'compat')
			.map((type) => [type.name, type]),
	);
	return (name: string): AnyCredentialType | undefined =>
		shipped.get(name) ?? (known(name) ? compat(name) : undefined);
}

/**
 * The n8n node type of an action or a trigger: the name of its package and its node name, e.g.
 * `@n8n/nodes-integrations.notionDatabasePageGetAll`.
 */
export const nodeTypeOf = (action: Pick<Action, 'id'>) =>
	`${packageOf(action.id).name}.${nodeNameOf(action.id)}`;

/** The actions that the host also gives as agent tools, see `isToolContract`. */
export const toolActions: readonly Action[] = actions.filter((action) =>
	isToolContract(toContract(action)),
);

/** The n8n node type of the agent tool of an action, e.g. `@n8n/nodes-core.httpRequestGetTool`. */
export const toolTypeOf = (action: Pick<Action, 'id'>) => `${nodeTypeOf(action)}Tool`;

/** The action that a tool node of a contract package runs. */
export const toolActionOfNode = (node: Pick<WorkflowNodeRef, 'type'>) =>
	toolActions.find((action) => toolTypeOf(action) === node.type);

/** The action a workflow node runs: a node type of a contract package, or a slot of a migrated node. */
export function actionOfNode(node: WorkflowNodeRef): Action | undefined {
	const slot = migratedSlotOf(node);
	return slot
		? actions.find(({ id, version }) => id === slot.action.id && version === slot.major)
		: actions.find((action) => nodeTypeOf(action) === node.type);
}
