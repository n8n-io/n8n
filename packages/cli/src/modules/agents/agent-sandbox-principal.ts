import { createHash } from 'node:crypto';

import type { JSONObject } from '@n8n/agents';

export type AgentSandboxPrincipal =
	| { type: 'n8n-user'; userId: string }
	| {
			type: 'integration-user';
			connectionId: string;
			platform: string;
			platformUserId: string;
	  }
	| { type: 'workflow-session'; workflowId: string; sessionId: string }
	| {
			type: 'workflow-execution';
			workflowId: string;
			executionId: string;
	  }
	| { type: 'scheduled-task'; taskId: string };

declare const agentSandboxPrincipalHashBrand: unique symbol;

export type AgentSandboxPrincipalHash = string & {
	readonly [agentSandboxPrincipalHashBrand]: true;
};

export interface AgentSandboxPersistenceScope {
	projectId: string;
	principalHash: AgentSandboxPrincipalHash;
}

const AGENT_SANDBOX_HOST_METADATA_KEY = 'n8nAgentSandbox';

export function isAgentSandboxPrincipalHash(value: string): value is AgentSandboxPrincipalHash {
	return /^[A-Za-z0-9_-]{43}$/.test(value);
}

export function encodeAgentSandboxHostMetadata(scope: AgentSandboxPersistenceScope): JSONObject {
	return {
		[AGENT_SANDBOX_HOST_METADATA_KEY]: {
			projectId: scope.projectId,
			principalHash: scope.principalHash,
		},
	};
}

export function decodeAgentSandboxHostMetadata(
	hostMetadata: JSONObject | undefined,
): AgentSandboxPersistenceScope | undefined {
	const scope = hostMetadata?.[AGENT_SANDBOX_HOST_METADATA_KEY];
	if (
		typeof scope !== 'object' ||
		scope === null ||
		Array.isArray(scope) ||
		Object.keys(scope).length !== 2
	) {
		return undefined;
	}
	const { projectId, principalHash } = scope;
	if (
		typeof projectId !== 'string' ||
		typeof principalHash !== 'string' ||
		!isAgentSandboxPrincipalHash(principalHash)
	) {
		return undefined;
	}
	return { projectId, principalHash };
}

export function hashAgentSandboxPrincipal(
	principal: AgentSandboxPrincipal,
): AgentSandboxPrincipalHash {
	let canonicalPrincipal: string[];

	switch (principal.type) {
		case 'n8n-user':
			canonicalPrincipal = [principal.type, principal.userId];
			break;
		case 'integration-user':
			canonicalPrincipal = [
				principal.type,
				principal.connectionId,
				principal.platform,
				principal.platformUserId,
			];
			break;
		case 'workflow-session':
			canonicalPrincipal = [principal.type, principal.workflowId, principal.sessionId];
			break;
		case 'workflow-execution':
			canonicalPrincipal = [principal.type, principal.workflowId, principal.executionId];
			break;
		case 'scheduled-task':
			canonicalPrincipal = [principal.type, principal.taskId];
			break;
	}

	return createHash('sha256')
		.update(JSON.stringify(canonicalPrincipal))
		.digest('base64url') as AgentSandboxPrincipalHash;
}
