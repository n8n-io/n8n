import type { StepIR, TriggerIR } from '../ir/schema';

export interface PatternInputDefinition {
	name: string;
	type: 'string' | 'number' | 'boolean' | 'enum' | 'json' | 'string[]';
	required: boolean;
	description: string;
	/** Clarification question when the input is missing. */
	question?: string;
	options?: readonly string[];
	default?: unknown;
}

export interface PatternInstance {
	triggers?: TriggerIR[];
	steps: StepIR[];
}

export interface PatternContext {
	/** Returns a unique step id with the given prefix. */
	stepId(prefix: string): string;
	/** Step id of the workflow's primary trigger, for field references. */
	triggerStepId: string;
}

/**
 * A reviewed, versioned expansion from a few semantic inputs to IR. Patterns
 * are how a large workflow compiles from a small number of decisions.
 */
export interface WorkflowPattern {
	id: string;
	version: number;
	title: string;
	description: string;
	keywords: readonly string[];
	/** Operation ids the pattern emits; the registry must know them all. */
	requiredOperations: readonly string[];
	inputs: readonly PatternInputDefinition[];
	instantiate(inputs: Record<string, unknown>, context: PatternContext): PatternInstance;
}
