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
	recordingSettings: reactive({ networkRequests: false, screenshots: false }),
	controlledTabs: ref<chrome.tabs.Tab[]>([]),
	toggleTab: vi.fn(),
	connect: vi.fn(),
	decline: vi.fn(),
	disconnect: vi.fn(),
	forgetHost: vi.fn(),
	updateRecordingSetting: vi.fn(),
};

const recordingState = {
	recording: ref(null),
	errorMessage: ref(''),
	start: vi.fn(),
	stop: vi.fn(),
	submit: vi.fn(),
	discard: vi.fn(),
	recordAgain: vi.fn(),
	removeAction: vi.fn(),
	maskAction: vi.fn(),
};

const recommendationsState = {
	status: ref<'loading' | 'ready' | 'unavailable' | 'sent'>('unavailable'),
	ideas: ref<Array<{ id: string; title: string; description: string }>>([]),
	isSending: ref(false),
	send: vi.fn(),
	refresh: vi.fn(),
};

vi.mock('./composables/useConnection', () => ({ useConnection: () => state }));
vi.mock('./composables/useRecording', () => ({ useRecording: () => recordingState }));
vi.mock('./composables/useRecommendations', () => ({
	useRecommendations: () => recommendationsState,
}));

beforeEach(() => {
	vi.clearAllMocks();
	state.status.value = 'disconnected';
	state.hasRelayUrl.value = true;
	state.isRelayAllowed.value = true;
	state.isAutoConnect.value = false;
	state.rememberInstance.value = false;
	state.approvedHosts.value = [];
	state.recordingSettings.networkRequests = false;
	state.recordingSettings.screenshots = false;
	recommendationsState.status.value = 'unavailable';
	recommendationsState.ideas.value = [];
	recommendationsState.isSending.value = false;
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
	it('can be reviewed while nothing is connected', async () => {
		state.hasRelayUrl.value = false;
		state.approvedHosts.value = ['acme.app.n8n.cloud'];

		const wrapper = mount(App);
		await wrapper.find('[aria-label="Settings"]').trigger('click');

		expect(wrapper.findComponent(RememberedHosts).props('hosts')).toEqual(['acme.app.n8n.cloud']);
	});

	it('can be revoked while connected to a different instance', async () => {
		state.status.value = 'connected';
		state.approvedHosts.value = ['localhost:5678'];

		const wrapper = mount(App);
		await wrapper.find('[aria-label="Settings"]').trigger('click');
		wrapper.findComponent(RememberedHosts).vm.$emit('forget', 'localhost:5678');
		await wrapper.vm.$nextTick();

		expect(state.forgetHost).toHaveBeenCalledWith('localhost:5678');
	});
});

describe('automation ideas', () => {
	beforeEach(() => {
		state.status.value = 'connected';
	});

	it('shows a skeleton while loading', () => {
		recommendationsState.status.value = 'loading';

		expect(mount(App).find('.skeleton').exists()).toBe(true);
	});

	it('swaps the pitch copy for an idea-oriented heading once ideas are showing', () => {
		recommendationsState.status.value = 'ready';
		recommendationsState.ideas.value = [
			{ id: '1', title: 'Triage new issues', description: 'Label and route new GitHub issues' },
		];

		const wrapper = mount(App);
		expect(wrapper.text()).toContain('Automation ideas for this page');
		expect(wrapper.text()).not.toContain('Record a browser task');
	});

	it('shows the idea and sends it on click, without starting a recording', async () => {
		recommendationsState.status.value = 'ready';
		recommendationsState.ideas.value = [
			{ id: '1', title: 'Triage new issues', description: 'Label and route new GitHub issues' },
		];

		const wrapper = mount(App);
		expect(wrapper.text()).toContain('Triage new issues');

		await wrapper.find('.idea-card').trigger('click');
		expect(recommendationsState.send).toHaveBeenCalledWith(recommendationsState.ideas.value[0]);
		expect(recordingState.start).not.toHaveBeenCalled();
	});

	it('disables the idea cards while a pick is in flight, so a second click cannot double-build', () => {
		recommendationsState.status.value = 'ready';
		recommendationsState.ideas.value = [
			{ id: '1', title: 'Triage new issues', description: 'Label and route new GitHub issues' },
		];
		recommendationsState.isSending.value = true;

		const wrapper = mount(App);

		expect(wrapper.find('.idea-card').attributes('disabled')).toBeDefined();
	});

	it('falls back to the static instructional copy when unavailable', () => {
		recommendationsState.status.value = 'unavailable';

		expect(mount(App).text()).toContain('Record a browser task');
	});

	it('shows the sent confirmation instead of the recording pitch', () => {
		recommendationsState.status.value = 'sent';

		const wrapper = mount(App);
		expect(wrapper.text()).toContain('AI Assistant is building this in a new conversation.');
		expect(wrapper.text()).not.toContain('Record a browser task');
	});
});
