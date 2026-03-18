import { jsonParse, NodeOperationError } from 'n8n-workflow';
import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import {
	detectInputFormat,
	generateExampleFromSchema,
	getActiveCredentialType,
	getHost,
	validateRequestBody,
} from '../helpers';
import type { OpenAPISchema } from '../interfaces';

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const credentialType = getActiveCredentialType(this, i);
	const host = await getHost(this, credentialType);
	const endpointName = this.getNodeParameter('endpointName', i, '', {
		extractValue: true,
	}) as string;
	const requestBodyRaw = this.getNodeParameter('requestBody', i);
	const requestBody =
		typeof requestBodyRaw === 'string'
			? jsonParse<Record<string, unknown>>(requestBodyRaw)
			: (requestBodyRaw as Record<string, unknown>);

	// Step 1: Fetch the OpenAPI schema for this endpoint
	let detectedFormat = 'generic';
	let invocationUrl = `${host}/serving-endpoints/${endpointName}/invocations`; // Default fallback
	let exampleRequestBody = '';

	try {
		const openApiResponse = (await this.helpers.httpRequestWithAuthentication.call(
			this,
			credentialType,
			{
				method: 'GET',
				url: `${host}/api/2.0/serving-endpoints/${endpointName}/openapi`,
				headers: { Accept: 'application/json' },
				json: true,
			},
		)) as OpenAPISchema[];

		if (openApiResponse?.length > 0) {
			const schemaInfo = detectInputFormat(openApiResponse[0]);
			detectedFormat = schemaInfo.format;
			const schemaUrl = schemaInfo.invocationUrl;

			// Only use the URL from the schema if it belongs to the same host as the
			// configured credential. This prevents a malicious or compromised endpoint
			// from returning an attacker-controlled server URL and causing the node to
			// forward the Databricks bearer token to an external host.
			if (!URL.canParse(schemaUrl)) {
				throw new NodeOperationError(
					this.getNode(),
					`The serving endpoint returned an invalid server URL in its OpenAPI schema: ${schemaUrl}`,
				);
			}
			if (new URL(schemaUrl).origin !== new URL(host).origin) {
				throw new NodeOperationError(
					this.getNode(),
					`The serving endpoint's OpenAPI schema contains a server URL (${schemaUrl}) that does not match the configured Databricks host (${host}). This request has been blocked for security reasons.`,
				);
			}

			invocationUrl = schemaUrl;
			exampleRequestBody = generateExampleFromSchema(schemaInfo.schema, detectedFormat);

			try {
				validateRequestBody(requestBody, detectedFormat);
			} catch (validationError) {
				throw new NodeOperationError(
					this.getNode(),
					`${(validationError as Error).message}\n\nDetected format: ${detectedFormat}\n\nExample request body:\n${exampleRequestBody}\n\nYour request body:\n${JSON.stringify(requestBody, null, 2)}`,
				);
			}
		}
	} catch (error) {
		if (error instanceof NodeOperationError) {
			throw error;
		}

		this.logger.warn('Could not fetch or parse endpoint schema, using default URL', {
			endpointName,
			error: (error as Error).message,
			defaultUrl: invocationUrl,
		});

		if (!exampleRequestBody) {
			exampleRequestBody = generateExampleFromSchema(null, detectedFormat);
		}
	}

	// Step 2: Make the request using the URL from schema
	try {
		const response = await this.helpers.httpRequestWithAuthentication.call(this, credentialType, {
			method: 'POST',
			url: invocationUrl,
			body: requestBody,
			headers: { 'Content-Type': 'application/json' },
			json: true,
		});

		return [
			{
				json: {
					...(response as Record<string, unknown>),
					_metadata: { endpoint: endpointName, detectedFormat, invocationUrl },
				},
				pairedItem: { item: i },
			},
		];
	} catch (apiError) {
		if ((apiError as { statusCode?: number }).statusCode === 400) {
			if (!exampleRequestBody) {
				exampleRequestBody = generateExampleFromSchema(null, detectedFormat);
			}

			const errorDetails =
				(apiError as { response?: { body?: unknown } }).response?.body ||
				(apiError as Error).message ||
				'Bad Request';
			throw new NodeOperationError(
				this.getNode(),
				`API Error: 400 Bad Request\n\nThe endpoint rejected your request. This usually means the request body format is incorrect.\n\nError details: ${JSON.stringify(errorDetails, null, 2)}\n\nDetected format: ${detectedFormat}\n\nExpected request body format:\n${exampleRequestBody}\n\nYour request body:\n${JSON.stringify(requestBody, null, 2)}`,
			);
		}
		throw apiError;
	}
}
