import type { InstanceTypeAccessResponse } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { CommunityNodeTypesService } from '@/modules/community-packages/community-node-types.service';
import type { StrapiCommunityNodeType } from '@/modules/community-packages/community-node-types-utils';
import { CommunityPackagesConfig } from '@/modules/community-packages/community-packages.config';

import { UninstalledCommunityNodes, withUninstalledCommunityTypes } from '../community-node-types';

const BROWSERLESS = 'n8n-nodes-browserless.browserless';
const TAVILY = 'n8n-nodes-tavily.tavily';

function catalogEntry(name: string, displayName: string): StrapiCommunityNodeType {
	return mock<StrapiCommunityNodeType>({
		name,
		displayName,
		nodeDescription: {
			// The catalog describes an uninstalled node under a `-preview` package.
			name: name.replace('n8n-nodes-', 'n8n-nodes-preview-'),
			displayName,
			icon: 'file:icon.svg',
			iconUrl: 'https://cdn.example.com/icon.svg',
			iconColor: undefined,
		},
	});
}

describe('UninstalledCommunityNodes', () => {
	const logger = mock<Logger>();
	const getCachedCommunityNodeTypes = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		getCachedCommunityNodeTypes.mockReturnValue([
			catalogEntry(BROWSERLESS, 'Browserless'),
			catalogEntry(TAVILY, 'Tavily'),
		]);
		Container.set(
			CommunityPackagesConfig,
			mock<CommunityPackagesConfig>({ enabled: true, verifiedEnabled: true }),
		);
		Container.set(
			CommunityNodeTypesService,
			mock<CommunityNodeTypesService>({ getCachedCommunityNodeTypes }),
		);
	});

	it('lists the catalog nodes that are not installed, under the name they get on install', async () => {
		const nodes = await new UninstalledCommunityNodes(logger).list(new Set([TAVILY]));

		expect(nodes).toEqual([
			{
				name: BROWSERLESS,
				displayName: 'Browserless',
				icon: 'file:icon.svg',
				iconUrl: 'https://cdn.example.com/icon.svg',
				iconColor: undefined,
			},
		]);
	});

	it.each([
		{ enabled: false, verifiedEnabled: true },
		{ enabled: true, verifiedEnabled: false },
	])(
		'lists no node and does not read the catalog when the config is $enabled / $verifiedEnabled',
		async (config) => {
			Container.set(CommunityPackagesConfig, mock<CommunityPackagesConfig>(config));

			const nodes = await new UninstalledCommunityNodes(logger).list(new Set());

			expect(nodes).toEqual([]);
			expect(getCachedCommunityNodeTypes).not.toHaveBeenCalled();
		},
	);

	it('lists no node when the catalog cannot be read', async () => {
		getCachedCommunityNodeTypes.mockImplementation(() => {
			throw new Error('catalog failed');
		});

		const nodes = await new UninstalledCommunityNodes(logger).list(new Set());

		expect(nodes).toEqual([]);
		expect(logger.warn).toHaveBeenCalled();
	});
});

describe('withUninstalledCommunityTypes', () => {
	const access: InstanceTypeAccessResponse = {
		scopeId: 'scope-1',
		version: 3,
		defaultAction: 'allow',
		types: [
			{ name: 'n8n-nodes-base.slack', access: 'allow', matchedRuleId: null },
			{ name: 'n8n-nodes-mcp.mcpClient', access: 'allow', matchedRuleId: null },
			{ name: BROWSERLESS, access: 'deny', matchedRuleId: 'rule-1' },
		],
	};

	it('moves the catalog rows out of the installed types', () => {
		const result = withUninstalledCommunityTypes(access, [
			{ name: BROWSERLESS, displayName: 'Browserless', icon: 'file:icon.svg' },
		]);

		expect(result).toEqual({
			scopeId: 'scope-1',
			version: 3,
			defaultAction: 'allow',
			types: [
				{ name: 'n8n-nodes-base.slack', access: 'allow', matchedRuleId: null },
				{ name: 'n8n-nodes-mcp.mcpClient', access: 'allow', matchedRuleId: null },
			],
			uninstalledCommunityTypes: [
				{
					name: BROWSERLESS,
					access: 'deny',
					matchedRuleId: 'rule-1',
					displayName: 'Browserless',
					icon: 'file:icon.svg',
				},
			],
		});
	});

	it('leaves out a catalog node that the page does not list', () => {
		const result = withUninstalledCommunityTypes({ ...access, types: [] }, [
			{ name: BROWSERLESS, displayName: 'Browserless' },
		]);

		expect(result.uninstalledCommunityTypes).toEqual([]);
	});
});
