import { ValidationError } from './validate-workflow';
import type { WorkflowJSON } from '../types/base';

/** Parse Code-node function bodies without running user code. */
export async function validateWorkflowCodeSyntax(
	workflow: WorkflowJSON,
): Promise<ValidationError[]> {
	const nodes = workflow.nodes.filter(
		(node) =>
			!node.disabled &&
			node.type === 'n8n-nodes-base.code' &&
			(node.parameters?.language === undefined || node.parameters.language === 'javaScript') &&
			typeof node.parameters?.jsCode === 'string',
	);
	if (!nodes.length) return [];
	const { parse } = await import('acorn');
	const errors: ValidationError[] = [];
	for (const node of nodes) {
		const code = node.parameters?.jsCode;
		if (typeof code !== 'string') continue;
		const source = `async function __n8nCode__() {\n${code}\n}`;
		try {
			const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'script' });
			if (
				ast.body.length !== 1 ||
				ast.body[0].type !== 'FunctionDeclaration' ||
				ast.body[0].end !== source.length
			) {
				throw new SyntaxError('Unexpected statements outside the Code node body.');
			}
		} catch (error) {
			if (!(error instanceof SyntaxError)) throw error;
			errors.push(
				new ValidationError(
					'INVALID_PARAMETER',
					`Node "${node.name}" has invalid JavaScript syntax in "jsCode". Check braces, quotes, and function-body syntax.`,
					node.name,
					'jsCode',
				),
			);
		}
	}
	return errors;
}
