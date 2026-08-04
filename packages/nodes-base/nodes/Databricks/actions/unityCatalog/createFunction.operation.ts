import { jsonParse, type IExecuteFunctions, type INodeExecutionData } from 'n8n-workflow';

import { extractResourceLocatorValue, getActiveCredentialType, getHost } from '../helpers';

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const credentialType = getActiveCredentialType(this, i);
	const host = await getHost(this, credentialType);
	const catalogName = extractResourceLocatorValue(this.getNodeParameter('catalogName', i));
	const schemaName = extractResourceLocatorValue(this.getNodeParameter('schemaName', i));
	const functionName = this.getNodeParameter('functionName', i) as string;
	const inputParams = this.getNodeParameter('inputParams', i) as unknown;
	const returnType = this.getNodeParameter('returnType', i) as string;
	const routineBody = this.getNodeParameter('routineBody', i) as string;
	const routineDefinition = this.getNodeParameter('routineDefinition', i) as string;

	const p = typeof inputParams === 'string' ? jsonParse(inputParams) : inputParams;
	const params = Array.isArray(p) ? p : ((p as { parameters?: unknown[] })?.parameters ?? []);
	const normalizedParams = (params as Array<Record<string, unknown>>).map((param) => ({
		...param,
		type_text: param.type_text ?? param.type_name,
		type_json: param.type_json ?? JSON.stringify({ name: param.type_name }),
	}));

	const response = await this.helpers.httpRequestWithAuthentication.call(this, credentialType, {
		method: 'POST',
		url: `${host}/api/2.1/unity-catalog/functions`,
		body: {
			function_info: {
				name: functionName,
				catalog_name: catalogName,
				schema_name: schemaName,
				input_params: { parameters: normalizedParams },
				data_type: returnType,
				full_data_type: returnType,
				specific_name: functionName,
				parameter_style: 'S',
				security_type: 'DEFINER',
				sql_data_access: 'CONTAINS_SQL',
				is_deterministic: false,
				is_null_call: true,
				routine_body: routineBody,
				routine_definition: routineDefinition,
			},
		},
		headers: { 'Content-Type': 'application/json' },
		json: true,
	});

	return [{ json: response, pairedItem: { item: i } }];
}
