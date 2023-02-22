import type {
	INode,
	INodeCredentials,
	INodeParameters,
	INodeTypeNameVersion,
	INodeTypes,
} from 'n8n-workflow';
import { Workflow } from 'n8n-workflow';

const TEMP_NODE_NAME = 'Temp-Node';
const TEMP_WORKFLOW_NAME = 'Temp-Workflow';

export abstract class LoadNodeDetails {
	path: string;

	workflow: Workflow;

	constructor(
		nodeTypeNameAndVersion: INodeTypeNameVersion,
		nodeTypes: INodeTypes,
		path: string,
		currentNodeParameters: INodeParameters,
		credentials?: INodeCredentials,
	) {
		const nodeType = nodeTypes.getByNameAndVersion(
			nodeTypeNameAndVersion.name,
			nodeTypeNameAndVersion.version,
		);

		this.path = path;

		if (nodeType === undefined) {
			throw new Error(
				`The node-type "${nodeTypeNameAndVersion.name} v${nodeTypeNameAndVersion.version}"  is not known!`,
			);
		}

		const nodeData: INode = {
			parameters: currentNodeParameters,
			id: 'uuid-1234',
			name: TEMP_NODE_NAME,
			type: nodeTypeNameAndVersion.name,
			typeVersion: nodeTypeNameAndVersion.version,
			position: [0, 0],
		};

		if (credentials) {
			nodeData.credentials = credentials;
		}

		const workflowData = {
			nodes: [nodeData],
			connections: {},
		};

		this.workflow = new Workflow({
			nodes: workflowData.nodes,
			connections: workflowData.connections,
			active: false,
			nodeTypes,
		});
	}

	/**
	 * Returns data of a fake workflow
	 */
	getWorkflowData() {
		return {
			name: TEMP_WORKFLOW_NAME,
			active: false,
			connections: {},
			nodes: Object.values(this.workflow.nodes),
			createdAt: new Date(),
			updatedAt: new Date(),
		};
	}

	protected getTempNode() {
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		return this.workflow.getNode(TEMP_NODE_NAME)!;
	}
}
