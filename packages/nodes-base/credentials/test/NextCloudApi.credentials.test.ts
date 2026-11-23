import { Expression, type IWorkflowDataProxyData } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { NextCloudApi } from '../NextCloudApi.credentials';

describe('NextCloudApi credential test', () => {
	const credential = new NextCloudApi();
	const expression = new Expression('UTC');

	it.each([
		['https://nc.example.com/remote.php/webdav', 'https://nc.example.com'],
		['https://nc.example.com/remote.php/webdav/', 'https://nc.example.com'],
		['https://nc.example.com/remote.php/webdav//', 'https://nc.example.com'],
		['https://nc.example.com/nextcloud/remote.php/webdav', 'https://nc.example.com/nextcloud'],
		['https://nc.example.com/remote.php/dav/files/alice', 'https://nc.example.com'],
		[
			'https://nc.example.com/nextcloud/remote.php/dav/files/alice@example.com/',
			'https://nc.example.com/nextcloud',
		],
	])('tests %s on the user endpoint of %s', async (webDavUrl, root) => {
		await expression.withIsolate(async () => {
			const baseURL = expression.resolveSimpleParameterValue(
				credential.test.request.baseURL,
				mock<IWorkflowDataProxyData>({ $credentials: { webDavUrl } }),
			);

			expect(`${baseURL}${credential.test.request.url}`).toBe(`${root}/ocs/v1.php/cloud/user`);
		});
	});
});
