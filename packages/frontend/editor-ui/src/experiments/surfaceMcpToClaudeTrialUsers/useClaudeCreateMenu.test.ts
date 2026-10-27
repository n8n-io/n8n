import { computed, ref } from 'vue';

import { useClaudeCreateMenu } from './useClaudeCreateMenu';

const mocks = vi.hoisted(() => ({ openEntry: vi.fn(), trackEntry: vi.fn() }));
const showMcpDiscovery = ref(false);
const entryLabel = ref('Build in Claude');

vi.mock('./useMcpDiscovery', () => ({
	useMcpDiscovery: () => ({
		showMcpDiscovery,
		entryLabel,
		openEntry: mocks.openEntry,
		mcpDiscovery: { trackEntry: mocks.trackEntry },
	}),
}));

describe('useClaudeCreateMenu', () => {
	const items = [{ id: 'workflow', title: 'Workflow' }];
	const handleMenuSelect = vi.fn();
	const createMenu = () =>
		useClaudeCreateMenu(
			computed(() => items),
			handleMenuSelect,
		);

	beforeEach(() => {
		vi.clearAllMocks();
		showMcpDiscovery.value = false;
		entryLabel.value = 'Build in Claude';
	});

	it('adds and removes the Claude entry as eligibility changes', () => {
		const { claudeMenu } = createMenu();
		expect(claudeMenu.value).toEqual(items);
		showMcpDiscovery.value = true;
		expect(claudeMenu.value).toEqual([
			...items,
			{ id: 'claude-divider', isDivider: true },
			{ id: 'claude-mcp', title: 'Build in Claude' },
		]);
		entryLabel.value = 'Connect Claude';
		expect(claudeMenu.value.at(-1)).toEqual({ id: 'claude-mcp', title: 'Connect Claude' });
		showMcpDiscovery.value = false;
		expect(claudeMenu.value).toEqual(items);
	});

	it('opens the Claude entry from the create menu', () => {
		showMcpDiscovery.value = true;
		createMenu().selectItem('claude-mcp');
		expect(mocks.openEntry).toHaveBeenCalledExactlyOnceWith('create_menu');
		expect(handleMenuSelect).not.toHaveBeenCalled();
	});

	it('delegates regular items to the host menu', () => {
		createMenu().selectItem('workflow');
		expect(handleMenuSelect).toHaveBeenCalledExactlyOnceWith('workflow');
		expect(mocks.openEntry).not.toHaveBeenCalled();
	});

	it('tracks menu views only while the Claude entry is visible', () => {
		const { trackOpen } = createMenu();
		trackOpen();
		expect(mocks.trackEntry).not.toHaveBeenCalled();
		showMcpDiscovery.value = true;
		trackOpen();
		expect(mocks.trackEntry).toHaveBeenCalledExactlyOnceWith('create_menu', 'viewed');
		showMcpDiscovery.value = false;
		trackOpen();
		expect(mocks.trackEntry).toHaveBeenCalledOnce();
	});
});
