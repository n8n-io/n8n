import { parseWorkflowCodeToBuilder } from './parse-workflow-code';
import type { WorkflowJSON } from '../types/base';

/**
 * Remove what the interpreter cannot read: SDK imports and type annotations on
 * variable declarations. The lint preprocessor is not reused here: it also
 * strips `name: value` after a comma as if it were a parameter annotation,
 * which is harmless for lint but drops object properties when executed.
 */
function stripForInterpreter(source: string): string {
	return source
		.replace(/^\s*import\s[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, '')
		.replace(/^\s*import\s+['"][^'"]+['"];?\s*$/gm, '')
		.replace(/\b((?:const|let|var)\s+[A-Za-z_$][\w$]*)\s*:\s*[^=;\n]+?(?=\s*=[^=>])/g, '$1');
}

/**
 * Parse a workflow source file as an agent writes it (SDK imports, light
 * TypeScript) without executing it, and lay the nodes out the same way the
 * sandbox build does. Throws when the source does not parse.
 */
export function parseWorkflowSource(source: string): WorkflowJSON {
	return parseWorkflowCodeToBuilder(stripForInterpreter(source)).toJSON({ tidyUp: true });
}
