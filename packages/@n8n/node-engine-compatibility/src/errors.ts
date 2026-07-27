import { UserError } from 'n8n-workflow';

/**
 * Thrown when a v1 workflow uses a construct the converter does not (yet)
 * support. Caused by user-provided workflow content, hence a `UserError`.
 */
export class UnsupportedWorkflowError extends UserError {}

export class UnsupportedTriggerError extends UserError {
	constructor(nodeName: string, nodeType: string) {
		super(
			`Trigger node "${nodeName}" (${nodeType}) is not supported yet; only the Manual Trigger is currently supported.`,
		);
	}
}

export class UnsupportedStepTypeError extends UserError {
	constructor(stepType: string) {
		super(`V1StepExecutor only handles 'v1-node' steps, got '${stepType}'`);
	}
}

export class MalformedStepConfigError extends UserError {
	constructor(stepName: string) {
		super(`Step "${stepName}" has a missing or malformed v1-node config`);
	}
}

export class UnknownNodeTypeError extends UserError {
	constructor(nodeType: string) {
		super(`Unknown node type "${nodeType}"`);
	}
}

export class UnsupportedNodeTypeError extends UserError {
	constructor(nodeType: string) {
		super(`Node type "${nodeType}" has no execute method and cannot run as a step`);
	}
}

export class EngineRequestNotSupportedError extends UserError {
	constructor(nodeType: string) {
		super(
			`Node type "${nodeType}" returned an engine request, but sub-node execution is not supported`,
		);
	}
}
