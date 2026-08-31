import { UnexpectedError, UserError } from 'n8n-workflow';

const quote = (names: string[]) => names.map((name) => `"${name}"`).join(', ');

/**
 * Thrown when a v1 workflow uses a construct the converter does not (yet)
 * support. Caused by user-provided workflow content, hence a `UserError`.
 */
export class UnsupportedWorkflowError extends UserError {}

/** Only the caller knows which of several triggers fired. */
export class AmbiguousTriggerError extends UserError {
	constructor(nodeNames: string[]) {
		super(
			`This workflow has ${nodeNames.length} triggers (${quote(nodeNames)}), so the trigger that fired must be named.`,
		);
	}
}

export class NotATriggerError extends UserError {
	constructor(nodeName: string, nodeType: string) {
		super(`Node "${nodeName}" (${nodeType}) is not a trigger, so nothing can start from it.`);
	}
}

export class UnknownTriggerError extends UserError {
	constructor(nodeName: string) {
		super(`This workflow has no enabled node named "${nodeName}" to start from.`);
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
			'V1StepExecutor requires an isolated expression engine (vm or quickjs). Initialize it via `Expression.initExpressionEngine()` before executing steps.',
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
