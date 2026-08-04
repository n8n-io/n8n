import { UnexpectedError, UserError } from 'n8n-workflow';

const quote = (names: string[]) => names.map((name) => `"${name}"`).join(', ');

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

export class UnsupportedConnectionTypeError extends UserError {
	constructor(nodeName: string, connectionType: string) {
		super(
			`Node "${nodeName}" has a "${connectionType}" connection, which is not supported yet. Only "main" connections are currently supported.`,
		);
	}
}

export class UnsupportedCycleError extends UserError {
	constructor(nodeNames: string[]) {
		super(
			`The cycle involving ${quote(nodeNames)} is not supported yet. Only Split In Batches loops are currently supported.`,
		);
	}
}

export class UnsupportedLoopEntryError extends UserError {
	constructor(memberNames: string[], entryNames: string[]) {
		super(
			`The loop formed by ${quote(memberNames)} must be entered only through its Split In Batches node, but its entry points are: ${quote(entryNames)}.`,
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

export class UnsupportedNodeTypeError extends UserError {
	constructor(nodeType: string) {
		super(`Node type "${nodeType}" has no execute method and cannot run as a step`);
	}
}

export class VmExpressionEngineRequiredError extends UnexpectedError {
	constructor() {
		super(
			'V1StepExecutor requires the VM expression engine. Initialize it via `Expression.initExpressionEngine()` before executing steps.',
		);
	}
}

export class EngineRequestNotSupportedError extends UserError {
	constructor(nodeType: string) {
		super(
			`Node type "${nodeType}" returned an engine request, but sub-node execution is not supported`,
		);
	}
}
