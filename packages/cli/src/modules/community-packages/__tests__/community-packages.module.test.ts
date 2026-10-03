import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { CommunityPackagesConfig } from '../community-packages.config';
import { CommunityPackagesModule } from '../community-packages.module';

describe('CommunityPackagesModule.nodeLoaders', () => {
	const dirs = { root: '' };

	beforeEach(() => {
		dirs.root = mkdtempSync(path.join(tmpdir(), 'n8n-community-packages-'));
		const dir = path.join(dirs.root, 'node_modules', 'n8n-nodes-acme');
		mkdirSync(dir, { recursive: true });
		writeFileSync(
			path.join(dir, 'package.json'),
			JSON.stringify({ name: 'n8n-nodes-acme', version: '1.0.0' }),
		);
		mockInstance(InstanceSettings, { nodesDownloadDir: dirs.root });
		mockInstance(CommunityPackagesConfig, { preventLoading: false });
	});

	afterEach(() => {
		rmSync(dirs.root, { recursive: true, force: true });
		Container.reset();
	});

	it('loads no community package when N8N_NODE_PERMISSIONS_DENY has full-community', async () => {
		const logger = mockInstance(Logger);
		Container.get(GlobalConfig).nodes.permissionsDeny = ['full-community'];

		await expect(Container.get(CommunityPackagesModule).nodeLoaders()).resolves.toEqual([]);
		expect(logger.warn).toHaveBeenCalledWith(
			'Community package n8n-nodes-acme does not load: N8N_NODE_PERMISSIONS_DENY denies its permission class "full-community"',
		);
	});

	it('loads the community packages when N8N_NODE_PERMISSIONS_DENY has other classes', async () => {
		mockInstance(Logger);
		Container.get(GlobalConfig).nodes.permissionsDeny = ['egress-input', 'code'];

		const loaders = await Container.get(CommunityPackagesModule).nodeLoaders();

		expect(loaders.map(({ packageName }) => packageName)).toEqual(['n8n-nodes-acme']);
	});
});
