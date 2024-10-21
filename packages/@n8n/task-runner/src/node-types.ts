import type {
	IDataObject,
	INodeType,
	INodeTypeDescription,
	INodeTypes,
	IVersionedNodeType,
} from 'n8n-workflow';

type VersionedTypes = Map<number, INodeTypeDescription>;

export const DEFAULT_NODETYPE_VERSION = 1;

export class TaskRunnerNodeTypes implements INodeTypes {
	private versionedNodeTypes: Map<string, VersionedTypes>;

	constructor(nodeTypes: INodeTypeDescription[]) {
		this.versionedNodeTypes = this.parseNodeTypes(nodeTypes);
	}

	private parseNodeTypes(nodeTypes: INodeTypeDescription[]): Map<string, VersionedTypes> {
		const versionedTypes = new Map<string, VersionedTypes>();

		for (const nt of nodeTypes) {
			const versions = Array.isArray(nt.version)
				? nt.version
				: [nt.version ?? DEFAULT_NODETYPE_VERSION];

			const versioned: VersionedTypes =
				versionedTypes.get(nt.name) ?? new Map<number, INodeTypeDescription>();
			for (const version of versions) {
				versioned.set(version, { ...versioned.get(version), ...nt });
			}

			versionedTypes.set(nt.name, versioned);
		}

		return versionedTypes;
	}

	// This isn't used in Workflow from what I can see
	getByName(_nodeType: string): INodeType | IVersionedNodeType {
		return undefined as unknown as INodeType | IVersionedNodeType;
	}

	getByNameAndVersion(nodeType: string, version?: number): INodeType {
		const versions = this.versionedNodeTypes.get(nodeType);
		if (!versions) {
			return undefined as unknown as INodeType;
		}
		const nodeVersion = versions.get(version ?? Math.max(...versions.keys()));
		if (!nodeVersion) {
			return undefined as unknown as INodeType;
		}
		return {
			description: nodeVersion,
		};
	}

	// This isn't used in Workflow from what I can see
	getKnownTypes(): IDataObject {
		return {};
	}
}
