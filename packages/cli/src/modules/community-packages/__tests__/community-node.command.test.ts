import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';

import { executeNpmCommand, getNpmOverrides } from '../npm-utils';

jest.mock('../npm-utils', () => ({
	...jest.requireActual('../npm-utils'),
	executeNpmCommand: jest.fn(),
}));

jest.mock('@n8n/di', () => ({
	Container: { get: jest.fn() },
	Service: () => jest.fn(),
}));

jest.mock('@n8n/db', () => ({}));
jest.mock('@n8n/decorators', () => ({ Command: () => () => {} }));
jest.mock('n8n-core', () => ({ InstanceSettings: jest.fn() }));
jest.mock('zod', () => ({
	z: new Proxy(
		{},
		{
			get: () => {
				const chainable: unknown = new Proxy(() => chainable, {
					get: () => chainable,
					apply: () => chainable,
				});
				return chainable;
			},
		},
	),
}));
jest.mock('@/commands/base-command', () => ({ BaseCommand: class {} }));
jest.mock('@/credentials/credentials.service', () => ({}));
jest.mock('../community-packages.service', () => ({}));
jest.mock('../installed-nodes.entity', () => ({}));
jest.mock('../installed-nodes.repository', () => ({}));
jest.mock('../installed-packages.entity', () => ({}));
jest.mock('../installed-packages.repository', () => ({}));

describe('CommunityNode.pruneDependencies', () => {
	const nodesDownloadDir = '/home/node/.n8n/nodes';
	const mockInstanceSettings = mock<InstanceSettings>({ nodesDownloadDir });

	beforeEach(() => {
		jest.clearAllMocks();
		const { Container } = jest.requireMock('@n8n/di');
		(Container.get as jest.Mock).mockReturnValue(mockInstanceSettings);
		(executeNpmCommand as jest.Mock).mockResolvedValue('Done');
	});

	test('should pass npm overrides to executeNpmCommand', async () => {
		const { CommunityNode } = await import('../community-node.command');
		const command = Object.create(CommunityNode.prototype) as InstanceType<typeof CommunityNode>;

		await command.pruneDependencies();

		const expectedOverrides = getNpmOverrides(nodesDownloadDir);
		expect(executeNpmCommand).toHaveBeenCalledWith(['prune', ...expectedOverrides.cacheArgs], {
			cwd: nodesDownloadDir,
			env: expectedOverrides.env,
		});
	});
});
