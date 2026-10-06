import type { NextNodeInstanceVersion } from '@n8n/api-types';
import { componentRegistry } from '@n8n/frontend-module-sdk';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { fireEvent, waitFor } from '@testing-library/vue';
import { defineComponent, h } from 'vue';

import * as api from '../next-nodes-instance.api';
import NodesSettingsView from './NodesSettingsView.vue';

const route = vi.hoisted(() => ({ query: {} as Record<string, string> }));
const deniedScopes = vi.hoisted(() => new Set<string>());

vi.mock('../next-nodes-instance.api');
vi.mock('vue-router', async (importOriginal) => {
	const { reactive: toReactive } = await import('vue');
	const reactiveRoute = toReactive(route);
	return {
		...(await importOriginal<typeof import('vue-router')>()),
		useRoute: () => reactiveRoute,
		useRouter: () => ({
			push: vi.fn(),
			replace: async ({ query }: { query: Record<string, string> }) => {
				reactiveRoute.query = query;
			},
		}),
	};
});
vi.mock('@n8n/stores/rbac.store', () => ({
	useRBACStore: () => ({
		hasScope: (scope: string | string[]) => [scope].flat().some((one) => !deniedScopes.has(one)),
	}),
}));

const renderView = createComponentRenderer(NodesSettingsView);

const version: NextNodeInstanceVersion = {
	actionId: 'acme.greet',
	semver: '1.0.0',
	node: 'acme',
	displayName: 'Acme: Greet',
	action: 'Greet',
	summary: 'Greet a name.',
	status: 'published',
	createdAt: '2026-01-01T00:00:00.000Z',
	publishedBy: { name: 'Ada Lovelace', email: 'ada@acme.com' },
	changes: [],
};

const CommunityNodesStub = defineComponent({
	setup: () => () => h('div', { 'data-test-id': 'community-nodes' }),
});

describe('NodesSettingsView', () => {
	beforeEach(() => {
		vi.mocked(api.listVersions).mockResolvedValue([version]);
		route.query = {};
		deniedScopes.clear();
		componentRegistry.register('community-nodes', CommunityNodesStub);
		useSettingsStore().settings.communityNodesEnabled = true;
	});

	afterEach(() => {
		componentRegistry.clear();
	});

	describe('tabs', () => {
		it('shows the custom actions first, and the community nodes on "Installed"', async () => {
			const { findByTestId, getByText, queryByTestId } = renderView();

			expect(await findByTestId('nodes-action-acme.greet')).toBeInTheDocument();
			expect(queryByTestId('community-nodes')).not.toBeInTheDocument();

			await fireEvent.click(getByText('Installed'));

			expect(await findByTestId('community-nodes')).toBeInTheDocument();
			expect(queryByTestId('nodes-action-acme.greet')).not.toBeInTheDocument();
			expect(route.query).toEqual({ tab: 'installed' });
		});

		it('opens "Installed" from the URL', async () => {
			route.query = { tab: 'installed' };
			const { findByTestId } = renderView();

			expect(await findByTestId('community-nodes')).toBeInTheDocument();
		});

		it.each([
			[
				'the user has no community package scopes',
				() => {
					deniedScopes.add('communityPackage:list').add('communityPackage:update');
				},
			],
			[
				'community nodes are off',
				() => {
					useSettingsStore().settings.communityNodesEnabled = false;
				},
			],
		])('shows no tabs and only the custom actions when %s', async (_, setUp) => {
			setUp();
			route.query = { tab: 'installed' };
			const { findByTestId, queryByTestId } = renderView();

			expect(await findByTestId('nodes-action-acme.greet')).toBeInTheDocument();
			expect(queryByTestId('nodes-tabs')).not.toBeInTheDocument();
			expect(queryByTestId('community-nodes')).not.toBeInTheDocument();
		});
	});

	it('names who published an action, with a link to email them', async () => {
		vi.mocked(api.listVersions).mockResolvedValue([version]);
		const { findByTestId } = renderView();

		const link = await findByTestId('nodes-published-by-acme.greet');

		await waitFor(() =>
			expect(link.closest('span')?.parentElement).toHaveTextContent('Published by Ada Lovelace'),
		);
		expect(link.closest('a')).toHaveAttribute('href', 'mailto:ada@acme.com');
	});

	it('lists what each version changed since the version before', async () => {
		vi.mocked(api.listVersions).mockResolvedValue([
			{ ...version, semver: '1.2.0', changes: [] },
			{ ...version, semver: '1.1.0', changes: ['input lang added'] },
			version,
		]);
		const { findByText, getByTestId, queryByTestId } = renderView();

		await fireEvent.click(await findByText('Versions'));

		expect(getByTestId('nodes-version-changes-1.1.0')).toHaveTextContent('input lang added');
		expect(getByTestId('nodes-version-changes-1.2.0')).toHaveTextContent('Same inputs and outputs');
		expect(queryByTestId('nodes-version-changes-1.0.0')).not.toBeInTheDocument();
	});
});
