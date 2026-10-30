import { Container } from '@n8n/di';
import type { INode } from 'n8n-workflow';
import { UserError } from 'n8n-workflow';

import { CredentialsPermissionChecker } from './credentials-permission-checker';

/** Why `WorkflowRunner.run` refuses to run a workflow for a user. */
export type CredentialRefusal = { message: string; description?: string; nodeName?: string };

function isNodeLike(value: unknown): value is { name: string } {
	return (
		typeof value === 'object' && value !== null && typeof Reflect.get(value, 'name') === 'string'
	);
}

/**
 * The credential check `WorkflowRunner.run` makes for this user, made up front
 * for its message. The runner saves a refused run as a failed execution, and
 * redaction strips the reason from that execution when the credential is one
 * this user cannot use.
 *
 * The runner still makes the check that counts. So an error that is not a
 * refusal gives `undefined`, and the caller lets the runner decide.
 */
export async function findCredentialRefusal(
	workflowId: string,
	nodes: INode[],
	userId: string,
): Promise<CredentialRefusal | undefined> {
	try {
		await Container.get(CredentialsPermissionChecker).check(workflowId, nodes, userId);
		return undefined;
	} catch (error) {
		if (!(error instanceof UserError)) return undefined;
		const node: unknown = Reflect.get(error, 'node');
		return {
			message: error.message,
			...(error.description ? { description: error.description } : {}),
			...(isNodeLike(node) ? { nodeName: node.name } : {}),
		};
	}
}
