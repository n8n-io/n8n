/* eslint-disable no-prototype-builtins */
import type { INode, IWorkflowCredentials } from 'n8n-workflow';
import * as Db from '@/Db';

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
				// eslint-disable-next-line no-await-in-loop
				foundCredentials = await Db.collections.Credentials.findOneBy({
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
