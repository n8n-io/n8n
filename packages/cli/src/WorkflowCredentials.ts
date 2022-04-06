/* eslint-disable no-prototype-builtins */
import { INode, IWorkflowCredentials } from 'n8n-workflow';
// eslint-disable-next-line import/no-cycle
import { Db } from '.';

// eslint-disable-next-line @typescript-eslint/naming-convention
export async function WorkflowCredentials(nodes: INode[]): Promise<IWorkflowCredentials> {
	// Go through all nodes to find which credentials are needed to execute the workflow
	const returnCredentials: IWorkflowCredentials = {};

	let node;
	let type;
	let nodeCredentials;
	let foundCredentials;
	// eslint-disable-next-line no-restricted-syntax
	for (node of nodes) {
		if (node.disabled === true || !node.credentials) {
			// eslint-disable-next-line no-continue
			continue;
		}

		// eslint-disable-next-line no-restricted-syntax
		for (type of Object.keys(node.credentials)) {
			if (!returnCredentials[type]) {
				returnCredentials[type] = {};
			}
			nodeCredentials = node.credentials[type];

			if (!nodeCredentials.id) {
				throw new Error(
					`Credentials with name "${nodeCredentials.name}" for type "${type}" miss an ID.`,
				);
			}

			if (!returnCredentials[type][nodeCredentials.id]) {
				// eslint-disable-next-line no-await-in-loop, @typescript-eslint/no-non-null-assertion
				foundCredentials = await Db.collections.Credentials!.findOne({
					id: nodeCredentials.id,
					type,
				});
				if (!foundCredentials) {
					throw new Error(
						`Could not find credentials for type "${type}" with ID "${nodeCredentials.id}".`,
					);
				}
				// eslint-disable-next-line prefer-destructuring
				returnCredentials[type][nodeCredentials.id] = foundCredentials;
			}
		}
	}

	return returnCredentials;
}
