import type {
	INodeType,
	INodeTypeData,
	INodeTypes,
	IVersionedNodeType,
	IConnections,
	IDataObject,
	INode,
	IPinData,
	IWorkflowSettings,
} from 'n8n-workflow';
import { NodeHelpers, Workflow } from 'n8n-workflow';
import { uuid } from '@jsplumb/util';
import { defaultMockNodeTypes } from '@/__tests__/defaults';
import type { INodeUi, ITag, IUsedCredential, IWorkflowDb, WorkflowMetadata } from '@/Interface';
import type { ProjectSharingData } from '@/features/projects/projects.types';

export function createTestNodeTypes(data: INodeTypeData = {}): INodeTypes {
	const getResolvedKey = (key: string) => {
		const resolvedKeyParts = key.split(/[\/.]/);
		return resolvedKeyParts[resolvedKeyParts.length - 1];
	};

	const nodeTypes = {
		...defaultMockNodeTypes,
		...Object.keys(data).reduce<INodeTypeData>((acc, key) => {
			acc[getResolvedKey(key)] = data[key];

			return acc;
		}, {}),
	};

	function getByName(nodeType: string): INodeType | IVersionedNodeType {
		return nodeTypes[getResolvedKey(nodeType)].type;
	}

	function getByNameAndVersion(nodeType: string, version?: number): INodeType {
		return NodeHelpers.getVersionedNodeType(getByName(nodeType), version);
	}

	return {
		getByName,
		getByNameAndVersion,
	};
}

export function createTestWorkflowObject(options: {
	id?: string;
	name?: string;
	nodes: INode[];
	connections: IConnections;
	active?: boolean;
	nodeTypes?: INodeTypeData;
	staticData?: IDataObject;
	settings?: IWorkflowSettings;
	pinData?: IPinData;
}) {
	return new Workflow({
		...options,
		id: options.id ?? uuid(),
		active: options.active ?? false,
		nodeTypes: createTestNodeTypes(options.nodeTypes),
		connections: options.connections ?? {},
	});
}

export function createTestWorkflow(options: {
	id?: string;
	name: string;
	active?: boolean;
	createdAt?: number | string;
	updatedAt?: number | string;
	nodes?: INodeUi[];
	connections?: IConnections;
	settings?: IWorkflowSettings;
	tags?: ITag[] | string[];
	pinData?: IPinData;
	sharedWithProjects?: ProjectSharingData[];
	homeProject?: ProjectSharingData;
	versionId?: string;
	usedCredentials?: IUsedCredential[];
	meta?: WorkflowMetadata;
}): IWorkflowDb {
	return {
		...options,
		createdAt: options.createdAt ?? '',
		updatedAt: options.updatedAt ?? '',
		versionId: options.versionId ?? '',
		id: options.id ?? uuid(),
		active: options.active ?? false,
		connections: options.connections ?? {},
	} as IWorkflowDb;
}

export function createTestNode(
	node: Partial<INode> & { name: INode['name']; type: INode['type'] },
): INode {
	return {
		id: uuid(),
		typeVersion: 1,
		position: [0, 0] as [number, number],
		parameters: {},
		...node,
	};
}
