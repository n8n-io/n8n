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

	let node, type, name, foundCredentials;
	for (node of nodes) {
		if (node.disabled === true || !node.credentials) {
			continue;
		}

		for (type of Object.keys(node.credentials)) {
			if (!returnCredentials.hasOwnProperty(type)) {
				returnCredentials[type] = {};
			}
			name = node.credentials[type];

			if (!returnCredentials[type].hasOwnProperty(name)) {
				foundCredentials = await Db.collections.Credentials!.find({ name, type });
				if (!foundCredentials.length) {
					throw new Error(`Could not find credentials for type "${type}" with name "${name}".`);
				}
				returnCredentials[type][name] = foundCredentials[0];
			}
		}

	}

	return returnCredentials;
}
