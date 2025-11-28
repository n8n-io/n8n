import { randomCredentialPayload } from '@n8n/backend-test-utils';

/**
 * Test payload generators and sample data for access control tests
 * Provides standardized test data patterns for workflows and credentials
 */

/**
 * Creates a basic workflow payload for testing
 */
export function createBasicWorkflowPayload(name: string, projectId?: string) {
	const payload: any = {
		name,
		active: false,
		nodes: [
			{
				id: 'uuid-1234',
				parameters: {},
				name: 'Start',
				type: 'n8n-nodes-base.start',
				typeVersion: 1,
				position: [240, 300],
			},
		],
		connections: {},
	};

	if (projectId) {
		payload.projectId = projectId;
	}

	return payload;
}

/**
 * Creates a complex workflow payload with multiple nodes and connections
 */
export function createComplexWorkflowPayload(name: string, projectId?: string) {
	const payload: any = {
		name,
		active: false,
		nodes: [
			{
				id: 'start-node',
				parameters: {},
				name: 'Start',
				type: 'n8n-nodes-base.start',
				typeVersion: 1,
				position: [240, 300],
			},
			{
				id: 'set-node',
				parameters: {
					values: {
						string: [
							{
								name: 'test',
								value: 'value',
							},
						],
					},
				},
				name: 'Set',
				type: 'n8n-nodes-base.set',
				typeVersion: 1,
				position: [460, 300],
			},
		],
		connections: {
			Start: {
				main: [
					[
						{
							node: 'Set',
							type: 'main',
							index: 0,
						},
					],
				],
			},
		},
		settings: {
			saveExecutionProgress: true,
		},
		tags: ['test', 'complex'],
	};

	if (projectId) {
		payload.projectId = projectId;
	}

	return payload;
}

/**
 * Creates a workflow update payload
 */
export function createWorkflowUpdatePayload(name: string, versionId?: string) {
	const payload: any = {
		name,
		nodes: [
			{
				id: 'uuid-1234',
				parameters: {},
				name: 'Start Updated',
				type: 'n8n-nodes-base.start',
				typeVersion: 1,
				position: [240, 300],
			},
		],
		connections: {},
	};

	if (versionId) {
		payload.versionId = versionId;
	}

	return payload;
}

/**
 * Creates a basic credential payload using the test utility
 */
export function createBasicCredentialPayload(name?: string) {
	const payload = randomCredentialPayload();
	if (name) {
		payload.name = name;
	}
	return payload;
}

/**
 * Creates an HTTP Basic Auth credential payload
 */
export function createHttpBasicAuthCredentialPayload(name: string) {
	return {
		name,
		type: 'httpBasicAuth',
		data: {
			user: 'testuser',
			password: 'testpass',
		},
	};
}

/**
 * Creates an HTTP Header Auth credential payload
 */
export function createHttpHeaderAuthCredentialPayload(name: string) {
	return {
		name,
		type: 'httpHeaderAuth',
		data: {
			name: 'Authorization',
			value: 'Bearer test-token',
		},
	};
}

/**
 * Creates a credential update payload
 */
export function createCredentialUpdatePayload(originalCredential: any, newName: string) {
	return {
		...originalCredential,
		name: newName,
		data: originalCredential.data || {},
	};
}

/**
 * Creates a workflow sharing payload
 */
export function createWorkflowSharePayload(shareWithIds: string[]) {
	return {
		shareWithIds,
	};
}

/**
 * Creates a credential sharing payload
 */
export function createCredentialSharePayload(shareWithIds: string[]) {
	return {
		shareWithIds,
	};
}

/**
 * Creates a workflow transfer payload
 */
export function createWorkflowTransferPayload(destinationProjectId: string) {
	return {
		destinationProjectId,
	};
}

/**
 * Creates a credential transfer payload
 */
export function createCredentialTransferPayload(destinationProjectId: string) {
	return {
		destinationProjectId,
	};
}

/**
 * Common test workflow names for consistency
 */
export const TEST_WORKFLOW_NAMES = {
	BASIC: 'Test Workflow',
	COMPLEX: 'Complex Test Workflow',
	READ_ONLY: 'Read-Only Test Workflow',
	SINGLE_SCOPE: 'Single Scope Test Workflow',
	MULTI_SCOPE: 'Multi-scope Test Workflow',
	MIXED_READER: 'Mixed Reader Test Workflow',
	BOUNDARY_A: 'Boundary Test Workflow A',
	BOUNDARY_B: 'Boundary Test Workflow B',
	CROSS_PROJECT: 'Cross-Project Test Workflow',
	FORBIDDEN: 'Forbidden Test Workflow',
	UPDATED: 'Updated Test Workflow',
} as const;

/**
 * Common test credential names for consistency
 */
export const TEST_CREDENTIAL_NAMES = {
	BASIC: 'Test Credential',
	HTTP_BASIC: 'Test HTTP Credential',
	HTTP_HEADER: 'Test API Credential',
	READ_ONLY: 'Read-Only Test Credential',
	BOUNDARY_A: 'Boundary Test Credential A',
	BOUNDARY_B: 'Boundary Test Credential B',
	UPDATED: 'Updated Test Credential',
} as const;
