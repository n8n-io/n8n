import {
	Db,
} from './';
import {
	INode,
	IWorkflowCredentials
} from 'n8n-workflow';


export async function WorkflowCredentials(nodes: INode[]): Promise<IWorkflowCredentials> {
	// Go through all nodes to find which credentials are needed to execute the workflow
	const returnCredentials: IWorkflowCredentials = {};

	let node, type, nodeCredentials, foundCredentials;
	for (node of nodes) {
		if (node.disabled === true || !node.credentials) {
			continue;
		}

		for (type of Object.keys(node.credentials)) {
			if (!returnCredentials.hasOwnProperty(type)) {
				returnCredentials[type] = {};
			}
			nodeCredentials = node.credentials[type];

			// TODO: if no id check for unique name
			if (nodeCredentials.id && !returnCredentials[type].hasOwnProperty(nodeCredentials.id)) {
				foundCredentials = await Db.collections.Credentials!.find({ id: nodeCredentials.id, type });
				if (!foundCredentials.length) {
					throw new Error(`Could not find credentials for type "${type}" with name "${nodeCredentials.name}".`);
				}
				returnCredentials[type][nodeCredentials.id] = foundCredentials[0];
			}
		}

	}

	return returnCredentials;
}
