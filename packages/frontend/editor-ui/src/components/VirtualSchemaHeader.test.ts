import { createComponentRenderer } from '@/__tests__/render';
import { mockNodeTypeDescription } from '@/__tests__/mocks';
import VirtualSchemaHeader from '@/components/VirtualSchemaHeader.vue';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { SET_NODE_TYPE } from '@/constants';
import { NodeConnectionTypes } from 'n8n-workflow';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { defaultSettings } from '@/__tests__/defaults';
import { useSettingsStore } from '@/stores/settings.store';

describe('VirtualSchemaHeader.vue', () => {
	let renderComponent: ReturnType<typeof createComponentRenderer>;

	beforeEach(() => {
		const pinia = createTestingPinia({ stubActions: false });
		setActivePinia(pinia);

		const nodeTypesStore = useNodeTypesStore();
		const settingsStore = useSettingsStore();
		settingsStore.setSettings(defaultSettings);

		nodeTypesStore.setNodeTypes([
			mockNodeTypeDescription({
				name: SET_NODE_TYPE,
				outputs: [NodeConnectionTypes.Main],
			}),
			mockNodeTypeDescription({
				name: 'n8n-nodes-base.manualTrigger',
				group: ['trigger'],
				outputs: [NodeConnectionTypes.Main],
			}),
		]);

		renderComponent = createComponentRenderer(VirtualSchemaHeader, {
			global: {
				stubs: {
					N8nIcon: true,
					N8nLink: {
						template: '<a @click="$emit(\'click\')"><slot></slot></a>',
					},
					NodeIcon: {
						template: '<div class="node-icon"></div>',
					},
					I18nT: {
						template: '<span><slot name="execute"></slot><slot name="link"></slot></span>',
					},
				},
			},
			pinia,
		});
	});

	describe('Basic rendering', () => {
		it('should render the header with title', () => {
			const { getByText } = renderComponent({
				props: {
					title: 'Test Node',
					collapsable: true,
					collapsed: false,
					itemCount: null,
				},
			});

			expect(getByText('Test Node')).toBeInTheDocument();
		});

		it('should render info text when provided', () => {
			const { getByText } = renderComponent({
				props: {
					title: 'Test Node',
					collapsable: true,
					collapsed: false,
					itemCount: null,
					info: '(Deactivated)',
				},
			});

			expect(getByText('(Deactivated)')).toBeInTheDocument();
		});

		it('should render node icon when nodeType is provided', () => {
			const nodeTypesStore = useNodeTypesStore();
			const nodeType = nodeTypesStore.getNodeType(SET_NODE_TYPE);

			const { container } = renderComponent({
				props: {
					title: 'Test Node',
					collapsable: true,
					collapsed: false,
					itemCount: null,
					nodeType,
				},
			});

			expect(container.querySelector('.node-icon')).toBeInTheDocument();
		});

		it('should render trigger icon for trigger nodes', () => {
			const nodeTypesStore = useNodeTypesStore();
			const triggerNode = nodeTypesStore.getNodeType('n8n-nodes-base.manualTrigger');

			const { getByTestId } = renderComponent({
				props: {
					title: 'Manual Trigger',
					collapsable: true,
					collapsed: false,
					itemCount: null,
					nodeType: triggerNode,
				},
			});

			const header = getByTestId('run-data-schema-header');
			expect(header).toBeInTheDocument();
			expect(header.querySelector('.trigger-icon')).toBeInTheDocument();
		});
	});

	describe('Item count display', () => {
		it('should render item count when provided and not in lastSuccessfulPreview mode', () => {
			const { getByTestId } = renderComponent({
				props: {
					title: 'Test Node',
					collapsable: true,
					collapsed: false,
					itemCount: 5,
				},
			});

			const itemCount = getByTestId('run-data-schema-node-item-count');
			expect(itemCount).toBeInTheDocument();
		});

		it('should NOT render item count when in lastSuccessfulPreview mode', () => {
			const { queryByTestId } = renderComponent({
				props: {
					title: 'Test Node',
					collapsable: true,
					collapsed: false,
					itemCount: 5,
					lastSuccessfulPreview: true,
				},
			});

			expect(queryByTestId('run-data-schema-node-item-count')).not.toBeInTheDocument();
		});

		it('should render preview text when in preview mode without lastSuccessfulPreview', () => {
			const { container } = renderComponent({
				props: {
					title: 'Test Node',
					collapsable: true,
					collapsed: false,
					itemCount: null,
					preview: true,
				},
			});

			expect(container.querySelector('.extra-info')).toBeInTheDocument();
		});
	});

	describe('Collapse/expand functionality', () => {
		it('should emit click:toggle when toggle button is clicked', async () => {
			const { emitted, container } = renderComponent({
				props: {
					title: 'Test Node',
					collapsable: true,
					collapsed: false,
					itemCount: null,
				},
			});

			const toggle = container.querySelector('.toggle');
			expect(toggle).toBeInTheDocument();
			await userEvent.click(toggle!);

			expect(emitted('click:toggle')).toBeTruthy();
			expect(emitted('click:toggle')).toHaveLength(1);
		});

		it('should apply collapsed class when collapsed prop is true', () => {
			const { container } = renderComponent({
				props: {
					title: 'Test Node',
					collapsable: true,
					collapsed: true,
					itemCount: null,
				},
			});

			expect(container.querySelector('.collapsed')).toBeInTheDocument();
		});

		it('should not render notice when collapsed', () => {
			const { queryByTestId } = renderComponent({
				props: {
					title: 'Test Node',
					collapsable: true,
					collapsed: true,
					itemCount: null,
					preview: true,
				},
			});

			expect(queryByTestId('schema-preview-warning')).not.toBeInTheDocument();
		});

		it('should render notice when not collapsed and in preview mode', () => {
			const { getByTestId } = renderComponent({
				props: {
					title: 'Test Node',
					collapsable: true,
					collapsed: false,
					itemCount: null,
					preview: true,
				},
			});

			expect(getByTestId('schema-preview-warning')).toBeInTheDocument();
		});
	});

	describe('Execute event emission', () => {
		it('should emit execute event with node name when execute link is clicked in preview mode', async () => {
			const { emitted, container } = renderComponent({
				props: {
					title: 'Test Node',
					collapsable: true,
					collapsed: false,
					itemCount: null,
					preview: true,
				},
			});

			const executeLink = container.querySelector('a');
			expect(executeLink).toBeInTheDocument();

			await userEvent.click(executeLink!);

			await waitFor(() => {
				expect(emitted('execute')).toBeTruthy();
				expect(emitted('execute')?.[0]).toEqual(['Test Node']);
			});
		});

		it('should emit execute event with node name when execute link is clicked in lastSuccessfulPreview mode', async () => {
			const { emitted, container } = renderComponent({
				props: {
					title: 'Test Node',
					collapsable: true,
					collapsed: false,
					itemCount: null,
					preview: true,
					lastSuccessfulPreview: true,
				},
			});

			const executeLink = container.querySelector('a');
			expect(executeLink).toBeInTheDocument();

			await userEvent.click(executeLink!);

			await waitFor(() => {
				expect(emitted('execute')).toBeTruthy();
				expect(emitted('execute')?.[0]).toEqual(['Test Node']);
			});
		});
	});

	describe('Preview modes', () => {
		it('should render different notice content for lastSuccessfulPreview', () => {
			const { container } = renderComponent({
				props: {
					title: 'Test Node',
					collapsable: true,
					collapsed: false,
					itemCount: null,
					preview: true,
					lastSuccessfulPreview: true,
				},
			});

			const notice = container.querySelector('.notice');
			expect(notice).toBeInTheDocument();
		});

		it('should render standard preview notice when not in lastSuccessfulPreview mode', () => {
			const { container } = renderComponent({
				props: {
					title: 'Test Node',
					collapsable: true,
					collapsed: false,
					itemCount: null,
					preview: true,
					lastSuccessfulPreview: false,
				},
			});

			const notice = container.querySelector('.notice');
			expect(notice).toBeInTheDocument();
		});
	});

	describe('CSS class binding', () => {
		it('should apply icon-trigger class to trigger node icons', () => {
			const nodeTypesStore = useNodeTypesStore();
			const triggerNode = nodeTypesStore.getNodeType('n8n-nodes-base.manualTrigger');

			const { container } = renderComponent({
				props: {
					title: 'Manual Trigger',
					collapsable: true,
					collapsed: false,
					itemCount: null,
					nodeType: triggerNode,
				},
			});

			const icon = container.querySelector('.icon');
			expect(icon).toHaveClass('icon-trigger');
		});

		it('should not apply icon-trigger class to non-trigger nodes', () => {
			const nodeTypesStore = useNodeTypesStore();
			const regularNode = nodeTypesStore.getNodeType(SET_NODE_TYPE);

			const { container } = renderComponent({
				props: {
					title: 'Set Node',
					collapsable: true,
					collapsed: false,
					itemCount: null,
					nodeType: regularNode,
				},
			});

			const icon = container.querySelector('.icon');
			expect(icon).not.toHaveClass('icon-trigger');
		});
	});
});
