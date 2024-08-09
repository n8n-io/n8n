import type {
	INodeType,
	IVersionedNodeType,
	INodeTypeDescription,
	INodeProperties,
	INodeTypeBaseDescription,
} from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';

interface Constructor<T> {
	new (): T;
}

type BaseType = INodeType | IVersionedNodeType;

interface DescribedType {
	description: INodeTypeDescription;
}

interface BaseDescribedType {
	description: INodeTypeBaseDescription;
}

function addCodex(item: BaseDescribedType) {
	item.description.codex = {
		categories: ['AI'],
		subcategories: {
			AI: ['Tools'],
			Tools: ['Other Tools'],
		},
	};
}

function convertDescription(item: DescribedType) {
	item.description.inputs = [];
	item.description.outputs = [NodeConnectionType.AiTool];
	item.description.displayName += ' Tool';
	if (!item.description.properties.map((prop) => prop.name).includes('toolDescription')) {
		const descProp: INodeProperties = {
			displayName: 'Description',
			name: 'toolDescription',
			type: 'string',
			default: item.description.description,
			required: true,
			typeOptions: { rows: 2 },
			description:
				'Explain to the LLM what this tool does, a good, specific description would allow LLMs to produce expected results much more often',
			placeholder: `e.g. ${item.description.description}`,
		};
		item.description.properties.unshift(descProp);
	}
	addCodex(item);
	return item;
}

function nodeToToolNormal(BaseClass: Constructor<INodeType>): Constructor<INodeType> {
	console.log('normal version');
	class NewNodeClass extends BaseClass {
		constructor() {
			super();
			convertDescription(this);
		}
	}
	return NewNodeClass;
}

function nodeToToolVersioned(
	BaseClass: Constructor<IVersionedNodeType>,
): Constructor<IVersionedNodeType> {
	class NewNodeClass extends BaseClass {
		constructor() {
			super();
			addCodex(this);

			// VersionedNodes are themselves a wrapper around other nodes, based on
			// the version of the node. To support this, we need to convert the
			// description of our copy of the nodeVersions.
			// Then our `helpers.getConnectedTools` will handle the rest.
			this.nodeVersions = Object.fromEntries(
				Object.entries(this.nodeVersions).map(([version, versionedNodeType]) => {
					return [version, convertDescription(versionedNodeType)];
				}),
			);
		}
	}

	return NewNodeClass;
}

function isVersioned(object: BaseType): object is IVersionedNodeType {
	return 'nodeVersions' in object;
}

export function nodeToTool<T extends Constructor<BaseType>>(nodeType: T): T {
	const myNodeType = new nodeType();
	if (isVersioned(myNodeType))
		return nodeToToolVersioned(nodeType as Constructor<IVersionedNodeType>) as T;
	return nodeToToolNormal(nodeType as Constructor<INodeType>) as T;
}
