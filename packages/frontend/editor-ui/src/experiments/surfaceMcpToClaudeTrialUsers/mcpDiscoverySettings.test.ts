import { computed } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { mockedStore } from '@/__tests__/utils';
import { useMcpDiscoveryStore } from './mcpDiscovery.store';
import { mcpDiscoverySettings } from './mcpDiscoverySettings';

describe('MCP settings treatment', () => {
	beforeEach(() => {
		createTestingPinia();
	});
	it('leaves control settings unchanged', () => {
		mockedStore(useMcpDiscoveryStore).isTreatment = false;
		expect(mcpDiscoverySettings.overrides()).toBeUndefined();
	});
	it.each([undefined, false])(
		'keeps Connect prominent without a Claude connection (%s)',
		(connected) => {
			const discovery = mockedStore(useMcpDiscoveryStore);
			discovery.isTreatment = true;
			discovery.state.hasConnectedClaude = connected;
			expect(mcpDiscoverySettings.overrides()).toMatchObject({
				clientTitle: 'Connect your AI assistant',
				connectVariant: 'solid',
			});
		},
	);
	it('updates Connect emphasis when Claude connects or disconnects', () => {
		const discovery = mockedStore(useMcpDiscoveryStore);
		discovery.isTreatment = true;
		discovery.state.hasConnectedClaude = false;
		const overrides = computed(() => mcpDiscoverySettings.overrides());
		expect(overrides.value?.connectVariant).toBe('solid');
		discovery.state.hasConnectedClaude = true;
		expect(overrides.value?.connectVariant).toBe('outline');
		discovery.state.hasConnectedClaude = false;
		expect(overrides.value?.connectVariant).toBe('solid');
	});
});
