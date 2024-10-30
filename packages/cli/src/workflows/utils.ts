import type { WorkflowEntity } from '@/databases/entities/workflow-entity';

export function toBase64(id: string): string {
	return Buffer.from(id).toString('base64');
}

export function fromBase64(encoded: string): string {
	return Buffer.from(encoded, 'base64').toString();
}

export function getEncodedCredentialIds(workflow: WorkflowEntity): string[] {
	const credentialIds: string[] = [];

	for (const nodes of workflow.nodes) {
		for (const credential of Object.values(nodes.credentials ?? {})) {
			if (credential.id) {
				credentialIds.push(toBase64(credential.id));
			}
		}
	}

	return credentialIds;
}
