import type { INodeTypeDescription } from 'n8n-workflow';

import type { ProgrammaticViolation } from '@/validation/types';

import type { BinaryCheck, BinaryCheckContext, SimpleWorkflow } from '../types';

type ValidateFn = (
	workflow: SimpleWorkflow,
	nodeTypes: INodeTypeDescription[],
) => ProgrammaticViolation[];

interface ValidationCheckConfig {
	/** Check name in snake_case */
	name: string;
	/** Validation function to call. nodeTypes is always passed but can be ignored. */
	validate: ValidateFn;
	/** Optional filter to select specific violations. If omitted, all violations count. */
	filter?: (violation: ProgrammaticViolation) => boolean;
	/** Static comment when check fails. If omitted, violation descriptions are joined with '; '. */
	failComment?: string;
}

/**
 * Factory for binary checks that wrap existing validation functions.
 *
 * Eliminates boilerplate: call validator → filter violations → format comment.
 */
export function createValidationCheck(config: ValidationCheckConfig): BinaryCheck {
	return {
		name: config.name,
		kind: 'deterministic',
		// eslint-disable-next-line @typescript-eslint/require-await
		async run(workflow: SimpleWorkflow, ctx: BinaryCheckContext) {
			const all = config.validate(workflow, ctx.nodeTypes);
			const violations = config.filter ? all.filter(config.filter) : all;
			if (violations.length === 0) return { pass: true };
			const comment = config.failComment ?? violations.map((v) => v.description).join('; ');
			return { pass: false, comment };
		},
	};
}
