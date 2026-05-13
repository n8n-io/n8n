import type { JSONSchema7 } from 'json-schema';
import type { ILoadOptionsFunctions, ResourceMapperFields } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { convertJsonSchemaToResourceMapperFields } from '../shared/utils';

export async function getToolParameters(
	this: ILoadOptionsFunctions,
): Promise<ResourceMapperFields> {
	if (!this.getGatewayTools) {
		throw new NodeOperationError(this.getNode(), 'Gateway tools not available');
	}

	const toolId = this.getNodeParameter('tool', 0, { extractValue: true }) as string;
	const credentials = await this.getCredentials('deviceConnectionApi');
	const deviceOwnerId = (credentials.deviceOwnerId as string) || undefined;

	const { tools } = await this.getGatewayTools.call(this, deviceOwnerId);
	const tool = tools.find((t) => t.name === toolId);

	if (!tool) {
		throw new NodeOperationError(this.getNode(), `Tool "${toolId}" not found on device`);
	}

	const fields = convertJsonSchemaToResourceMapperFields(tool.inputSchema as JSONSchema7);
	return { fields };
}
