import type { CredentialsRepository } from '@n8n/db';
import { Credentials } from 'n8n-core';
import type { INode } from 'n8n-workflow';

export const SLACK_TRIGGER_NODE_TYPE = 'n8n-nodes-base.slackTrigger';
const SLACK_CREDENTIAL_TYPE = 'slackApi';

export const SLACK_DOCUMENTATION_URL =
	'https://docs.n8n.io/integrations/builtin/trigger-nodes/n8n-nodes-base.slacktrigger/#verify-the-webhook';

function slackCredentialId(node: INode): string | null {
	return node.credentials?.[SLACK_CREDENTIAL_TYPE]?.id ?? null;
}

/**
 * The nodes among `nodes` whose Slack API credential has no signature secret.
 * Nodes without a Slack credential, or whose credential no longer exists, are
 * not returned. A decryption error is left to the caller.
 * Each credential is read and decrypted once per scan: `secretMissing` keeps the result.
 * A credential that fails to decrypt is read again for each workflow, so each one reports the error.
 */
export async function findSlackNodesWithoutSignatureSecret(
	credentialsRepository: CredentialsRepository,
	nodes: INode[],
	secretMissing: Map<string, boolean>,
): Promise<INode[]> {
	const slackNodes = nodes.flatMap((node) => {
		const credentialId = slackCredentialId(node);
		return credentialId === null ? [] : [{ node, credentialId }];
	});
	if (slackNodes.length === 0) return [];

	const unchecked = [...new Set(slackNodes.map(({ credentialId }) => credentialId))].filter(
		(id) => !secretMissing.has(id),
	);
	if (unchecked.length > 0) {
		for (const credential of await credentialsRepository.getManyByIds(unchecked)) {
			// A stale reference can point at a credential of another type; that is not a missing secret.
			if (credential.type !== SLACK_CREDENTIAL_TYPE) continue;
			const { signatureSecret } = await new Credentials(
				{ id: credential.id, name: credential.name },
				credential.type,
				credential.data,
			).getData();
			secretMissing.set(
				credential.id,
				typeof signatureSecret !== 'string' || signatureSecret === '',
			);
		}
		// Deleted credentials and credentials of another type.
		for (const id of unchecked) {
			if (!secretMissing.has(id)) secretMissing.set(id, false);
		}
	}

	return slackNodes
		.filter(({ credentialId }) => secretMissing.get(credentialId) === true)
		.map(({ node }) => node);
}
