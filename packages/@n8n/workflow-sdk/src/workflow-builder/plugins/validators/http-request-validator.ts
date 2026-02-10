/**
 * HTTP Request Validator Plugin
 *
 * Validates HTTP Request nodes for security issues.
 */

import type { GraphNode, NodeInstance } from '../../../types/base';
import {
	containsExpression,
	isSensitiveHeader,
	isCredentialFieldName,
} from '../../validation-helpers';
import type { ValidatorPlugin, ValidationIssue, PluginContext } from '../types';

/**
 * Validator for HTTP Request nodes.
 *
 * Checks for:
 * - Hardcoded credentials in sensitive headers (Authorization, X-API-Key, etc.)
 * - Hardcoded credentials in query parameters
 */
export const httpRequestValidator: ValidatorPlugin = {
	id: 'core:http-request',
	name: 'HTTP Request Validator',
	nodeTypes: ['n8n-nodes-base.httpRequest'],
	priority: 50,

	validateNode(
		node: NodeInstance<string, string, unknown>,
		_graphNode: GraphNode,
		_ctx: PluginContext,
	): ValidationIssue[] {
		const issues: ValidationIssue[] = [];
		const params = node.config?.parameters as Record<string, unknown> | undefined;

		if (!params) {
			return issues;
		}

		// Check header parameters for sensitive headers
		const headerParams = params.headerParameters as
			| { parameters?: Array<{ name?: string; value?: unknown }> }
			| undefined;

		if (headerParams?.parameters) {
			for (const header of headerParams.parameters) {
				const headerValueStr =
					typeof header.value === 'string' ? header.value : JSON.stringify(header.value);
				if (
					header.name &&
					isSensitiveHeader(header.name) &&
					header.value &&
					!containsExpression(headerValueStr)
				) {
					issues.push({
						code: 'HARDCODED_CREDENTIALS',
						message: `'${node.name}' has a hardcoded value for sensitive header "${header.name}". Should create credentials, setting genericAuthType to httpHeaderAuth or httpBearerAuth).`,
						severity: 'warning',
						nodeName: node.name,
						parameterPath: `headerParameters.parameters[${header.name}]`,
					});
				}
			}
		}

		// Check query parameters for credential-like names
		const queryParams = params.queryParameters as
			| { parameters?: Array<{ name?: string; value?: unknown }> }
			| undefined;

		if (queryParams?.parameters) {
			for (const param of queryParams.parameters) {
				const paramValueStr =
					typeof param.value === 'string' ? param.value : JSON.stringify(param.value);
				if (
					param.name &&
					isCredentialFieldName(param.name) &&
					param.value &&
					!containsExpression(paramValueStr)
				) {
					issues.push({
						code: 'HARDCODED_CREDENTIALS',
						message: `'${node.name}' has a hardcoded value for credential-like query parameter "${param.name}". Should create credentials, setting genericAuthType to httpQueryAuth).`,
						severity: 'warning',
						nodeName: node.name,
						parameterPath: `queryParameters.parameters[${param.name}]`,
					});
				}
			}
		}

		return issues;
	},
};
