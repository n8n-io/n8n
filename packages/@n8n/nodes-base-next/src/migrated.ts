import { migrateVersion } from '@n8n/node-contract-compat';
import { isRecord, type Action } from '@n8n/node-sdk';
import { toVersionedNodeType } from '@n8n/node-sdk/host';
import { VersionedNodeType, type IVersionedNodeType } from 'n8n-workflow';

import { getManyDatabasePages } from './nodes/notion/actions/database-page.get-all';
import { versionsOf } from './registry';

/** A legacy node slot that a contract action runs: the resource and operation of the action. */
export interface MigratedSlotSpec {
	readonly action: Action & { readonly resource: string };
	/** The action major that this node version runs. It never changes for a node version. */
	readonly major: number;
}

export interface MigratedVersionSpec {
	/** The legacy version that runs every other slot. */
	readonly legacy: number;
	readonly slots: readonly MigratedSlotSpec[];
}

/**
 * Legacy node versions where contract actions run some slots, by full node type and node
 * version. A slot that moves to a contract, or a new action major, needs a new node version.
 */
export const MIGRATED_NODES: Readonly<
	Record<string, Readonly<Record<number, MigratedVersionSpec>>>
> = {
	'n8n-nodes-base.notion': {
		4: { legacy: 3, slots: [{ action: getManyDatabasePages, major: 1 }] },
	},
};

/** Where a workflow node of an action goes: the node type, version and slot. */
export interface MigratedTarget {
	readonly nodeType: string;
	readonly typeVersion: number;
	readonly resource: string;
	readonly operation: string;
}

const migratedSlots = () =>
	Object.entries(MIGRATED_NODES).flatMap(([nodeType, versions]) =>
		Object.entries(versions).flatMap(([version, { slots }]) =>
			slots.map((slot) => ({ ...slot, nodeType, typeVersion: Number(version) })),
		),
	);

/** The newest migrated node version that runs this action major. */
export function migratedTargetOf({ id, version }: Pick<Action, 'id' | 'version'>) {
	const newest = migratedSlots()
		.filter(({ action, major }) => action.id === id && major === version)
		.reduce<MigratedTarget | undefined>(
			(best, { nodeType, typeVersion, action: { resource, operation } }) =>
				best && best.typeVersion > typeVersion
					? best
					: { nodeType, typeVersion, resource, operation },
			undefined,
		);
	return newest;
}

/** A workflow node, as saved or built. */
export interface WorkflowNodeRef {
	readonly type: string;
	readonly typeVersion?: number;
	readonly parameters?: unknown;
}

/** The slot a node of a migrated version runs, or `undefined` when its legacy version runs it. */
export function migratedSlotOf({
	type,
	typeVersion,
	parameters,
}: WorkflowNodeRef): MigratedSlotSpec | undefined {
	const spec = typeVersion === undefined ? undefined : MIGRATED_NODES[type]?.[typeVersion];
	const { resource, operation } = isRecord(parameters) ? parameters : {};
	return spec?.slots.find(
		({ action }) => action.resource === resource && action.operation === operation,
	);
}

/**
 * `legacy` plus its migrated versions. The newest version becomes the default: the nodes
 * panel shows the newest version and adds the default one, so the two must agree.
 */
export function withMigratedVersions(nodeType: string, legacy: IVersionedNodeType) {
	const migrated = Object.entries(MIGRATED_NODES[nodeType] ?? {}).map(
		([version, { legacy: base, slots }]) =>
			[
				Number(version),
				migrateVersion({
					legacy: legacy.getNodeType(base),
					version: Number(version),
					slots: slots.map(({ action, major }) => ({
						resource: action.resource,
						operation: action.operation,
						action: new (toVersionedNodeType(versionsOf(action.id)))().getNodeType(major),
					})),
				}),
			] as const,
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
