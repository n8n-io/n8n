import type {
	ICredentialDataDecryptedObject,
	ICredentialType,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';

export class SegmentApi implements ICredentialType {
	name = 'segmentApi';

	displayName = 'Segment API';

	documentationUrl = 'segment';

	properties: INodeProperties[] = [
		{
			displayName: 'Write Key',
			name: 'writekey',
			type: 'string',
			default: '',
		},
	];

	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		const base64Key = Buffer.from(`${credentials.writekey}:`).toString('base64');
		requestOptions.headers!.Authorization = `Basic ${base64Key}`;
		return requestOptions;
	}
}
