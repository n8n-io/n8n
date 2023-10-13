import type { INodeType, INodeTypeData, INodeTypes, IVersionedNodeType } from 'n8n-workflow';
import {
	IConnections,
	IDataObject,
	INode,
	IPinData,
	IWorkflowSettings,
	NodeHelpers,
	Workflow,
} from 'n8n-workflow';
import { uuid } from '@jsplumb/util';
import { defaultMockNodeTypes } from '@/__tests__/defaults';
import { INodeUi, ITag, IUsedCredential, IUser, IWorkflowDb, WorkflowMetadata } from '@/Interface';

export function createTestNodeTypes(data: INodeTypeData = {}): INodeTypes {
	const nodeTypes = {
		...defaultMockNodeTypes,
		...data,
	};

	function getByName(nodeType: string): INodeType | IVersionedNodeType {
		return nodeTypes[nodeType].type;
	}

	function getByNameAndVersion(nodeType: string, version?: number): INodeType {
		return NodeHelpers.getVersionedNodeType(nodeTypes[nodeType].type, version);
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
	sharedWith?: Array<Partial<IUser>>;
	ownedBy?: Partial<IUser>;
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
