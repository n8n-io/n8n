import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import { screen } from '@testing-library/vue';
import { modalRegistry } from '@n8n/frontend-module-sdk';

import ModalRoot from '@/app/components/ModalRoot.vue';
import { useUIStore } from '@/app/stores/ui.store';
import { createComponentRenderer } from '@/__tests__/render';
import {
	CHANGE_PASSWORD_MODAL_KEY,
	CONFIRM_PASSWORD_MODAL_KEY,
	MFA_SETUP_MODAL_KEY,
	PROMPT_MFA_CODE_MODAL_KEY,
} from '@/app/constants';

/**
 * The four modal keys `Modals.vue` renders on unauthenticated routes. `<AppModals />`
 * is not auth-gated, so these mount before any registration has run.
 */
const AUTH_ROUTE_MODAL_KEYS = [
	CHANGE_PASSWORD_MODAL_KEY,
	CONFIRM_PASSWORD_MODAL_KEY,
	MFA_SETUP_MODAL_KEY,
	PROMPT_MFA_CODE_MODAL_KEY,
];

const MODAL_KEY = 'someFeatureModal';

const renderModalRoot = createComponentRenderer(ModalRoot, {
	// `params` is how vue-test-utils exposes scoped-slot props to a string slot.
	slots: {
		default: '<div data-test-id="modal-content">{{ JSON.stringify(params) }}</div>',
	},
});

const renderedSlotProps = () => JSON.parse(screen.getByTestId('modal-content').textContent ?? '');

describe('ModalRoot', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		modalRegistry.clear();
		// Nothing has registered yet — the state every reader sees on first paint.
		useUIStore().modalsById = {};
	});

	it('renders nothing for a key that is not registered', () => {
		expect(() => renderModalRoot({ props: { name: MODAL_KEY } })).not.toThrow();

		expect(screen.queryByTestId('modal-content')).not.toBeInTheDocument();
	});

	it.each(AUTH_ROUTE_MODAL_KEYS)(
		'renders %s closed when the registry and store are both empty',
		(modalKey) => {
			expect(() => renderModalRoot({ props: { name: modalKey } })).not.toThrow();

			expect(screen.queryByTestId('modal-content')).not.toBeInTheDocument();
		},
	);

	it('renders the slot with a closed state for an unregistered key when keepAlive is set', () => {
		expect(() => renderModalRoot({ props: { name: MODAL_KEY, keepAlive: true } })).not.toThrow();

		expect(screen.getByTestId('modal-content')).toBeInTheDocument();
		expect(renderedSlotProps()).toMatchObject({
			modalName: MODAL_KEY,
			open: false,
			active: false,
		});
	});

	it('passes modal state to the slot once the key is open', () => {
		const uiStore = useUIStore();
		uiStore.modalsById = {
			[MODAL_KEY]: { open: true, mode: 'edit', activeId: '42', data: { foo: 'bar' } },
		};
		uiStore.openModal(MODAL_KEY);

		renderModalRoot({ props: { name: MODAL_KEY } });

		expect(screen.getByTestId('modal-content')).toBeInTheDocument();
		expect(renderedSlotProps()).toEqual({
			modalName: MODAL_KEY,
			active: true,
			open: true,
			activeId: '42',
			mode: 'edit',
			data: { foo: 'bar' },
		});
	});

	it('opens a modal registered after it was already mounted', async () => {
		const uiStore = useUIStore();
		renderModalRoot({ props: { name: MODAL_KEY } });
		expect(screen.queryByTestId('modal-content')).not.toBeInTheDocument();

		uiStore.registerModal(MODAL_KEY);
		uiStore.openModal(MODAL_KEY);
		await nextTick();

		expect(screen.getByTestId('modal-content')).toBeInTheDocument();
	});
});
