import { mount } from '@vue/test-utils';
import { ref, reactive } from 'vue';

import App from './App.vue';
import RememberedHosts from './components/RememberedHosts.vue';

// The composable's own behaviour is covered in `composables/useConnection.test.ts`.
const state = {
	status: ref<'disconnected' | 'connected' | 'connecting'>('disconnected'),
	tabs: ref<chrome.tabs.Tab[]>([]),
	selectedTabIds: reactive(new Set<number>()),
	errorMessage: ref(''),
	hasRelayUrl: ref(true),
	isRelayAllowed: ref(true),
	isAutoConnect: ref(false),
	relayHostKey: ref<string | null>('localhost:5678'),
	rememberInstance: ref(false),
	approvedHosts: ref<string[]>([]),
	controlledTabs: ref<chrome.tabs.Tab[]>([]),
	toggleTab: vi.fn(),
	connect: vi.fn(),
	decline: vi.fn(),
	disconnect: vi.fn(),
	forgetHost: vi.fn(),
};

vi.mock('./composables/useConnection', () => ({ useConnection: () => state }));

beforeEach(() => {
	vi.clearAllMocks();
	state.status.value = 'disconnected';
	state.hasRelayUrl.value = true;
	state.isRelayAllowed.value = true;
	state.isAutoConnect.value = false;
	state.rememberInstance.value = false;
	state.approvedHosts.value = [];
});

describe('connect prompt', () => {
	it('leaves the allow-always choice unticked, so it is never granted by inaction', () => {
		const wrapper = mount(App);

		expect(wrapper.text()).toContain('Always allow localhost:5678');
		expect(state.rememberInstance.value).toBe(false);
	});

	it('hides the choice when connecting unattended, which must not record consent', () => {
		state.isAutoConnect.value = true;

		expect(mount(App).text()).not.toContain('Always allow');
	});
});

// What the child renders is its own spec; App owns where it appears and the wiring.
describe('remembered hosts', () => {
	it('can be reviewed while nothing is connected', () => {
		state.hasRelayUrl.value = false;
		state.approvedHosts.value = ['acme.app.n8n.cloud'];

		expect(mount(App).findComponent(RememberedHosts).props('hosts')).toEqual([
			'acme.app.n8n.cloud',
		]);
	});

	it('can be revoked while connected to a different instance', async () => {
		state.status.value = 'connected';
		state.approvedHosts.value = ['localhost:5678'];

		const wrapper = mount(App);
		wrapper.findComponent(RememberedHosts).vm.$emit('forget', 'localhost:5678');
		await wrapper.vm.$nextTick();

		expect(state.forgetHost).toHaveBeenCalledWith('localhost:5678');
	});
});
