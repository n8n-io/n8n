import { ref, shallowRef } from 'vue';
import { screen, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createTestingPinia } from '@pinia/testing';
import CanvasNodeToolbar from './CanvasNodeToolbar.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { getTooltip, hoverTooltipTrigger, mockedStore } from '@/__tests__/utils';
import {
	createCanvasNodeProvide,
	createCanvasProvide,
} from '@/features/workflows/canvas/__tests__/utils';
import { CanvasNodeRenderType } from '../../../canvas.types';
import { createPinia, setActivePinia, type Pinia } from 'pinia';
import { EditorEnabledFeaturesKey, WorkflowDocumentStoreKey } from '@/app/constants/injectionKeys';
import { useFocusedNodesStore } from '@/features/ai/assistant/focusedNodes.store';
import { useSettingsStore } from '@n8n/stores/settings.store';

vi.mock('@/features/workflows/canvas/canvas.utils', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@/features/workflows/canvas/canvas.utils')>();
	return {
		...actual,
		injectCanvasRenderData: vi.fn(() => ({ value: actual.createEmptyCanvasRenderData() })),
	};
});

const renderComponent = createComponentRenderer(CanvasNodeToolbar);

describe('CanvasNodeToolbar', () => {
	let pinia: Pinia;

	beforeEach(() => {
		pinia = createPinia();
		setActivePinia(pinia);
	});

	it('should render execute node button when renderType is not configuration', async () => {
		const { getByTestId } = renderComponent({
			pinia,
			global: {
				provide: {
					...createCanvasNodeProvide(),
					...createCanvasProvide(),
				},
			},
		});

		expect(getByTestId('execute-node-button')).toBeInTheDocument();
	});

	it('should render disabled execute node button when canvas is executing', () => {
		const { getByTestId } = renderComponent({
			pinia,
			global: {
				provide: {
					...createCanvasNodeProvide(),
					...createCanvasProvide({
						isExecuting: true,
					}),
				},
			},
		});

		expect(getByTestId('execute-node-button')).toBeDisabled();
	});

	it('should render disabled execute node button when node is deactivated', async () => {
		const { getByTestId } = renderComponent({
			pinia,
			global: {
				provide: {
					...createCanvasNodeProvide({
						data: {
							disabled: true,
						},
					}),
					...createCanvasProvide(),
				},
			},
		});

		const button = getByTestId('execute-node-button');
		expect(button).toBeDisabled();

		// Verify tooltip shows deactivated message on hover
		await hoverTooltipTrigger(button);
		await waitFor(() => expect(getTooltip()).toHaveTextContent('deactivated'));
	});

	it('should not render execute node button when renderType is configuration', async () => {
		const { queryByTestId } = renderComponent({
			global: {
				provide: {
					...createCanvasNodeProvide({
						data: {
							render: {
								type: CanvasNodeRenderType.Default,
								options: { configuration: true },
							},
						},
					}),
					...createCanvasProvide(),
				},
			},
		});

		expect(queryByTestId('execute-node-button')).not.toBeInTheDocument();
	});

	it('should render execute and disable node buttons for the agent render type', () => {
		const { getByTestId } = renderComponent({
			global: {
				provide: {
					...createCanvasNodeProvide({
						data: {
							render: {
								type: CanvasNodeRenderType.Agent,
								options: { agentId: { __rl: true, mode: 'list', value: 'agent-1' } },
							},
						},
					}),
					...createCanvasProvide(),
				},
			},
		});

		expect(getByTestId('execute-node-button')).toBeInTheDocument();
		expect(getByTestId('disable-node-button')).toBeInTheDocument();
	});

	it('should emit "run" when execute node button is clicked', async () => {
		const { getByTestId, emitted } = renderComponent({
			global: {
				provide: {
					...createCanvasNodeProvide(),
					...createCanvasProvide(),
				},
			},
		});

		await userEvent.click(getByTestId('execute-node-button'));

		expect(emitted('run')[0]).toEqual([]);
	});

	it('should emit "toggle" when disable node button is clicked', async () => {
		const { getByTestId, emitted } = renderComponent({
			pinia,
			global: {
				provide: {
					...createCanvasNodeProvide(),
					...createCanvasProvide(),
				},
			},
		});

		await userEvent.click(getByTestId('disable-node-button'));

		expect(emitted('toggle')[0]).toEqual([]);
	});

	it('should emit "delete" when delete node button is clicked', async () => {
		const { getByTestId, emitted } = renderComponent({
			pinia,
			global: {
				provide: {
					...createCanvasNodeProvide(),
					...createCanvasProvide(),
				},
			},
		});

		await userEvent.click(getByTestId('delete-node-button'));

		expect(emitted('delete')[0]).toEqual([]);
	});

	it('should emit "open:contextmenu" when overflow node button is clicked', async () => {
		const { getByTestId, emitted } = renderComponent({
			pinia,
			global: {
				provide: {
					...createCanvasNodeProvide(),
					...createCanvasProvide(),
				},
			},
		});

		await userEvent.click(getByTestId('overflow-node-button'));

		expect(emitted('open:contextmenu')[0]).toEqual([expect.any(MouseEvent)]);
	});

	it('should emit "update" when sticky note color is changed', async () => {
		const { getByTestId, emitted } = renderComponent({
			pinia,
			global: {
				provide: {
					...createCanvasNodeProvide({
						data: {
							render: {
								type: CanvasNodeRenderType.StickyNote,
								options: { color: 3 },
							},
						},
					}),
					...createCanvasProvide(),
				},
			},
		});

		await userEvent.click(getByTestId('change-sticky-color'));

		// Use screen queries for teleported popover content
		await waitFor(() => {
			expect(screen.getAllByTestId('color')).toHaveLength(7);
		});

		await userEvent.click(screen.getAllByTestId('color')[0]);

		expect(emitted('update')[0]).toEqual([{ color: 1 }]);
	});

	it('should show execute button when readOnly is true and canExecute is true', () => {
		const { getByTestId } = renderComponent({
			pinia,
			props: {
				readOnly: true,
				canExecute: true,
				showStatusIcons: false,
				itemsClass: '',
			},
			global: {
				provide: {
					...createCanvasNodeProvide(),
					...createCanvasProvide(),
				},
			},
		});

		expect(getByTestId('execute-node-button')).toBeInTheDocument();
	});

	it('should hide execute button when readOnly is true and canExecute is false', () => {
		const { queryByTestId } = renderComponent({
			pinia,
			props: {
				readOnly: true,
				canExecute: false,
				showStatusIcons: false,
				itemsClass: '',
			},
			global: {
				provide: {
					...createCanvasNodeProvide(),
					...createCanvasProvide(),
				},
			},
		});

		expect(queryByTestId('execute-node-button')).not.toBeInTheDocument();
	});

	it('should hide delete and disable buttons when readOnly is true regardless of canExecute', () => {
		const { queryByTestId } = renderComponent({
			pinia,
			props: {
				readOnly: true,
				canExecute: true,
				showStatusIcons: false,
				itemsClass: '',
			},
			global: {
				provide: {
					...createCanvasNodeProvide(),
					...createCanvasProvide(),
				},
			},
		});

		expect(queryByTestId('delete-node-button')).not.toBeInTheDocument();
		expect(queryByTestId('disable-node-button')).not.toBeInTheDocument();
	});

	it('should have "forceVisible" class when hovered', async () => {
		const { getByTestId } = renderComponent({
			pinia,
			global: {
				provide: {
					...createCanvasNodeProvide(),
					...createCanvasProvide(),
				},
			},
		});

		const toolbar = getByTestId('canvas-node-toolbar');

		await userEvent.hover(toolbar);

		expect(toolbar).toHaveClass('forceVisible');
	});

	describe('when the workflow uses a credential the user cannot use', () => {
		const renderWithCredentials = (currentUserCanUse: boolean, sharingEnabled = true) => {
			const testingPinia = createTestingPinia({ stubActions: false });
			setActivePinia(testingPinia);
			useSettingsStore().settings.granularCredentialSharing = sharingEnabled;

			const documentStore = {
				usedCredentials: {
					'cred-1': {
						id: 'cred-1',
						name: "Alice's Gmail",
						credentialType: 'gmailOAuth2',
						currentUserCanUse,
						homeProject: { id: 'p1', name: 'Alice Chen <alice@n8n.io>', type: 'personal' },
					},
				},
				allNodes: [
					{ name: 'Gmail', credentials: { gmailOAuth2: { id: 'cred-1', name: "Alice's Gmail" } } },
				],
				getNodeByName: () => undefined,
			};

			return renderComponent({
				pinia: testingPinia,
				global: {
					provide: {
						[WorkflowDocumentStoreKey as symbol]: shallowRef(documentStore),
						...createCanvasNodeProvide(),
						...createCanvasProvide(),
					},
				},
			});
		};

		it('should disable the execute node button', () => {
			const { getByTestId } = renderWithCredentials(false);

			expect(getByTestId('execute-node-button')).toBeDisabled();
		});

		it('should show the reason in the execute node tooltip', async () => {
			const { getByTestId } = renderWithCredentials(false);

			await hoverTooltipTrigger(getByTestId('execute-node-button'));

			await waitFor(() => expect(getTooltip()).toHaveTextContent(/Alice's Gmail/));
			expect(getTooltip()).not.toHaveTextContent('Execute step');
		});

		it('should keep the execute node button enabled when the user can use the credential', () => {
			const { getByTestId } = renderWithCredentials(true);

			expect(getByTestId('execute-node-button')).toBeEnabled();
		});

		it('should keep the execute node button enabled when credential sharing is off', () => {
			const { getByTestId } = renderWithCredentials(false, false);

			expect(getByTestId('execute-node-button')).toBeEnabled();
		});

		it('should not emit "run" when the disabled button is clicked', async () => {
			const { getByTestId, emitted } = renderWithCredentials(false);

			await userEvent.click(getByTestId('execute-node-button'));

			expect(emitted('run')).toBeUndefined();
		});
	});

	describe('Add to AI button', () => {
		// The focused-nodes experiment (cloud-only, gated in the store) and the
		// instance-wide AI flags gate the button; enable both so only the
		// per-editor host override varies.
		const setupAiStores = () => {
			const testingPinia = createTestingPinia();
			setActivePinia(testingPinia);
			mockedStore(useFocusedNodesStore).isFeatureEnabled = true;
			mockedStore(useSettingsStore).isAiAssistantEnabled = true;
			return testingPinia;
		};

		it('should show when the focused-nodes feature is on and no host restricts AI', () => {
			const { getByTestId } = renderComponent({
				pinia: setupAiStores(),
				global: {
					provide: {
						...createCanvasNodeProvide(),
						...createCanvasProvide(),
					},
				},
			});

			expect(getByTestId('add-to-ai-button')).toBeInTheDocument();
		});

		it('should hide when the editor host disables AI (per-editor override)', () => {
			const { queryByTestId } = renderComponent({
				pinia: setupAiStores(),
				global: {
					provide: {
						...createCanvasNodeProvide(),
						...createCanvasProvide(),
						[EditorEnabledFeaturesKey]: ref({
							aiAssistant: false,
							aiBuilder: false,
						}),
					},
				},
			});

			expect(queryByTestId('add-to-ai-button')).not.toBeInTheDocument();
		});

		// Regression for ADO-5013: the focused-nodes experiment is cloud-only —
		// the store-level gate (see focusedNodes.store.ts) turns the feature off
		// on self-hosted instances even when AI Assistant is licensed.
		it('should hide when the focused-nodes feature is off (e.g. self-hosted)', () => {
			const testingPinia = setupAiStores();
			mockedStore(useFocusedNodesStore).isFeatureEnabled = false;

			const { queryByTestId } = renderComponent({
				pinia: testingPinia,
				global: {
					provide: {
						...createCanvasNodeProvide(),
						...createCanvasProvide(),
					},
				},
			});

			expect(queryByTestId('add-to-ai-button')).not.toBeInTheDocument();
		});
	});

	// ADO-5556: All icon-only node hover actions (except "Add to n8n AI") lack an
	// explanatory tooltip. They only carry a native `title`/`aria-label`, so no
	// styled tooltip appears on hover to label the control.
	describe('hover action tooltips (ADO-5556)', () => {
		it('should show a tooltip labelling the execute step action on hover', async () => {
			const { getByTestId } = renderComponent({
				pinia,
				global: {
					provide: {
						...createCanvasNodeProvide(),
						...createCanvasProvide(),
					},
				},
			});

			await hoverTooltipTrigger(getByTestId('execute-node-button'));

			await waitFor(() => expect(getTooltip()).toHaveTextContent('Execute step'));
		});

		it('should show a tooltip labelling the deactivate action on hover', async () => {
			const { getByTestId } = renderComponent({
				pinia,
				global: {
					provide: {
						...createCanvasNodeProvide(),
						...createCanvasProvide(),
					},
				},
			});

			await hoverTooltipTrigger(getByTestId('disable-node-button'));

			await waitFor(() => expect(getTooltip()).toHaveTextContent('Deactivate'));
		});

		it('should show a tooltip labelling the delete action on hover', async () => {
			const { getByTestId } = renderComponent({
				pinia,
				global: {
					provide: {
						...createCanvasNodeProvide(),
						...createCanvasProvide(),
					},
				},
			});

			await hoverTooltipTrigger(getByTestId('delete-node-button'));

			await waitFor(() => expect(getTooltip()).toHaveTextContent('Delete'));
		});

		it('should show a tooltip labelling the more actions button on hover', async () => {
			const { getByTestId } = renderComponent({
				pinia,
				global: {
					provide: {
						...createCanvasNodeProvide(),
						...createCanvasProvide(),
					},
				},
			});

			await hoverTooltipTrigger(getByTestId('overflow-node-button'));

			await waitFor(() => expect(getTooltip()).toHaveTextContent('More actions'));
		});
	});

	it('should have "forceVisible" class when sticky color picker is visible', async () => {
		const { getByTestId } = renderComponent({
			pinia,
			global: {
				provide: {
					...createCanvasNodeProvide({
						data: {
							render: {
								type: CanvasNodeRenderType.StickyNote,
								options: { color: 3 },
							},
						},
					}),
					...createCanvasProvide(),
				},
			},
		});

		const toolbar = getByTestId('canvas-node-toolbar');

		await userEvent.click(getByTestId('change-sticky-color'));

		await waitFor(() => expect(toolbar).toHaveClass('forceVisible'));
	});
});
