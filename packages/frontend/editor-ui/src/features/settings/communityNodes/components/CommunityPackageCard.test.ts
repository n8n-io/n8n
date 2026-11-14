import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { STORES } from '@n8n/stores';
import CommunityPackageCard from './CommunityPackageCard.vue';
import { createComponentRenderer } from '@/__tests__/render';
import type { PublicInstalledNode, PublicInstalledPackage } from 'n8n-workflow';
import { useTypeAvailabilityPoliciesStore } from '@n8n/frontend-module-type-availability-policies';
import type { NodeTypeAvailability } from '@n8n/api-types';
import { waitFor } from '@testing-library/vue';

const communityPackage: PublicInstalledPackage = {
	packageName: 'n8n-nodes-test',
	installedVersion: '1.0.0',
	installedNodes: [
		{ name: 'OldNode', type: 'n8n-nodes-test.oldNode' } as PublicInstalledNode,
		{ name: 'TestNode', type: 'n8n-nodes-test.testNode' } as PublicInstalledNode,
		{ name: 'OtherNode', type: 'n8n-nodes-test.otherNode' } as PublicInstalledNode,
	],
	createdAt: new Date(0),
	updatedAt: new Date(0),
};

const renderComponent = createComponentRenderer(CommunityPackageCard, {
	global: {
		stubs: {
			N8nActionToggle: {
				props: ['actions'],
				template:
					'<div data-test-id="action-toggle-stub">' +
					'<span v-for="action in actions" :key="action.value" :data-action-value="action.value">{{ action.label }}</span>' +
					'</div>',
			},
		},
	},
});

const flushPromises = async () => await new Promise(setImmediate);

const setupPinia = (settings: Record<string, unknown> = {}) => {
	const pinia = createTestingPinia({
		initialState: {
			[STORES.SETTINGS]: { settings },
		},
	});
	setActivePinia(pinia);
};

describe('CommunityPackageCard', () => {
	let nodeTypesStore: ReturnType<typeof useNodeTypesStore>;

	beforeEach(() => {
		setupPinia({ communityNodesEnabled: true });
		nodeTypesStore = useNodeTypesStore();
	});

	it('skips stale node types when loading the verified package version', async () => {
		nodeTypesStore.getCommunityNodeAttributes = vi
			.fn()
			.mockImplementation(async (nodeType) =>
				nodeType === 'n8n-nodes-test.testNode' ? { npmVersion: '2.0.0' } : null,
			);

		const { getByText } = renderComponent({
			props: {
				communityPackage,
			},
		});

		await flushPromises();

		expect(nodeTypesStore.getCommunityNodeAttributes).toHaveBeenNthCalledWith(
			1,
			'n8n-nodes-test.oldNode',
		);
		expect(nodeTypesStore.getCommunityNodeAttributes).toHaveBeenNthCalledWith(
			2,
			'n8n-nodes-test.testNode',
		);
		expect(nodeTypesStore.getCommunityNodeAttributes).toHaveBeenCalledTimes(2);
		expect(getByText('Update')).toBeInTheDocument();
	});

	it('does not load verified package data without an installed node type', async () => {
		nodeTypesStore.getCommunityNodeAttributes = vi.fn();

		renderComponent({
			props: {
				communityPackage: { ...communityPackage, installedNodes: [] },
			},
		});

		await flushPromises();

		expect(nodeTypesStore.getCommunityNodeAttributes).not.toHaveBeenCalled();
	});

	describe('failed to load tooltip', () => {
		const tooltipStub = {
			N8nTooltip: { template: '<div><slot /><slot name="content" /></div>' },
		};

		it('shows the load error when n8n knows the reason', () => {
			const { getByText, queryByText } = renderComponent({
				props: {
					communityPackage: {
						...communityPackage,
						failedLoading: true,
						failedLoadingReason: 'Credential type "awsAssumeRole" already exists.',
					},
				},
				global: { stubs: tooltipStub },
			});

			expect(
				getByText('This package failed to load. Credential type "awsAssumeRole" already exists.'),
			).toBeInTheDocument();
			expect(queryByText(/may be corrupted/)).not.toBeInTheDocument();
		});

		it('falls back to the generic message without a reason', () => {
			const { getByText } = renderComponent({
				props: { communityPackage: { ...communityPackage, failedLoading: true } },
				global: { stubs: tooltipStub },
			});

			expect(getByText(/may be corrupted/)).toBeInTheDocument();
		});
	});

	describe('uninstall action visibility', () => {
		it('shows the uninstall action when packages are not managed by env', () => {
			setupPinia({ communityNodesManagedByEnv: false });

			const { getByText } = renderComponent({
				props: { communityPackage },
			});

			expect(getByText('Uninstall package')).toBeInTheDocument();
		});

		it('hides the uninstall action when packages are managed by env', () => {
			setupPinia({ communityNodesManagedByEnv: true });

			const { queryByText } = renderComponent({
				props: { communityPackage },
			});

			expect(queryByText('Uninstall package')).not.toBeInTheDocument();
		});
	});

	describe('restricted badge', () => {
		const mockNodeAvailability = (
			unavailable: Record<string, Pick<NodeTypeAvailability, 'scope' | 'optInAvailable'>>,
		) => {
			vi.spyOn(useTypeAvailabilityPoliciesStore(), 'getNodeTypeAvailability').mockImplementation(
				(name: string) =>
					name in unavailable
						? { name, available: false, ...unavailable[name] }
						: { name, available: true },
			);
		};

		// Reka UI only mounts tooltip content once the trigger is hovered.
		function hoverTrigger(element: Element) {
			element.dispatchEvent(
				new PointerEvent('pointermove', {
					bubbles: true,
					cancelable: true,
					pointerType: 'mouse',
					clientX: 100,
					clientY: 100,
				}),
			);
		}

		it('shows the badge and lists instance-blocked node types in the tooltip', async () => {
			mockNodeAvailability({ 'n8n-nodes-test.oldNode': { scope: 'instance' } });

			const { getByText } = renderComponent({ props: { communityPackage } });

			const badge = getByText('Restricted');
			expect(badge).toBeInTheDocument();

			hoverTrigger(badge);

			await waitFor(() => {
				expect(document.querySelector('[data-dismissable-layer]')).toHaveTextContent('OldNode');
			});
			expect(document.querySelector('[data-dismissable-layer]')).not.toHaveTextContent('TestNode');
		});

		it('does not show the badge when no node type is blocked', () => {
			mockNodeAvailability({});

			const { queryByText } = renderComponent({ props: { communityPackage } });

			expect(queryByText('Restricted')).not.toBeInTheDocument();
		});

		it('ignores a project-scoped restriction', () => {
			mockNodeAvailability({ 'n8n-nodes-test.oldNode': { scope: 'project' } });

			const { queryByText } = renderComponent({ props: { communityPackage } });

			expect(queryByText('Restricted')).not.toBeInTheDocument();
		});

		it('ignores an instance restriction that projects can opt into', () => {
			mockNodeAvailability({
				'n8n-nodes-test.oldNode': { scope: 'instance', optInAvailable: true },
			});

			const { queryByText } = renderComponent({ props: { communityPackage } });

			expect(queryByText('Restricted')).not.toBeInTheDocument();
		});
	});
});
