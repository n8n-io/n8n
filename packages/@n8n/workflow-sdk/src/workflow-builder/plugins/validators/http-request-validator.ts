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

const XML_PAYLOAD_START_PATTERN =
	/^\s*(?:=\s*)?(?:\{\{\s*)?['"`]?\s*(?:<\?xml|<soap:?|<s:envelope|<env:envelope)/i;
const XML_PAYLOAD_REFERENCE_PATTERN = /\b(?:soap|xml)[\w-]*(?:body|payload|envelope|request)\b/i;
const XML_MEDIA_TYPE_PATTERN = /\b(?:text|application)\/(?:[\w.+-]*\+)?xml\b/i;

function looksLikeXmlPayload(value: unknown): boolean {
	if (typeof value !== 'string') return false;
	return (
		XML_PAYLOAD_START_PATTERN.test(value) ||
		(containsExpression(value) && XML_PAYLOAD_REFERENCE_PATTERN.test(value))
	);
}

function isMissingBody(value: unknown): boolean {
	return typeof value !== 'string' || value.trim() === '';
}

/**
 * Validator for HTTP Request nodes.
 *
 * Checks for:
 * - Hardcoded credentials in sensitive headers (Authorization, X-API-Key, etc.)
 * - Hardcoded credentials in query parameters
 * - XML/SOAP payloads configured as JSON bodies
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

		if (params.contentType === 'json' && looksLikeXmlPayload(params.jsonBody)) {
			issues.push({
				code: 'INVALID_PARAMETER',
				message: `'${node.name}' sends an XML/SOAP payload but is configured as JSON. For XML, SOAP, CSV, or plain-text HTTP Request bodies, set sendBody=true, contentType='raw', put the payload in body, set rawContentType to an XML media type such as 'text/xml' or 'application/xml', and omit specifyBody/jsonBody/bodyParameters.`,
				severity: 'error',
				nodeName: node.name,
				parameterPath: 'jsonBody',
			});
		}

		if (
			params.sendBody === true &&
			params.contentType === 'raw' &&
			XML_MEDIA_TYPE_PATTERN.test(
				typeof params.rawContentType === 'string' ? params.rawContentType : '',
			) &&
			isMissingBody(params.body)
		) {
			issues.push({
				code: 'INVALID_PARAMETER',
				message: `'${node.name}' is configured for a raw XML/SOAP body but the body field is empty. Put the XML payload or an expression such as expr('{{ $json.soapBody }}') in body, keep contentType='raw' and rawContentType set to an XML media type, and omit specifyBody/jsonBody/bodyParameters.`,
				severity: 'error',
				nodeName: node.name,
				parameterPath: 'body',
			});
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
