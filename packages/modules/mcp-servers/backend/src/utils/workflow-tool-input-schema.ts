/** A JSON schema of the tool input. It always describes an object. */
export interface WorkflowToolInputSchema {
	type: 'object';
	properties?: Record<string, unknown>;
	required?: string[];
	additionalProperties: boolean | Record<string, unknown>;
}
