import { createTestingPinia } from '@pinia/testing';
import { defineComponent, ref, nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import { N8nPopover } from '@n8n/design-system';
import { waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { useMcpDiscoveryStore } from './mcpDiscovery.store';
import McpConnectHint from './McpConnectHint.vue';

const showError = vi.hoisted(() => vi.fn());
vi.mock('@n8n/composables/useToast', () => ({ useToast: () => ({ showError }) }));

const harness = defineComponent({
	components: { McpConnectHint },
	setup: () => ({ enabled: ref(true), dismissed: ref(false), connected: ref(false) }),
	template: `<button>Outside</button><button @click="enabled = !enabled">Toggle MCP</button><McpConnectHint v-if="enabled" v-model:dismissed="dismissed"><button @click="connected = true">Connect</button></McpConnectHint><span v-if="connected">Connection flow opened</span>`,
});
const render = createComponentRenderer(harness);
let pinia: ReturnType<typeof createTestingPinia>;
let store: ReturnType<typeof mockedStore<typeof useMcpDiscoveryStore>>;
beforeEach(() => {
	showError.mockClear();
	pinia = createTestingPinia();
	store = mockedStore(useMcpDiscoveryStore);
	store.isTreatment = true;
	store.coachmarkDismissed = false;
	store.state = {
		status: 'assigned',
		hasConnectedClaude: false,
		hasUsedMcp: false,
		eligibleAt: 1,
	};
	store.dismissCoachmark.mockResolvedValue(undefined);
});

it.each(['control', 'dismissed', 'connected', 'used'])('hides guidance when %s', async (reason) => {
	if (reason === 'control') store.isTreatment = false;
	if (reason === 'dismissed') store.coachmarkDismissed = true;
	if (reason === 'connected') store.state.hasConnectedClaude = true;
	if (reason === 'used') store.state.hasUsedMcp = true;
	const { getByRole } = render({ pinia });
	expect(getByRole('button', { name: 'Connect' })).toBeVisible();
	expect(within(document.body).queryByTestId('mcp-connect-hint')).not.toBeInTheDocument();
});

it.each(['Got it', 'Connect'])('persists dismissal from %s', async (label) => {
	render({ pinia });
	await waitFor(() => expect(within(document.body).getByTestId('mcp-connect-hint')).toBeVisible());
	await userEvent.click(within(document.body).getByRole('button', { name: label }));
	expect(store.dismissCoachmark).toHaveBeenCalledOnce();
	await waitFor(() =>
		expect(within(document.body).queryByTestId('mcp-connect-hint')).not.toBeInTheDocument(),
	);
});

it('opens the connection flow even when dismissal cannot be saved', async () => {
	const error = new Error('Unavailable');
	store.dismissCoachmark.mockRejectedValueOnce(error);
	const { getByRole, getByText } = render({ pinia });
	await waitFor(() => expect(within(document.body).getByTestId('mcp-connect-hint')).toBeVisible());
	await userEvent.click(getByRole('button', { name: 'Connect' }));
	await waitFor(() => expect(showError).toHaveBeenCalledWith(error, expect.any(String)));
	expect(getByText('Connection flow opened')).toBeVisible();
	expect(within(document.body).queryByTestId('mcp-connect-hint')).not.toBeInTheDocument();
});

it('keeps an Escape dismissal after re-enabling MCP', async () => {
	const { getByRole } = render({ pinia });
	await waitFor(() => expect(within(document.body).getByTestId('mcp-connect-hint')).toBeVisible());
	await userEvent.keyboard('{Escape}');
	await waitFor(() =>
		expect(within(document.body).queryByTestId('mcp-connect-hint')).not.toBeInTheDocument(),
	);
	await userEvent.click(getByRole('button', { name: 'Toggle MCP' }));
	await userEvent.click(getByRole('button', { name: 'Toggle MCP' }));
	expect(within(document.body).queryByTestId('mcp-connect-hint')).not.toBeInTheDocument();
	expect(store.dismissCoachmark).not.toHaveBeenCalled();
});

// Reka UI reports outside interactions through update:open. Verify the wrapper's model contract.
it('keeps an outside-dismiss event after re-enabling MCP', async () => {
	const wrapper = mount(harness, { global: { plugins: [pinia] } });
	wrapper.findComponent(N8nPopover).vm.$emit('update:open', false);
	await nextTick();
	expect(wrapper.findComponent(N8nPopover).props('open')).toBe(false);
	const toggle = wrapper.findAll('button').find((button) => button.text() === 'Toggle MCP')!;
	await toggle.trigger('click');
	await toggle.trigger('click');
	expect(wrapper.findComponent(N8nPopover).props('open')).toBe(false);
	expect(store.dismissCoachmark).not.toHaveBeenCalled();
	wrapper.unmount();
});
