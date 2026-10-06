import type { Action } from '@n8n/node-sdk';
import {
	contractCatalogOf,
	contractNodeTypeOf,
	type CatalogEntry,
	type ContractCatalog,
} from '@n8n/node-sdk/registry';
import { ACTION_ORDER as CORE_ORDER } from '@n8n/nodes-core/catalog';
import {
	ACTION_ORDER as INTEGRATIONS_ORDER,
	MIGRATED_NODES,
} from '@n8n/nodes-integrations/catalog';
import { FIRST_PARTY_PACKAGES } from '@n8n/workflow-sdk/next';
import { isRecord } from '@n8n/utils/is-record';
import { once } from '@n8n/utils/once';
import path from 'node:path';

// The host types a stored id that no first-party package ships with this package name.
const FALLBACK_PACKAGE = '@n8n/nodes-integrations';

/** The position of each listed contract, as each package orders its contracts. */
const ORDER = new Map([...CORE_ORDER, ...INTEGRATIONS_ORDER].map((id, index) => [id, index]));

/**
 * The entries in the order of the packages, then in the order that each package lists. An
 * unlisted entry comes after the listed ones of its package, in id order.
 */
const orderedEntries = ({ packages, entries }: ContractCatalog) => {
	const packageIndex = new Map(packages.map(({ name }, index) => [name, index]));
	const rankOf = ({ package: name, manifest }: CatalogEntry) =>
		[packageIndex.get(name) ?? packages.length, ORDER.get(manifest.id) ?? ORDER.size] as const;
	return [...entries].sort((a, b) => {
		const [packageA, orderA] = rankOf(a);
		const [packageB, orderB] = rankOf(b);
		return packageA - packageB || orderA - orderB;
	});
};

/**
 * The contracts of the embedded stores of the first-party packages, from their manifests. The
 * stores do not change while n8n runs, so the catalog and the bundles load once.
 */
export const firstPartyCatalog = once((): ContractCatalog => {
	const catalog = contractCatalogOf(
		FIRST_PARTY_PACKAGES.map((name) => ({
			name,
			dir: path.dirname(require.resolve(`${name}/package.json`)),
		})),
	);
	return { ...catalog, entries: orderedEntries(catalog) };
});

const entriesById = once(
	() => new Map(firstPartyCatalog().entries.map((entry) => [entry.manifest.id, entry])),
);

/** The catalog entry of an id. */
export const entryOf = (id: string): CatalogEntry | undefined => entriesById().get(id);

/**
 * Every action and provider with a bundle, as its embedded bundle exports it. The catalog lists
 * them from the manifests. The bundle gives what no manifest has: the output hatches
 * (`deriveOutput`, `resourceOutput`), the input field schemas and the node `replaces` list.
 */
export const contractActions = once((): readonly Action[] =>
	firstPartyCatalog().entries.flatMap(({ manifest }) => {
		if (!('bundleHash' in manifest) || manifest.kind === 'trigger') return [];
		const bundle = firstPartyCatalog().bundleOf(manifest.id);
		return bundle && !('kind' in bundle) ? [bundle] : [];
	}),
);

/** Whether a node type is a node type of a contract package, e.g. `@n8n/nodes-core.noOpPass`. */
export const isContractNodeType = (nodeType: string) =>
	FIRST_PARTY_PACKAGES.some((name) => nodeType.startsWith(`${name}.`));

/** The n8n node type of a contract, e.g. `@n8n/nodes-integrations.notionDatabasePageGetAll`. */
export const nodeTypeOf = ({ id }: { readonly id: string }) =>
	entryOf(id)?.nodeType ??
	contractNodeTypeOf(firstPartyCatalog().packageOf(id)?.name ?? FALLBACK_PACKAGE, id);

/** The actions that the host also gives as agent tools. */
export const toolActions = once((): readonly Action[] =>
	contractActions().filter(({ id }) => entryOf(id)?.toolType !== undefined),
);

/** The n8n node type of the agent tool of an action, e.g. `@n8n/nodes-core.httpRequestGetTool`. */
export const toolTypeOf = (action: { readonly id: string }) =>
	entryOf(action.id)?.toolType ?? `${nodeTypeOf(action)}Tool`;

/** A workflow node, as saved or built. */
export interface WorkflowNodeRef {
	readonly type: string;
	readonly typeVersion?: number;
	readonly parameters?: unknown;
}

/** The slots of the migrated node versions, with the resource and operation of each action. */
const migratedSlots = once(() =>
	Object.entries(MIGRATED_NODES).flatMap(([nodeType, versions]) =>
		Object.entries(versions).flatMap(([version, { slots }]) =>
			slots.flatMap(({ action, major }) => {
				const entry = entryOf(action);
				return entry?.resource === undefined
					? []
					: [
							{
								nodeType,
								typeVersion: Number(version),
								id: action,
								major,
								resource: entry.resource,
								operation: entry.operation,
							},
						];
			}),
		),
	),
);

/** Where a workflow node of an action goes: the node type, version and slot. */
export interface MigratedTarget {
	readonly nodeType: string;
	readonly typeVersion: number;
	readonly resource: string;
	readonly operation: string;
}

/** The newest migrated node version that runs this action major. */
export function migratedTargetOf({ id, version }: Pick<Action, 'id' | 'version'>) {
	return migratedSlots()
		.filter((slot) => slot.id === id && slot.major === version)
		.reduce<MigratedTarget | undefined>(
			(best, { nodeType, typeVersion, resource, operation }) =>
				best && best.typeVersion > typeVersion
					? best
					: { nodeType, typeVersion, resource, operation },
			undefined,
		);
}

/** The slot a node of a migrated version runs, or `undefined` when its legacy version runs it. */
export function migratedSlotOf({ type, typeVersion, parameters }: WorkflowNodeRef) {
	const { resource, operation } = isRecord(parameters) ? parameters : {};
	return migratedSlots().find(
		(slot) =>
			slot.nodeType === type &&
			slot.typeVersion === typeVersion &&
			slot.resource === resource &&
			slot.operation === operation,
	);
}

/** The action a workflow node runs: a node type of a contract package, or a slot of a migrated node. */
export function actionOfNode(node: WorkflowNodeRef) {
	const slot = migratedSlotOf(node);
	return slot
		? contractActions().find(({ id, version }) => id === slot.id && version === slot.major)
		: contractActions().find((action) => nodeTypeOf(action) === node.type);
}

/** The action that a tool node of a contract package runs. */
export const toolActionOfNode = (node: Pick<WorkflowNodeRef, 'type'>) =>
	toolActions().find((action) => toolTypeOf(action) === node.type);
