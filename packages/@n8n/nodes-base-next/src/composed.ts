import { composeVersion, isRecord, toVersionedNodeType, type Action } from '@n8n/node-sdk';
import { VersionedNodeType, type IVersionedNodeType } from 'n8n-workflow';

import { versionsOf } from './registry';

/** A resource and operation of a legacy node that a contract action runs. */
export interface ComposedSlotSpec {
	readonly resource: string;
	readonly operation: string;
	readonly action: Action['id'];
	/** The action major that this node version runs. It never changes for a node version. */
	readonly major: number;
}

export interface ComposedVersionSpec {
	/** The legacy version that runs every other slot. */
	readonly legacy: number;
	readonly slots: readonly ComposedSlotSpec[];
}

/**
 * Legacy node versions where contract actions run some slots, by full node type and node
 * version. A slot that moves to a contract, or a new action major, needs a new node version.
 */
export const COMPOSED_NODES: Readonly<
	Record<string, Readonly<Record<number, ComposedVersionSpec>>>
> = {
	'n8n-nodes-base.notion': {
		4: {
			legacy: 3,
			slots: [
				{
					resource: 'databasePage',
					operation: 'getAll',
					action: 'notion.databasePage.getAll',
					major: 1,
				},
			],
		},
	},
};

/** Where a workflow node of an action goes: the node type, version and slot. */
export interface ComposedTarget {
	readonly nodeType: string;
	readonly typeVersion: number;
	readonly resource: string;
	readonly operation: string;
}

const composedSlots = () =>
	Object.entries(COMPOSED_NODES).flatMap(([nodeType, versions]) =>
		Object.entries(versions).flatMap(([version, { slots }]) =>
			slots.map((slot) => ({ ...slot, nodeType, typeVersion: Number(version) })),
		),
	);

/** The newest composed node version that runs this action major. */
export function composedTargetOf({ id, version }: Pick<Action, 'id' | 'version'>) {
	const newest = composedSlots()
		.filter(({ action, major }) => action === id && major === version)
		.reduce<ComposedTarget | undefined>(
			(best, { nodeType, typeVersion, resource, operation }) =>
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

/** The slot a node of a composed version runs, or `undefined` when its legacy version runs it. */
export function composedSlotOf({
	type,
	typeVersion,
	parameters,
}: WorkflowNodeRef): ComposedSlotSpec | undefined {
	const spec = typeVersion === undefined ? undefined : COMPOSED_NODES[type]?.[typeVersion];
	const { resource, operation } = isRecord(parameters) ? parameters : {};
	return spec?.slots.find((slot) => slot.resource === resource && slot.operation === operation);
}

/**
 * `legacy` plus its composed versions. The newest version becomes the default: the nodes
 * panel shows the newest version and adds the default one, so the two must agree.
 */
export function withComposedVersions(nodeType: string, legacy: IVersionedNodeType) {
	const composed = Object.entries(COMPOSED_NODES[nodeType] ?? {}).map(
		([version, { legacy: base, slots }]) =>
			[
				Number(version),
				composeVersion({
					legacy: legacy.getNodeType(base),
					version: Number(version),
					slots: slots.map(({ resource, operation, action, major }) => ({
						resource,
						operation,
						action: new (toVersionedNodeType(versionsOf(action)))().getNodeType(major),
					})),
				}),
			] as const,
	);
	if (composed.length === 0) return legacy;
	const defaultVersion = Math.max(...composed.map(([version]) => version));
	const versions = composed.map(([version, type]) => [
		version,
		{ ...type, description: { ...type.description, defaultVersion } },
	]);
	return new VersionedNodeType(
		{ ...legacy.nodeVersions, ...Object.fromEntries(versions) },
		{ ...legacy.description, defaultVersion },
	);
}
