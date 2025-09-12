import type { Response } from 'supertest';

/**
 * Reusable assertion helpers for access control tests
 * Provides standardized validation patterns for HTTP responses and permission checks
 */

/**
 * Validates that a response has the expected status code and contains data
 */
export function expectSuccessResponse(response: Response, expectedStatus: number = 200) {
	expect(response.status).toBe(expectedStatus);
	expect(response.body).toBeDefined();
	expect(response.body.data).toBeDefined();
}

/**
 * Validates that a response indicates forbidden access
 */
export function expectForbiddenResponse(response: Response) {
	expect(response.status).toBe(403);
}

/**
 * Validates that a response indicates bad request (usually for creation without permissions)
 */
export function expectBadRequestResponse(response: Response) {
	expect(response.status).toBe(400);
}

/**
 * Validates that a response indicates not found
 */
export function expectNotFoundResponse(response: Response) {
	expect(response.status).toBe(404);
}

/**
 * Validates that a workflow response contains expected workflow data
 */
export function expectWorkflowResponse(response: Response, expectedName?: string) {
	expectSuccessResponse(response);
	expect(response.body.data.id).toBeDefined();
	expect(response.body.data.name).toBeDefined();
	expect(response.body.data.nodes).toBeDefined();
	expect(response.body.data.connections).toBeDefined();

	if (expectedName) {
		expect(response.body.data.name).toBe(expectedName);
	}
}

/**
 * Validates that a credential response contains expected credential data
 */
export function expectCredentialResponse(response: Response, expectedName?: string) {
	expectSuccessResponse(response);
	expect(response.body.data.id).toBeDefined();
	expect(response.body.data.name).toBeDefined();
	expect(response.body.data.type).toBeDefined();

	if (expectedName) {
		expect(response.body.data.name).toBe(expectedName);
	}
}

/**
 * Validates that a list response contains an array of items
 */
export function expectListResponse(response: Response, expectedMinLength?: number) {
	expectSuccessResponse(response);
	expect(Array.isArray(response.body.data)).toBe(true);

	if (expectedMinLength !== undefined) {
		expect(response.body.data.length).toBeGreaterThanOrEqual(expectedMinLength);
	}
}

/**
 * Validates that a list response is empty
 */
export function expectEmptyListResponse(response: Response) {
	expectSuccessResponse(response);
	expect(Array.isArray(response.body.data)).toBe(true);
	expect(response.body.data.length).toBe(0);
}

/**
 * Validates that a workflow list contains a specific workflow
 */
export function expectWorkflowInList(response: Response, workflowName: string) {
	expectListResponse(response);
	const workflow = response.body.data.find((wf: any) => wf.name === workflowName);
	expect(workflow).toBeDefined();
	return workflow;
}

/**
 * Validates that a workflow list does NOT contain a specific workflow
 */
export function expectWorkflowNotInList(response: Response, workflowName: string) {
	expectListResponse(response);
	const workflow = response.body.data.find((wf: any) => wf.name === workflowName);
	expect(workflow).toBeUndefined();
}

/**
 * Validates that a credential list contains a specific credential
 */
export function expectCredentialInList(response: Response, credentialName: string) {
	expectListResponse(response);
	const credential = response.body.data.find((cred: any) => cred.name === credentialName);
	expect(credential).toBeDefined();
	return credential;
}

/**
 * Validates that a credential list does NOT contain a specific credential
 */
export function expectCredentialNotInList(response: Response, credentialName: string) {
	expectListResponse(response);
	const credential = response.body.data.find((cred: any) => cred.name === credentialName);
	expect(credential).toBeUndefined();
}

/**
 * Validates that user can access a specific project's workflows
 */
export function expectProjectWorkflowAccess(response: Response, projectId: string) {
	expectListResponse(response);
	// Check if any workflows belong to the specified project
	const projectWorkflows = response.body.data.filter(
		(wf: any) => wf.homeProject && wf.homeProject.id === projectId,
	);
	return projectWorkflows;
}

/**
 * Validates that user cannot access a specific project's workflows
 */
export function expectNoProjectWorkflowAccess(response: Response, projectId: string) {
	const projectWorkflows = expectProjectWorkflowAccess(response, projectId);
	expect(projectWorkflows).toHaveLength(0);
}

/**
 * Validates that user can access a specific project's credentials
 */
export function expectProjectCredentialAccess(response: Response, projectId: string) {
	expectListResponse(response);
	// Check if any credentials belong to the specified project
	const projectCredentials = response.body.data.filter(
		(cred: any) => cred.homeProject && cred.homeProject.id === projectId,
	);
	return projectCredentials;
}

/**
 * Validates that user cannot access a specific project's credentials
 */
export function expectNoProjectCredentialAccess(response: Response, projectId: string) {
	const projectCredentials = expectProjectCredentialAccess(response, projectId);
	expect(projectCredentials).toHaveLength(0);
}

/**
 * Validates that a response contains scope information
 */
export function expectScopesInResponse(response: Response, expectedScopes?: string[]) {
	expectSuccessResponse(response);
	expect(response.body.data.scopes).toBeDefined();
	expect(Array.isArray(response.body.data.scopes)).toBe(true);

	if (expectedScopes) {
		expect(response.body.data.scopes).toEqual(expect.arrayContaining(expectedScopes));
	}
}

/**
 * Validates role scope counts for custom roles
 */
export function expectRoleScopeCounts(
	workflowReader: any,
	workflowWriter: any,
	credentialReader: any,
	credentialWriter: any,
) {
	expect(workflowReader.scopes).toHaveLength(2);
	expect(workflowWriter.scopes).toHaveLength(4);
	expect(credentialReader.scopes).toHaveLength(2);
	expect(credentialWriter.scopes).toHaveLength(4);
}

/**
 * Validates specialized role scope counts
 */
export function expectSpecializedRoleScopeCounts(
	writeOnlyRole: any,
	deleteOnlyRole: any,
	mixedReaderRole: any,
) {
	expect(writeOnlyRole.scopes).toHaveLength(2);
	expect(deleteOnlyRole.scopes).toHaveLength(1);
	expect(mixedReaderRole.scopes).toHaveLength(4);
}

/**
 * Helper to check if a response contains any server errors
 */
export function expectNoServerError(response: Response) {
	expect(response.status).toBeLessThan(500);
}

/**
 * Helper to validate that an operation is properly forbidden
 */
export function expectOperationForbidden(response: Response) {
	// Should be forbidden (403) or bad request (400) if validation prevents the operation
	expect([400, 403]).toContain(response.status);
}
