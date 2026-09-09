import type { IHttpRequestOptions } from 'n8n-workflow';

import { HeaderConstants } from '../../nodes/Microsoft/Storage/GenericFunctions';
import { AzureStorageSharedKeyApi } from '../AzureStorageSharedKeyApi.credentials';

describe('AzureStorageSharedKeyApi Credential', () => {
	const credential = new AzureStorageSharedKeyApi();
	const property = (name: string) => credential.properties.find((p) => p.name === name);
	const credentials = {
		account: 'myaccount',
		key: 'Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==',
	};
	const listBlobsRequest = (baseURL: string): IHttpRequestOptions => ({
		method: 'GET',
		baseURL,
		url: '/mycontainer',
		qs: { restype: 'container', comp: 'list' },
		headers: { 'x-ms-date': 'Wed, 01 Jan 2025 00:00:00 GMT', 'x-ms-version': '2021-12-02' },
	});

	it('should expose the base URL as an editable field that defaults to the public cloud endpoint', () => {
		const baseUrl = property('baseUrl');

		expect(baseUrl?.type).toBe('string');
		expect(baseUrl?.default).toBe('=https://{{ $self["account"] }}.blob.core.windows.net');
	});

	it('should test the credential against the configured base URL', () => {
		expect(credential.test.request.baseURL).toBe('={{$credentials.baseUrl}}');
	});

	it('should sign with the account name and path, independent of the host', async () => {
		const publicCloud = await credential.authenticate(
			credentials,
			listBlobsRequest('https://myaccount.blob.core.windows.net'),
		);
		const sovereignCloud = await credential.authenticate(
			credentials,
			listBlobsRequest('https://myaccount.blob.core.chinacloudapi.cn'),
		);

		expect(publicCloud.headers?.[HeaderConstants.AUTHORIZATION]).toBe(
			'SharedKey myaccount:LTfRKI8awvSOEoMJ6moAHQKF9Rt38hRdut6PsXHhnUI=',
		);
		expect(sovereignCloud.headers?.[HeaderConstants.AUTHORIZATION]).toBe(
			publicCloud.headers?.[HeaderConstants.AUTHORIZATION],
		);
	});
});
