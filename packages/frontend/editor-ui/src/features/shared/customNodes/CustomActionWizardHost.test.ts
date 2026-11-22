import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { defineComponent, h, nextTick } from 'vue';
import { render, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { capabilities, capabilityRegistry } from '@n8n/frontend-module-sdk';
import { useClipboard } from '@n8n/composables/useClipboard';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useCustomNodesStore } from '@n8n/frontend-module-custom-nodes';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';

import { createComponentRenderer } from '@/__tests__/render';
import { useKeybindings } from '@/app/composables/useKeybindings';
import CustomActionWizardHost from './CustomActionWizardHost.vue';
import { useCustomActionWizard } from './useCustomActionWizard';

const loadWizard = vi.hoisted(() => ({ spy: vi.fn() }));
vi.mock('@n8n/frontend-module-custom-nodes', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@n8n/frontend-module-custom-nodes')>();
	loadWizard.spy.mockImplementation(actual.loadCustomActionWizardModal);
	return { ...actual, loadCustomActionWizardModal: loadWizard.spy };
});

const renderHost = createComponentRenderer(CustomActionWizardHost);

const setup = (moduleActive: boolean) => {
	const pinia = createTestingPinia({ stubActions: false });
	setActivePinia(pinia);
	useSettingsStore().settings.activeModules = moduleActive ? ['custom-nodes'] : [];
	return renderHost({ pinia });
};

const wizardDialog = async () =>
	await waitFor(() => {
		const dialog = document.querySelector('[data-test-id="custom-action-wizard"]');
		if (!dialog) throw new Error('The wizard is not open');
		return dialog;
	});

/** Stands in for the canvas: its shortcuts and its paste handler on the document. */
const mountCanvas = (onDelete: () => void, onPaste: (text: string) => void) =>
	render(
		defineComponent({
			setup() {
				useKeybindings({ 'delete|backspace|d': onDelete });
				useClipboard({ onPaste });
				return () => h('div');
			},
		}),
	);

describe('CustomActionWizardHost node types refresh', () => {
	const setupRefresh = (moduleActive: boolean) => {
		const view = setup(moduleActive);
		const nodeTypesStore = useNodeTypesStore();
		const getNodeTypes = vi.spyOn(nodeTypesStore, 'getNodeTypes').mockResolvedValue();
		return { view, getNodeTypes, customNodesStore: useCustomNodesStore() };
	};

	it('reloads the node types when the module store counts a write', async () => {
		const { getNodeTypes, customNodesStore } = setupRefresh(true);

		customNodesStore.definitionsRevision += 1;
		await nextTick();

		expect(getNodeTypes).toHaveBeenCalledTimes(1);
	});

	it('does not fail when the reload of the node types fails', async () => {
		const { getNodeTypes, customNodesStore } = setupRefresh(true);
		getNodeTypes.mockRejectedValue(new Error('offline'));

		customNodesStore.definitionsRevision += 1;
		await nextTick();

		expect(getNodeTypes).toHaveBeenCalledTimes(1);
	});

	it('does nothing with the module off', async () => {
		const { getNodeTypes, customNodesStore } = setupRefresh(false);

		customNodesStore.definitionsRevision += 1;
		await nextTick();

		expect(getNodeTypes).not.toHaveBeenCalled();
	});
});

describe('CustomActionWizardHost', () => {
	beforeEach(() => {
		loadWizard.spy.mockClear();
		capabilityRegistry.provide(capabilities.typeDescriptions, {
			load: async () => {},
			nodeTypes: () => [],
			credentialTypeDisplayName: () => undefined,
		});
	});

	afterEach(() => {
		useCustomActionWizard().isOpen.value = false;
		capabilityRegistry.unprovide(capabilities.typeDescriptions);
	});

	it('opens the wizard with the data of the entry point', async () => {
		setup(true);

		useCustomActionWizard().open({ mode: 'create', parentNodeType: 'n8n-nodes-base.slack' });

		expect(await wizardDialog()).toBeInTheDocument();
		expect(useCustomActionWizard().data.value).toEqual({
			mode: 'create',
			parentNodeType: 'n8n-nodes-base.slack',
		});
	});

	it('loads the wizard only when it opens', async () => {
		setup(true);
		await nextTick();

		expect(loadWizard.spy).not.toHaveBeenCalled();

		useCustomActionWizard().open({ mode: 'create' });

		expect(await wizardDialog()).toBeInTheDocument();
		expect(loadWizard.spy).toHaveBeenCalledTimes(1);
	});

	it('renders no wizard with the module off', async () => {
		setup(false);

		useCustomActionWizard().open({ mode: 'create' });
		await nextTick();

		expect(document.querySelector('[data-test-id="custom-action-wizard"]')).toBeNull();
		expect(loadWizard.spy).not.toHaveBeenCalled();
	});

	it('keeps canvas shortcuts and the canvas paste away from the open wizard', async () => {
		const onDelete = vi.fn();
		const onPaste = vi.fn();
		mountCanvas(onDelete, onPaste);
		setup(true);
		useCustomActionWizard().open({ mode: 'create' });

		const dialog = await wizardDialog();
		const input = await waitFor(() => {
			const element = dialog.querySelector('input');
			if (!element) throw new Error('The wizard has no input yet');
			return element;
		});

		// Typing in a field of the wizard.
		await userEvent.click(input);
		await userEvent.keyboard('d{Backspace}{Delete}');
		// A key while a button of the wizard has the focus.
		const button = dialog.querySelector('button');
		button?.focus();
		await userEvent.keyboard('{Delete}');
		// A pasted URL in a field of the wizard.
		const paste = new Event('paste', { bubbles: true });
		Object.defineProperty(paste, 'clipboardData', {
			value: { getData: () => 'https://api.example.com/v1/items' },
		});
		input.dispatchEvent(paste);

		expect(onDelete).not.toHaveBeenCalled();
		expect(onPaste).not.toHaveBeenCalled();
	});
});
