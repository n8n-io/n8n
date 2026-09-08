import { NodeApiError, UserError } from 'n8n-workflow';
import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
} from 'n8n-workflow';

import { databricksUserAgent } from '../constants';

import type { DatabricksCredentials, OpenAPISchema } from './interfaces';

/**
 * Single egress point for the Databricks API, so every request carries the
 * partner User-Agent. Enforced by eslint-user-agent-restriction.mjs.
 *
 * Takes `context` explicitly rather than the house `this`-binding style because
 * some callers (e.g. `fetchResourcesInSchema` in methods/listSearch.ts) are plain
 * functions with no `this`.
 *
 * Setting a User-Agent deliberately opts these calls out of the instance-wide
 * outbound UA, including `N8N_GLOBAL_USER_AGENT_VALUE` — partner attribution
 * requires a single predictable token.
 */
export async function databricksApiRequest(
	context: IExecuteFunctions | ILoadOptionsFunctions,
	credentialType: 'databricksApi' | 'databricksOAuth2Api',
	options: IHttpRequestOptions,
): ReturnType<IExecuteFunctions['helpers']['httpRequestWithAuthentication']> {
	return await context.helpers.httpRequestWithAuthentication.call(context, credentialType, {
		...options,
		headers: {
			...options.headers,
			// Last, so a caller cannot override it
			'User-Agent': databricksUserAgent(),
		},
	});
}

export function getActiveCredentialType(
	context: IExecuteFunctions | ILoadOptionsFunctions,
	itemIndex: number,
): 'databricksApi' | 'databricksOAuth2Api' {
	const authentication = context.getNodeParameter(
		'authentication',
		itemIndex,
		'accessToken',
	) as string;
	return authentication === 'oAuth2' ? 'databricksOAuth2Api' : 'databricksApi';
}

export async function getHost(
	context: IExecuteFunctions | ILoadOptionsFunctions,
	credentialType: 'databricksApi' | 'databricksOAuth2Api',
): Promise<string> {
	const credentials = await context.getCredentials<DatabricksCredentials>(credentialType);
	return credentials.host.replace(/\/$/, '');
}

// Body text comes from whatever server `host` points at — truncate and strip
// control chars before promoting it to a visible error message
export function sanitizeApiMessage(message: string): string {
	// eslint-disable-next-line no-control-regex
	return message.replace(/[\x00-\x1f\x7f]+/g, ' ').slice(0, 500);
}

// Must be called at every request entry point (router catch, listSearch wrapper):
// databricksApiRequest() only attaches the User-Agent and deliberately does not
// wrap errors, so callers still own their catch. Keyed on PERMISSION_DENIED only; widen
// the key if other Databricks error_codes with legible messages show up. Keyed on
// the error_code, not HTTP 403, so expired-token 403s (which core retries via
// refresh) aren't mislabeled if they leak through. Mutates rather than re-wraps:
// `new NodeApiError(node, existingNodeApiError)` returns the original untouched.
export function makePermissionErrorLegible(error: unknown): void {
	if (!(error instanceof NodeApiError)) return;

	// Requests with encoding: 'arraybuffer' (file downloads) receive their 403
	// JSON body as raw bytes, so parse Buffer/string bodies before reading it
	let data = error.context.data;
	if (Buffer.isBuffer(data) || typeof data === 'string') {
		try {
			data = JSON.parse(data.toString()) as IDataObject;
		} catch {
			return;
		}
	}

	const body = data as IDataObject | undefined;
	if (body?.error_code !== 'PERMISSION_DENIED') return;

	const apiMessage = body.message;
	if (typeof apiMessage === 'string' && apiMessage) {
		error.message = sanitizeApiMessage(apiMessage);
		error.description =
			'Grant the named permission to the signed-in user or service principal in Databricks, then retry.';
	}
}

export function extractResourceLocatorValue(param: unknown): string {
	if (typeof param === 'object' && param !== null) {
		return (param as { value?: string }).value || '';
	}
	return (param as string) || '';
}

type DetectFormatResult = {
	format: string;
	schema: unknown;
	requiredFields: string[];
	invocationUrl: string;
};

function detectFormatFromProperties(
	properties: Record<string, unknown>,
	invocationUrl: string,
	isOneOf = false,
): DetectFormatResult | null {
	if (properties.messages)
		return {
			format: 'chat',
			schema: properties.messages,
			requiredFields: ['messages'],
			invocationUrl,
		};
	if (properties.prompt)
		return {
			format: 'completions',
			schema: properties.prompt,
			requiredFields: ['prompt'],
			invocationUrl,
		};
	if (
		properties.input &&
		(!isOneOf || (!properties.dataframe_records && !properties.dataframe_split))
	)
		return {
			format: 'embeddings',
			schema: properties.input,
			requiredFields: ['input'],
			invocationUrl,
		};
	if (properties.dataframe_split)
		return {
			format: 'dataframe_split',
			schema: properties.dataframe_split,
			requiredFields: ['dataframe_split'],
			invocationUrl,
		};
	if (properties.dataframe_records)
		return {
			format: 'dataframe_records',
			schema: properties.dataframe_records,
			requiredFields: ['dataframe_records'],
			invocationUrl,
		};
	if (properties.inputs)
		return {
			format: 'inputs',
			schema: properties.inputs,
			requiredFields: ['inputs'],
			invocationUrl,
		};
	if (properties.instances)
		return {
			format: 'instances',
			schema: properties.instances,
			requiredFields: ['instances'],
			invocationUrl,
		};
	return null;
}

export function detectInputFormat(openApiSchema: OpenAPISchema): DetectFormatResult {
	const invocationUrl = openApiSchema.servers?.[0]?.url;
	if (!invocationUrl) {
		throw new UserError('No server URL found in OpenAPI schema');
	}

	const pathKeys = Object.keys(openApiSchema.paths);
	if (!pathKeys.length) {
		throw new UserError('No paths found in OpenAPI schema');
	}

	const invocationPath = pathKeys[0];
	const postOperation = openApiSchema.paths[invocationPath]?.post;

	if (!postOperation?.requestBody?.content?.['application/json']?.schema) {
		throw new UserError('No request schema found');
	}

	const schema = postOperation.requestBody.content['application/json'].schema;

	if (schema.oneOf && schema.oneOf.length > 0) {
		for (const option of schema.oneOf) {
			const properties = (option.properties || {}) as Record<string, unknown>;
			const result = detectFormatFromProperties(properties, invocationUrl, true);
			if (result) return result;
		}
	}

	const properties = (schema.properties || {}) as Record<string, unknown>;
	const result = detectFormatFromProperties(properties, invocationUrl);
	if (result) return result;

	return { format: 'generic', schema, requiredFields: [], invocationUrl };
}

export function generateExampleFromSchema(schema: unknown, format: string): string {
	const schemaObj = schema as {
		properties?: Record<string, { type?: string; oneOf?: unknown[] }>;
	} | null;
	if (schemaObj?.properties) {
		try {
			const exampleObj: Record<string, unknown> = {};

			for (const [key, propValue] of Object.entries(schemaObj.properties)) {
				const propType = propValue.type;

				if (key === 'messages' && propType === 'array') {
					exampleObj.messages = [{ role: 'user', content: 'Hello! How can you help me today?' }];
				} else if (key === 'prompt' && propType === 'string') {
					exampleObj.prompt = 'What is Databricks?';
				} else if (key === 'input' && propType === 'array') {
					exampleObj.input = ['Text to embed'];
				} else if (key === 'max_tokens' && propType === 'integer') {
					exampleObj.max_tokens = 256;
				} else if (key === 'temperature' && propType === 'number') {
					exampleObj.temperature = 0.7;
				} else if (key === 'top_p' && propType === 'number') {
					exampleObj.top_p = 0.9;
				} else if (key === 'top_k' && propType === 'integer') {
					exampleObj.top_k = 40;
				} else if (key === 'stream' && propType === 'boolean') {
					exampleObj.stream = false;
				} else if (key === 'n' && propType === 'integer') {
					exampleObj.n = 1;
				} else if (key === 'stop' && propValue.oneOf) {
					exampleObj.stop = ['\\n'];
				}
			}

			if (Object.keys(exampleObj).length > 0) {
				return JSON.stringify(exampleObj, null, 2);
			}
		} catch (e) {
			// Fall through to default examples
		}
	}

	const examples: Record<string, string> = {
		chat: `{
  "messages": [
    {
      "role": "user",
      "content": "Hello! How are you?"
    }
  ],
  "max_tokens": 256,
  "temperature": 0.7
}`,
		completions: `{
  "prompt": "What is machine learning?",
  "max_tokens": 256,
  "temperature": 0.7,
  "top_p": 0.9
}`,
		embeddings: `{
  "input": [
    "Example text to embed"
  ]
}`,
		dataframe_split: `{
  "dataframe_split": {
    "columns": ["feature1", "feature2"],
    "data": [[1.0, 2.0], [3.0, 4.0]]
  }
}`,
		dataframe_records: `{
  "dataframe_records": [
    {"feature1": 1.0, "feature2": 2.0}
  ]
}`,
		inputs: `{
  "inputs": {
    "tensor1": [1, 2, 3]
  }
}`,
		instances: `{
  "instances": [
    {"tensor1": 1}
  ]
}`,
	};

	return examples[format] || '{}';
}

export function validateRequestBody(
	requestBody: Record<string, unknown>,
	detectedFormat: string,
): void {
	switch (detectedFormat) {
		case 'chat':
			if (!requestBody.messages || !Array.isArray(requestBody.messages)) {
				throw new UserError('Invalid chat format: "messages" array is required');
			}
			break;
		case 'completions':
			if (!requestBody.prompt) {
				throw new UserError('Invalid completions format: "prompt" is required');
			}
			break;
		case 'embeddings':
			if (!requestBody.input) {
				throw new UserError('Invalid embeddings format: "input" is required');
			}
			break;
		case 'dataframe_split':
			if (!(requestBody.dataframe_split as Record<string, unknown>)?.data) {
				throw new UserError('Invalid dataframe_split format: "dataframe_split.data" is required');
			}
			break;
		case 'dataframe_records':
			if (!requestBody.dataframe_records || !Array.isArray(requestBody.dataframe_records)) {
				throw new UserError(
					'Invalid dataframe_records format: "dataframe_records" array is required',
				);
			}
			break;
		case 'inputs':
			if (!requestBody.inputs) {
				throw new UserError('Invalid inputs format: "inputs" is required');
			}
			break;
		case 'instances':
			if (!requestBody.instances || !Array.isArray(requestBody.instances)) {
				throw new UserError('Invalid instances format: "instances" array is required');
			}
			break;
	}
}
