import { Service } from '@n8n/di';
import type { FrozenVersion, VersionManifest } from '@n8n/nodes-base-next';
import type { INodeTypeDescription } from 'n8n-workflow';
import { isRecord } from '@n8n/utils/is-record';
import { InstanceSettings } from 'n8n-core';

import { NextNodeLoader } from '@/next-nodes-registry';

import type { NextNodeVersion } from './database/next-node-version.entity';

/** The package name of the node types of the versions that this instance published. */
export const INSTANCE_PACKAGE = '@n8n/nodes-instance';

const semverParts = (semver: string) => semver.split('.').map(Number);

/** Newer semver first. */
export const bySemverDesc = (a: VersionManifest, b: VersionManifest) => {
	const [x, y] = [semverParts(a.semver), semverParts(b.semver)];
	return (y[0] ?? 0) - (x[0] ?? 0) || (y[1] ?? 0) - (x[1] ?? 0) || (y[2] ?? 0) - (x[2] ?? 0);
};

const frozenOf = (row: NextNodeVersion): FrozenVersion => ({
	manifest: row.manifest,
	readBundle: async () => await Promise.resolve(row.bundle),
});

/**
 * The node types of the versions that this instance published: the newest version of each
 * major. Every version stays runnable, so a workflow that locked an older or hidden version
 * keeps running it. n8n makes the loader before the database starts, so it serves the rows
 * that the service gives it.
 */
@Service()
export class NextNodesInstanceLoader {
	private rows: readonly NextNodeVersion[] = [];

	private nodeOf: (nodeType: string) => INodeTypeDescription | undefined = () => undefined;

	readonly loader: NextNodeLoader;

	constructor(private readonly instanceSettings: InstanceSettings) {
		this.loader = new NextNodeLoader([], [], async () => await this.newestOfEachMajor(), {
			packageName: INSTANCE_PACKAGE,
			sourcePath: 'next_node_version',
			publisher: () => this.publisher,
			all: () => this.rows.map(frozenOf),
			isHidden: (id) => this.isHidden(id),
			describe: (manifest) => this.describe(manifest),
		});
	}

	/** `instance:<instance id>`, the publisher of every version of this instance. */
	get publisher() {
		return `instance:${this.instanceSettings.instanceId}`;
	}

	/**
	 * Serves these rows from the next `loadAll`, and tells the AI builder their newest actions.
	 * `nodeOf` gives the description of an n8n node type, for the app and the icon of an action.
	 */
	async load(
		rows: readonly NextNodeVersion[],
		nodeOf: (nodeType: string) => INodeTypeDescription | undefined,
	) {
		this.rows = rows;
		this.nodeOf = nodeOf;
		await this.loader.loadAll();
		const { evaluateVersion, nodeNameOf, setPublishedActions } = await import(
			'@n8n/nodes-base-next'
		);
		// The newest major of each listed action: a hidden action is for locked workflows only.
		const newest = [...(await this.newestOfEachMajor()).entries()].flatMap(([id, versions]) =>
			this.isHidden(id) ? [] : versions.slice(0, 1),
		);
		const entries = await Promise.all(
			newest.map(async ({ manifest, readBundle }) => {
				const action = evaluateVersion(await readBundle(), manifest);
				const nodeType = `${INSTANCE_PACKAGE}.${nodeNameOf(manifest.id)}`;
				return 'kind' in action ? [] : [{ action, nodeType }];
			}),
		);
		setPublishedActions(entries.flat());
	}

	/**
	 * The app of an action in the node creator: its node id, the app name of its config, and
	 * the n8n node of the same id, e.g. GitHub for an action that extends GitHub. An icon
	 * `node:<node type>` takes the icon of that node: in a node description, `node:` names an
	 * icon of the design system instead.
	 */
	private describe({ bundleHash, contract, description }: VersionManifest) {
		const bundle = this.rows.find((row) => row.bundleHash === bundleHash)?.bundle;
		const config: unknown = bundle === undefined ? undefined : JSON.parse(bundle);
		const node = isRecord(config) && isRecord(config.node) ? config.node : {};
		const displayName = typeof node.displayName === 'string' ? node.displayName : contract.node;
		const nodeType = `n8n-nodes-base.${contract.node}`;
		const app = { id: contract.node, displayName, ...(this.nodeOf(nodeType) ? { nodeType } : {}) };
		const iconNode =
			typeof description.icon === 'string' && description.icon.startsWith('node:')
				? this.nodeOf(description.icon.slice('node:'.length))
				: undefined;
		const icon = iconNode && {
			icon: iconNode.icon,
			iconUrl: iconNode.iconUrl,
			iconColor: iconNode.iconColor,
		};
		return { codex: { app }, ...icon };
	}

	private isHidden(id: string) {
		return this.rows.every((row) => row.actionId !== id || row.status === 'hidden');
	}

	private async newestOfEachMajor(): Promise<ReadonlyMap<string, readonly FrozenVersion[]>> {
		const newest = [...this.rows]
			.map(frozenOf)
			.sort((a, b) => bySemverDesc(a.manifest, b.manifest))
			.reduce((byKey, version) => {
				const key = `${version.manifest.id}@${version.manifest.contract.version}`;
				return byKey.has(key) ? byKey : new Map(byKey).set(key, version);
			}, new Map<string, FrozenVersion>());
		return await Promise.resolve(
			[...newest.values()].reduce(
				(byId, version) =>
					new Map(byId).set(version.manifest.id, [
						...(byId.get(version.manifest.id) ?? []),
						version,
					]),
				new Map<string, readonly FrozenVersion[]>(),
			),
		);
	}
}
