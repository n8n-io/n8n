import { parseWorkflowCodeToBuilder } from './parse-workflow-code';
import { prepareSourceForLint } from '../lint/sdk/workflow-sdk-lint';
import type { WorkflowJSON } from '../types/base';

/**
 * Parse a workflow source file as an agent writes it (SDK imports, light
 * TypeScript) without executing it, and lay the nodes out the same way the
 * sandbox build does. Throws when the source does not parse.
 */
export function parseWorkflowSource(source: string): WorkflowJSON {
	const { code } = prepareSourceForLint(source);
	return parseWorkflowCodeToBuilder(code).toJSON({ tidyUp: true });
}
