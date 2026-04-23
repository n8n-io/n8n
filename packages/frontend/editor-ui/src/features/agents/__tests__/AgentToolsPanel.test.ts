import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { mockedStore } from '@/__tests__/utils';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { fireEvent } from '@testing-library/vue';
import type { INodeTypeDescription } from 'n8n-workflow';

import AgentToolsPanel from '../components/AgentToolsPanel.vue';
import type { AgentJsonConfig, AgentJsonToolRef } from '../types';

vi.mock('@n8n/i18n', () => {
	const i18n = {
		baseText: (key: string) => {
			const map: Record<string, string> = {
				'agents.tools.sidebar.empty': 'No tools yet.',
				'agents.tools.addCredentials': 'Add credentials',
				'agents.tools.configure': 'Configure',
				'agents.tools.remove': 'Remove',
			};
			return map[key] ?? key;
		},
	};
	return { useI18n: () => i18n, i18n, i18nInstance: { install: vi.fn() } };
});

vi.mock('vue-router', () => ({
	useRouter: () => ({ push: vi.fn(), resolve: vi.fn(() => ({ href: '' })) }),
	useRoute: () => ({ params: {}, query: {} }),
	RouterLink: { template: '<a><slot /></a>' },
}));

// Stand-in for the canvas credential validator. The real function walks the
// full node-type credential description against the current parameter values
// — we only need enough fidelity to tell "no saved cred for a required slot"
// apart from "every required slot filled". Tests that exercise richer
// displayOptions / proxy-auth scenarios stub this per-case.
vi.mock('@/app/composables/useNodeHelpers', () => ({
	useNodeHelpers: () => ({
		getNodeCredentialIssues: (
			node: { credentials?: Record<string, { id: string | null }> },
			nodeType: { credentials?: Array<{ name: string; required?: boolean }> } | null,
		) => {
			const required = (nodeType?.credentials ?? []).filter((c) => c.required !== false);
			if (required.length === 0) return null;
			const saved = node.credentials ?? {};
			const missing: Record<string, unknown> = {};
			for (const slot of required) {
				if (!saved[slot.name]?.id) missing[slot.name] = true;
			}
			return Object.keys(missing).length > 0 ? { credentials: missing } : null;
		},
	}),
}));

const SLACK: INodeTypeDescription = {
	displayName: 'Slack',
	name: 'n8n-nodes-base.slack',
	group: ['output'],
	version: 1,
	description: 'Send messages to Slack',
	defaults: { name: 'Slack' },
	inputs: [],
	outputs: [],
	properties: [],
	credentials: [{ name: 'slackApi', required: true }],
};

const GMAIL: INodeTypeDescription = {
	...SLACK,
	name: 'n8n-nodes-base.gmail',
	displayName: 'Gmail',
	description: 'Send emails via Gmail',
	credentials: [{ name: 'gmailOAuth2', required: true }],
};

const renderComponent = createComponentRenderer(AgentToolsPanel, {
	global: {
		stubs: {
			NodeIcon: { template: '<div data-test-id="node-icon" />' },
		},
	},
});

function nodeToolRef(overrides: Partial<AgentJsonToolRef['node']> = {}): AgentJsonToolRef {
	return {
		type: 'node',
		name: 'Slack',
		node: {
			nodeType: 'n8n-nodes-base.slack',
			nodeTypeVersion: 1,
			credentials: { slackApi: { id: 'c-1', name: 'Prod Slack Token' } },
			...overrides,
		},
	};
}

function configWithTools(tools: AgentJsonToolRef[]): AgentJsonConfig {
	return {
		name: 'A',
		model: 'openai/gpt-4o-mini',
		instructions: '',
		tools,
	};
}

describe('AgentToolsPanel', () => {
	let nodeTypesStore: ReturnType<typeof mockedStore<typeof useNodeTypesStore>>;

	beforeEach(() => {
		vi.clearAllMocks();
		createTestingPinia({ stubActions: false });
		nodeTypesStore = mockedStore(useNodeTypesStore);
		nodeTypesStore.getNodeType = vi.fn().mockImplementation((name: string) => {
			if (name === SLACK.name) return SLACK;
			if (name === GMAIL.name) return GMAIL;
			return null;
		});
	});

	it('renders the empty state when no tools are configured', () => {
		const { getByText, queryAllByTestId } = renderComponent({
			props: { config: configWithTools([]), agentTools: {} },
		});
		expect(getByText('No tools yet.')).toBeTruthy();
		expect(queryAllByTestId('agent-tool-row')).toHaveLength(0);
	});

	it('renders a row for each configured node tool with the credential name as subtitle', () => {
		const tool = nodeToolRef();
		const { getAllByTestId, getByText } = renderComponent({
			props: { config: configWithTools([tool]), agentTools: {} },
		});
		expect(getAllByTestId('agent-tool-row')).toHaveLength(1);
		expect(getByText('Slack')).toBeTruthy();
		expect(getByText('Prod Slack Token')).toBeTruthy();
	});

	it('renders the "Add credentials" chip for node tools missing required credentials', () => {
		const tool: AgentJsonToolRef = {
			type: 'node',
			name: 'Gmail',
			node: { nodeType: GMAIL.name, nodeTypeVersion: 1 },
		};
		const { getByTestId, queryByTestId } = renderComponent({
			props: { config: configWithTools([tool]), agentTools: {} },
		});
		expect(getByTestId('agent-sidebar-add-credentials-chip')).toBeTruthy();
		// Gear is hidden on missing-creds rows (the chip is the CTA for configuration),
		// but the trash must still render so users can remove a broken tool.
		expect(queryByTestId('agent-sidebar-configure-btn')).toBeNull();
		expect(getByTestId('agent-sidebar-remove-btn')).toBeTruthy();
	});

	it('removes a missing-creds tool via the (hover-revealed) trash button', async () => {
		const brokenTool: AgentJsonToolRef = {
			type: 'node',
			name: 'Gmail',
			node: { nodeType: GMAIL.name, nodeTypeVersion: 1 },
		};
		const { getByTestId, emitted } = renderComponent({
			props: { config: configWithTools([brokenTool]), agentTools: {} },
		});
		await fireEvent.click(getByTestId('agent-sidebar-remove-btn'));
		expect(emitted('update:config')).toBeTruthy();
		const [changes] = (emitted('update:config') as unknown[][])[0] as [Partial<AgentJsonConfig>];
		expect(changes.tools).toEqual([]);
	});

	it('emits configure with the tool ref when the gear button is clicked', async () => {
		const tool = nodeToolRef();
		const { getByTestId, emitted } = renderComponent({
			props: { config: configWithTools([tool]), agentTools: {} },
		});
		await fireEvent.click(getByTestId('agent-sidebar-configure-btn'));
		expect(emitted('configure')).toBeTruthy();
		expect((emitted('configure') as unknown[][])[0][0]).toStrictEqual(tool);
	});

	it('emits configure when the Add credentials chip is clicked', async () => {
		const tool: AgentJsonToolRef = {
			type: 'node',
			name: 'Gmail',
			node: { nodeType: GMAIL.name, nodeTypeVersion: 1 },
		};
		const { getByTestId, emitted } = renderComponent({
			props: { config: configWithTools([tool]), agentTools: {} },
		});
		await fireEvent.click(getByTestId('agent-sidebar-add-credentials-chip'));
		expect(emitted('configure')).toBeTruthy();
	});

	it('removes the tool and emits update:config with the filtered list', async () => {
		const keep = nodeToolRef();
		const remove: AgentJsonToolRef = { ...nodeToolRef(), name: 'Slack 2' };
		const { getAllByTestId, emitted } = renderComponent({
			props: { config: configWithTools([keep, remove]), agentTools: {} },
		});
		const removeButtons = getAllByTestId('agent-sidebar-remove-btn');
		expect(removeButtons).toHaveLength(2);
		await fireEvent.click(removeButtons[1]);

		expect(emitted('update:config')).toBeTruthy();
		const [changes] = (emitted('update:config') as unknown[][])[0] as [Partial<AgentJsonConfig>];
		expect(changes.tools).toHaveLength(1);
		expect(changes.tools?.[0]).toStrictEqual(keep);
	});

	it('renders workflow tool rows with a gear and emits configure with the ref when clicked', async () => {
		// Per AGENT-26 workflow tools must be editable in-place (name,
		// description, allOutputs via `WorkflowToolConfigContent`), so the
		// sidebar's gear stays active for them.
		const workflowRef: AgentJsonToolRef = {
			type: 'workflow',
			name: 'Share with Sales team',
			description: 'Sales',
			workflow: 'workflow-sales',
		};
		const { getByText, getByTestId, emitted } = renderComponent({
			props: { config: configWithTools([workflowRef]), agentTools: {} },
		});
		expect(getByText('Share with Sales team')).toBeTruthy();
		expect(getByText('Sales')).toBeTruthy();
		await fireEvent.click(getByTestId('agent-sidebar-configure-btn'));
		expect(emitted('configure')).toBeTruthy();
		expect((emitted('configure') as unknown[][])[0][0]).toStrictEqual(workflowRef);
	});
});
