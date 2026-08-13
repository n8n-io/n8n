import { NodeOperationError } from 'n8n-workflow';
import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import { extractResourceLocatorValue, getActiveCredentialType, getHost } from '../helpers';

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const credentialType = getActiveCredentialType(this, i);
	const host = await getHost(this, credentialType);
	const catalogName = extractResourceLocatorValue(this.getNodeParameter('catalogName', i));
	const schemaName = extractResourceLocatorValue(this.getNodeParameter('schemaName', i));
	const volumeName = this.getNodeParameter('volumeName', i) as string;
	const volumeType = this.getNodeParameter('volumeType', i) as string;
	const additionalFields = this.getNodeParameter('additionalFields', i, {}) as {
		comment?: string;
		storage_location?: string;
	};

	const body: Record<string, unknown> = {
		catalog_name: catalogName,
		schema_name: schemaName,
		name: volumeName,
		volume_type: volumeType,
	};

	if (volumeType === 'EXTERNAL' && !additionalFields.storage_location) {
		throw new NodeOperationError(
			this.getNode(),
			'Storage Location is required for EXTERNAL volumes',
			{ itemIndex: i },
		);
	}
	if (additionalFields.comment) body.comment = additionalFields.comment;
	if (additionalFields.storage_location) body.storage_location = additionalFields.storage_location;

	const response = await this.helpers.httpRequestWithAuthentication.call(this, credentialType, {
		method: 'POST',
		url: `${host}/api/2.1/unity-catalog/volumes`,
		body,
		headers: { 'Content-Type': 'application/json' },
		json: true,
	});

	return [{ json: response, pairedItem: { item: i } }];
}
