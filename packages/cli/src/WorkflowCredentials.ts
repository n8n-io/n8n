import Container from 'typedi';
import type { INode, IWorkflowCredentials } from 'n8n-workflow';
import { CredentialsRepository } from '@db/repositories/credentials.repository';

// eslint-disable-next-line @typescript-eslint/naming-convention
export async function WorkflowCredentials(nodes: INode[]): Promise<IWorkflowCredentials> {
	// Go through all nodes to find which credentials are needed to execute the workflow
	const returnCredentials: IWorkflowCredentials = {};

	let node;
	let type;
	let nodeCredentials;
	let foundCredentials;

	for (node of nodes) {
		if (node.disabled === true || !node.credentials) {
			continue;
		}

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
				foundCredentials = await Container.get(CredentialsRepository).findOneBy({
					id: nodeCredentials.id,
					type,
				});
				if (!foundCredentials) {
					throw new Error(
						`Could not find credentials for type "${type}" with ID "${nodeCredentials.id}".`,
					);
				}

				returnCredentials[type][nodeCredentials.id] = foundCredentials;
			}
		}
	}

	return returnCredentials;
}
