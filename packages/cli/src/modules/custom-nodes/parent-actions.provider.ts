import { Service } from '@n8n/di';
import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import type { NodeTypeExtensionProvider } from '@/node-type-extension-provider';

import { servedVersions } from './custom-node-type';
import { actionVersionRefs, type ActionView } from './node-description.generator';
import {
	buildParentRuntimeDescription,
	extendParentDescription,
	parentShape,
	type ParentShape,
} from './parent-action.generator';
import { createParentNodeType } from './parent-node-type';

interface EligibleParent {
	shape: ParentShape;
	/** Keys of the versions that have `shape`. See `versionKey`. */
	versionKeys: ReadonlySet<string>;
}

const versionsOf = (version: INodeTypeDescription['version']) =>
	Array.isArray(version) ? version : [version];

/** `2` gives `"2"`, `[1, 1.1]` gives `"1,1.1"`. */
const versionKey = (version: INodeTypeDescription['version']) => versionsOf(version).join(',');

const newestVersion = (description: INodeTypeDescription) =>
	Math.max(...versionsOf(description.version));

/** Serves the custom actions of built-in parent nodes, for example Stripe. */
@Service()
export class ParentActionsProvider implements NodeTypeExtensionProvider {
	private actionsByParent: ReadonlyMap<string, ActionView[]> = new Map();

	/** Found by `transformTypes`. Kept when the types are released from memory. */
	private eligible: ReadonlyMap<string, EligibleParent> = new Map();

	/** A running execution keeps its copy. A new lookup after a change gets a new copy. */
	private copies = new WeakMap<INodeType, INodeType>();

	constructor(private readonly loadNodesAndCredentials: LoadNodesAndCredentials) {}

	/** Replaces all parent actions and drops every cached copy. Keys are full node type names. */
	setActions(actionsByParent: ReadonlyMap<string, ActionView[]>): void {
		this.actionsByParent = actionsByParent;
		this.copies = new WeakMap();
	}

	/** Body of the `transform` post-processor. Finds the eligible parents and extends their served descriptions. */
	transformTypes(): void {
		const { types } = this.loadNodesAndCredentials;
		this.eligible = this.findEligibleParents(types.nodes);
		this.copies = new WeakMap();
		// A new array and new entries: the loaded descriptions must not change.
		types.nodes = types.nodes.map((entry) => this.extendDescription(entry.name, entry));
	}

	extendDescription(nodeTypeName: string, description: INodeTypeDescription): INodeTypeDescription {
		const parent = this.eligibleVersion(nodeTypeName, description);
		if (!parent) return description;
		return extendParentDescription(description, parent.shape, this.actionsOf(nodeTypeName));
	}

	extendNodeType(nodeTypeName: string, nodeType: INodeType): INodeType {
		const parent = this.eligibleVersion(nodeTypeName, nodeType.description);
		if (!parent) return nodeType;

		const cached = this.copies.get(nodeType);
		if (cached) return cached;

		// A parent without actions is wrapped too: a saved workflow can select a deleted action.
		const actions = this.actionsOf(nodeTypeName);
		const { description } = nodeType;
		const copy = createParentNodeType(nodeType, {
			shape: parent.shape,
			extendedDescription: extendParentDescription(description, parent.shape, actions),
			runtimeDescription:
				actionVersionRefs(actions).length > 0
					? buildParentRuntimeDescription(description, actions)
					: undefined,
			served: servedVersions(actions),
		});
		this.copies.set(nodeType, copy);
		return copy;
	}

	/** Shape of an eligible parent on this instance. `undefined`: not eligible or not loaded. */
	shapeOf(nodeTypeName: string): ParentShape | undefined {
		return this.eligible.get(nodeTypeName)?.shape;
	}

	eligibleParents(): Array<{ nodeType: string; shape: ParentShape }> {
		return [...this.eligible].map(([nodeType, { shape }]) => ({ nodeType, shape }));
	}

	private actionsOf(nodeTypeName: string): ActionView[] {
		return this.actionsByParent.get(nodeTypeName) ?? [];
	}

	private eligibleVersion(
		nodeTypeName: string,
		description: INodeTypeDescription,
	): EligibleParent | undefined {
		const parent = this.eligible.get(nodeTypeName);
		return parent?.versionKeys.has(versionKey(description.version)) ? parent : undefined;
	}

	/** Needs the credential types in memory. */
	private findEligibleParents(nodes: INodeTypeDescription[]): Map<string, EligibleParent> {
		const entriesByName = new Map<string, INodeTypeDescription[]>();
		for (const entry of nodes) {
			entriesByName.set(entry.name, [...(entriesByName.get(entry.name) ?? []), entry]);
		}

		const eligible = new Map<string, EligibleParent>();
		for (const [name, entries] of entriesByName) {
			const newest = entries.reduce((a, b) => (newestVersion(b) > newestVersion(a) ? b : a));
			const shape = this.shapeOfEntry(newest);
			if (!shape) continue;

			const versionKeys = new Set(
				entries
					.filter((entry) => this.shapeOfEntry(entry) === shape)
					.map((entry) => versionKey(entry.version)),
			);
			eligible.set(name, { shape, versionKeys });
		}
		return eligible;
	}

	/** `RoutingNode` can use each credential of the node for a custom action. */
	private shapeOfEntry(entry: INodeTypeDescription): ParentShape | undefined {
		const shape = parentShape(entry);
		if (!shape) return undefined;
		// `supportsProxyAuth` is true when any credential supports it. Each credential must.
		const credentials = entry.credentials ?? [];
		const supported = credentials.every((credential) =>
			this.loadNodesAndCredentials.supportsProxyAuth({ ...entry, credentials: [credential] }),
		);
		return supported ? shape : undefined;
	}
}
