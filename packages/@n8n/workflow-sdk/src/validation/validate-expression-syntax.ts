import {
	ExpressionParser,
	INodeParametersSchema,
	NodeHelpers,
	NodeVersionNotFoundError,
	type INodeTypes,
} from 'n8n-workflow';

import { ValidationError } from './validate-workflow';
import type { WorkflowJSON } from '../types/base';
import { isPlaceholderValue } from '../workflow-builder/string-utils';
import { extractExpressions } from '../workflow-builder/validation-helpers';

/** Check active expression parameters with the runtime parser. No expression is executed. */
export async function validateWorkflowExpressionSyntax(
	workflow: WorkflowJSON,
	nodeTypes: INodeTypes,
): Promise<ValidationError[]> {
	const errors: ValidationError[] = [];
	for (const node of workflow.nodes) {
		if (node.disabled || !extractExpressions(node.parameters).length) continue;
		let description;
		try {
			description = nodeTypes.getByNameAndVersion(node.type, node.typeVersion)?.description;
		} catch (error) {
			if (error instanceof NodeVersionNotFoundError) continue;
			throw error;
		}
		if (!description) continue;
		const parsed = INodeParametersSchema.safeParse(node.parameters);
		if (!parsed.success) continue;
		// Match runtime visibility and noDataExpression handling without changing saved parameters.
		const parameters = NodeHelpers.getNodeParameters(
			description.properties,
			parsed.data,
			true,
			false,
			node,
			description,
		);
		for (const { expression, path } of extractExpressions(parameters)) {
			if (isPlaceholderValue(expression.slice(1))) continue;
			try {
				await ExpressionParser.validateExpressionSyntax(expression.slice(1));
			} catch (error) {
				if (!(error instanceof SyntaxError)) throw error;
				errors.push(
					new ValidationError(
						'INVALID_EXPRESSION',
						`Node "${node.name}" has invalid expression syntax in "${path}". Check the JavaScript and {{ }} delimiters. Separate adjacent object-closing braces inside an expression.`,
						node.name,
						path,
					),
				);
			}
		}
	}
	return errors;
}
