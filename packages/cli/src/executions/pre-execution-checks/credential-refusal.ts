import { Container } from '@n8n/di';
import type { INode } from 'n8n-workflow';
import { UserError } from '@n8n/errors';

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
		return toCredentialRefusal(error);
	}
}

/**
 * Whether `userId` can use every credential of `nodes` through their own
 * access. An Owner's or Admin's instance-wide `credential:use` does not count.
 * Execution redaction asks the same question, so this refuses a run whose data
 * the user could not see. Other errors are thrown: no later check makes this one.
 */
export async function findOwnAccessCredentialRefusal(
	nodes: INode[],
	userId: string,
): Promise<CredentialRefusal | undefined> {
	try {
		await Container.get(CredentialsPermissionChecker).checkForUser(userId, nodes, {
			ignoreGlobalUseScope: true,
		});
		return undefined;
	} catch (error) {
		if (!(error instanceof UserError)) throw error;
		return toCredentialRefusal(error);
	}
}

function toCredentialRefusal(error: UserError): CredentialRefusal {
	const node: unknown = Reflect.get(error, 'node');
	return {
		message: error.message,
		...(error.description ? { description: error.description } : {}),
		...(isNodeLike(node) ? { nodeName: node.name } : {}),
	};
}
