import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { mount } from '@vue/test-utils';
import type { AgentConfigValidationIssue } from '@n8n/api-types';

import AgentGuardrailsSection from '../components/AgentGuardrailsSection.vue';
import type { AgentJsonConfig, AgentJsonToolRef } from '../types';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (
			key: string,
			options?: {
				interpolate?: Record<string, string | number>;
				adjustToNumber?: number;
			},
		) => {
			const copy: Record<string, string> = {
				'agents.builder.guardrails.add': 'Add guardrail',
				'agents.builder.guardrails.chip.allTools': 'All tools',
				'agents.builder.guardrails.kind.keywords': 'Blocked keywords',
				'agents.builder.guardrails.kind.jailbreak': 'Jailbreak detection',
				'agents.builder.guardrails.kind.nsfw': 'NSFW detection',
				'agents.builder.guardrails.kind.pii': 'PII detection',
				'agents.builder.guardrails.kind.secretKeys': 'Secret keys',
				'agents.builder.guardrails.kind.topicalAlignment': 'Topical alignment',
				'agents.builder.guardrails.kind.urls': 'URL control',
			};
			const template = copy[key] ?? key;
			const values = options?.interpolate ?? {};
			const [one, other] = template.split(' | ');
			const plural = options?.adjustToNumber === 1 && other !== undefined ? one : (other ?? one);
			return (plural ?? template).replace(/\{(\w+)\}/g, (_, name: string) =>
				String(values[name] ?? ''),
			);
		},
	}),
}));

vi.mock('../components/AgentBudgetPanel.vue', () => ({
	default: {
		name: 'AgentBudgetPanel',
		props: {
			config: { type: Object, default: null },
			projectId: { type: String, default: '' },
			agentId: { type: String, default: '' },
			disabled: { type: Boolean, default: false },
			embedded: { type: Boolean, default: false },
		},
		emits: ['update:config'],
		template: '<div data-testid="agent-budget-panel-stub" />',
	},
}));

vi.mock('../components/AgentGuardrailModal.vue', () => ({
	default: {
		name: 'AgentGuardrailModal',
		props: ['open', 'guardrail', 'kind', 'tools', 'disabled'],
		emits: ['update:open', 'save', 'remove'],
		template: '<div data-testid="agent-guardrail-modal-stub" />',
	},
}));

// The context menu is a portal-heavy wrapper; the section only needs its remove emit.
vi.mock('../components/AgentItemContextMenu.vue', () => ({
	default: {
		name: 'AgentItemContextMenu',
		props: ['disabled', 'enabled'],
		emits: ['remove'],
		template:
			'<div><slot /><button type="button" :disabled="disabled" data-testid="agent-guardrails-chip-remove" @click="$emit(\'remove\')" /></div>',
	},
}));

vi.mock('@/app/components/NodeIcon.vue', () => ({
	default: {
		name: 'NodeIcon',
		props: ['nodeType', 'size'],
		template: '<span data-testid="guardrail-chip-tool-icon" />',
	},
}));

vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: () => ({
		getNodeType: (name: string) =>
			['n8n-nodes-base.httpRequest', 'n8n-nodes-base.slack'].includes(name)
				? { name, displayName: name }
				: null,
	}),
}));

const KEYWORDS_GUARDRAIL = {
	kind: 'keywords',
	id: 'keywords-all',
	name: 'Block secrets',
	stage: 'before',
	keywords: ['secret'],
} as const;

const PII_GUARDRAIL = {
	kind: 'pii',
	id: 'pii-nodes',
	name: 'PII on nodes',
	stage: 'after',
	type: 'selected',
	entities: ['EMAIL_ADDRESS'],
	tools: [
		{ type: 'node', name: 'HTTP Request' },
		{ type: 'workflow', workflowId: 'wf-1' },
	],
} as const;

const HTTP_NODE_TYPE = 'n8n-nodes-base.httpRequest';
const SLACK_NODE_TYPE = 'n8n-nodes-base.slack';

function nodeTool(name: string, nodeType: string): AgentJsonToolRef {
	return {
		type: 'node',
		name,
		node: { nodeType, nodeTypeVersion: 4.2, nodeParameters: {} },
	} as AgentJsonToolRef;
}

function agentTools(): AgentJsonToolRef[] {
	return [
		nodeTool('HTTP Request', HTTP_NODE_TYPE),
		nodeTool('Slack A', SLACK_NODE_TYPE),
		nodeTool('Slack B', SLACK_NODE_TYPE),
		{ type: 'workflow', workflow: 'Sync customers', workflowId: 'wf-1' },
	] as AgentJsonToolRef[];
}

function config(
	guardrails?: Array<Record<string, unknown>>,
	overrides: Partial<AgentJsonConfig> = {},
): AgentJsonConfig {
	return {
		name: 'Agent',
		model: 'openai/gpt-4o-mini',
		instructions: 'You are a test agent',
		...(guardrails
			? {
					config: {
						guardrails: {
							budget: { enabled: true, monthlyBudgetUsd: 100 },
							tools: guardrails,
						},
					},
				}
			: {}),
		...overrides,
	} as AgentJsonConfig;
}

/** Every mounted section, so the portaled add menus tear down between tests. */
const mountedSections: Array<ReturnType<typeof mount>> = [];

function mountSection(
	overrides: Partial<{
		config: AgentJsonConfig;
		tools: AgentJsonToolRef[];
		disabled: boolean;
		validationIssues: AgentConfigValidationIssue[];
	}> = {},
	approval?: string,
) {
	const wrapper = mount(AgentGuardrailsSection, {
		slots: approval ? { approval } : undefined,
		attachTo: document.body,
		props: {
			config: config([KEYWORDS_GUARDRAIL, PII_GUARDRAIL]),
			tools: agentTools(),
			projectId: 'project-1',
			agentId: 'agent-1',
			...overrides,
		},
	});
	mountedSections.push(wrapper);
	return wrapper;
}

/** Opens the add menu with a real pointer sequence, as a click does in the app. */
async function openAddMenu(wrapper: ReturnType<typeof mountSection>) {
	await userEvent.click(wrapper.get('[data-testid="agent-guardrails-add"]').element);
}

/** The portaled menu item for a kind, once the add menu is open. */
function addMenuItem(kind: string): HTMLElement | null {
	return document.querySelector<HTMLElement>(`[data-test-id="agent-guardrails-add-${kind}"]`);
}

/** Clicks a kind on the open add menu, as a builder picking the guardrail type. */
async function pickKind(kind: string) {
	const item = addMenuItem(kind);
	expect(item, `add menu item ${kind}`).not.toBeNull();
	await userEvent.click(item as HTMLElement);
}

function issue(
	capability: { kind: string; id?: string },
	path = 'config.guardrails.tools[0].keywords',
): AgentConfigValidationIssue {
	return {
		code: 'missing_required',
		path,
		capability,
	} as AgentConfigValidationIssue;
}

beforeEach(() => {
	vi.clearAllMocks();
});

// The add menu portals into the document body, so each test's tree needs teardown.
afterEach(() => {
	for (const wrapper of mountedSections.splice(0)) wrapper.unmount();
	document.body.innerHTML = '';
});

describe('AgentGuardrailsSection', () => {
	it('renders one chip per configured guardrail with covered-tool icons', () => {
		const wrapper = mountSection();

		const chips = wrapper.findAll('[data-testid="agent-guardrails-chip"]');
		expect(chips).toHaveLength(2);
		// A guardrail without a tools list covers every tool: text, no icons.
		expect(chips[0].text()).toContain('Block secrets');
		expect(chips[0].text()).toContain('All tools');
		expect(chips[0].find('[data-testid="guardrail-chip-tool-icon"]').exists()).toBe(false);
		expect(chips[0].find('[data-testid="guardrail-chip-tool-fallback-icon"]').exists()).toBe(false);
		// The chip shows the covered tools, not the guardrail kind.
		expect(chips[1].text()).toContain('PII on nodes');
		expect(chips[1].text()).not.toContain('PII detection');
		expect(chips[1].findAll('[data-testid="guardrail-chip-tool-icon"]')).toHaveLength(1);
		expect(chips[1].find('[data-testid="guardrail-chip-tool-fallback-icon"]').exists()).toBe(true);
	});

	it('groups several tools of one node type behind a single icon with a count', () => {
		const multiSlack = {
			kind: 'keywords',
			id: 'slack-guard',
			name: 'Slack guard',
			stage: 'before',
			keywords: ['x'],
			tools: [
				{ type: 'node', name: 'Slack A' },
				{ type: 'node', name: 'Slack B' },
				{ type: 'workflow', workflowId: 'wf-1' },
			],
		} as const;
		const wrapper = mountSection({ config: config([multiSlack]) });

		const chip = wrapper.get('[data-testid="agent-guardrails-chip"]');
		// Two Slack tools collapse into one node icon with a count.
		const nodeIcons = chip.findAll('[data-testid="guardrail-chip-tool-icon"]');
		expect(nodeIcons).toHaveLength(1);
		expect(chip.text()).toContain('2');
		// The workflow keeps its own icon, so two icon groups render.
		expect(chip.findAll('[data-testid="guardrail-chip-tool-fallback-icon"]')).toHaveLength(1);
		const groups = chip.findAll('[data-testid="guardrail-chip-tool-group"]');
		expect(groups).toHaveLength(2);
		// The group tooltip names every covered tool.
		expect(nodeIcons[0].element.parentElement?.getAttribute('title')).toBe('Slack A, Slack B');
	});

	it('stays silent about refs that match no configured tool', () => {
		const dangling = {
			kind: 'keywords',
			id: 'dangling-guard',
			name: 'Dangling',
			stage: 'before',
			keywords: ['x'],
			tools: [{ type: 'node', name: 'Gone tool' }],
		} as const;
		const wrapper = mountSection({ config: config([dangling]) });

		const chip = wrapper.get('[data-testid="agent-guardrails-chip"]');
		expect(chip.find('[data-testid="guardrail-chip-tool-icon"]').exists()).toBe(false);
		expect(chip.find('[data-testid="guardrail-chip-tool-fallback-icon"]').exists()).toBe(false);
	});

	it('offers the seven kinds on the add menu', async () => {
		const wrapper = mountSection();

		await openAddMenu(wrapper);

		const expectedKinds = [
			'keywords',
			'jailbreak',
			'nsfw',
			'pii',
			'secretKeys',
			'topicalAlignment',
			'urls',
		];
		for (const kind of expectedKinds) {
			expect(addMenuItem(kind), `add menu item ${kind}`).not.toBeNull();
		}
		// v1 has no Workflow, custom prompt, or custom regex kinds.
		expect(addMenuItem('workflow')).toBeNull();
		expect(addMenuItem('customPrompt')).toBeNull();
		expect(addMenuItem('customRegex')).toBeNull();
	});

	it('opens the add menu from the tooltip-wrapped button beside the chips', async () => {
		const wrapper = mountSection();

		await openAddMenu(wrapper);

		expect(document.querySelector('[role="menu"]')).not.toBeNull();
	});

	it('opens the modal in create mode with the picked kind', async () => {
		const wrapper = mountSection();

		await openAddMenu(wrapper);
		await pickKind('jailbreak');

		const modal = wrapper.getComponent({ name: 'AgentGuardrailModal' });
		expect(modal.props('open')).toBe(true);
		expect(modal.props('kind')).toBe('jailbreak');
		expect(modal.props('guardrail')).toBeNull();
		expect(modal.props('tools')).toEqual(agentTools());
	});

	it('opens the modal in edit mode on chip click', async () => {
		const wrapper = mountSection();

		await wrapper.findAll('[data-testid="agent-guardrails-chip"]')[1].trigger('click');

		const modal = wrapper.getComponent({ name: 'AgentGuardrailModal' });
		expect(modal.props('open')).toBe(true);
		expect(modal.props('guardrail')).toEqual(PII_GUARDRAIL);
	});

	it('keeps the modal closed until a chip or a kind is picked', () => {
		const wrapper = mountSection();

		expect(wrapper.getComponent({ name: 'AgentGuardrailModal' }).props('open')).toBe(false);
	});

	it('removes a guardrail through the chip context menu and keeps the budget', async () => {
		const wrapper = mountSection();

		await wrapper.findAll('[data-testid="agent-guardrails-chip-remove"]')[0].trigger('click');

		const updates = wrapper.emitted('update:config')?.[0]?.[0] as AgentJsonConfig;
		expect(updates).toEqual({
			config: {
				guardrails: {
					budget: { enabled: true, monthlyBudgetUsd: 100 },
					tools: [PII_GUARDRAIL],
				},
			},
		});
	});

	it('marks a chip invalid only for its own guardrail issues', () => {
		const wrapper = mountSection({
			validationIssues: [
				issue({ kind: 'guardrail', id: 'pii-nodes' }),
				issue({ kind: 'skill', id: 'keywords-all' }, 'skills[0]'),
			],
		});

		const chips = wrapper.findAllComponents({ name: 'AgentChipButton' });
		expect(chips[0].props('invalid')).toBe(false);
		expect(chips[1].props('invalid')).toBe(true);
		expect(chips[1].props('invalidReasons')).toHaveLength(1);
	});

	it('replaces the edited guardrail by id on modal save', async () => {
		const wrapper = mountSection();

		await wrapper.findAll('[data-testid="agent-guardrails-chip"]')[0].trigger('click');
		const replacement = { ...KEYWORDS_GUARDRAIL, keywords: ['secret', 'token'] };
		wrapper.getComponent({ name: 'AgentGuardrailModal' }).vm.$emit('save', replacement);

		const updates = wrapper.emitted('update:config')?.[0]?.[0] as AgentJsonConfig;
		expect(updates.config?.guardrails?.tools).toEqual([replacement, PII_GUARDRAIL]);
	});

	it('appends a new guardrail on modal save from create mode', async () => {
		const wrapper = mountSection();

		await openAddMenu(wrapper);
		await pickKind('urls');
		const created = { kind: 'urls', id: 'urls-1', stage: 'before' };
		wrapper.getComponent({ name: 'AgentGuardrailModal' }).vm.$emit('save', created);

		const updates = wrapper.emitted('update:config')?.[0]?.[0] as AgentJsonConfig;
		expect(updates.config?.guardrails?.tools).toEqual([KEYWORDS_GUARDRAIL, PII_GUARDRAIL, created]);
	});

	it('removes the editing guardrail on modal remove', async () => {
		const wrapper = mountSection();

		await wrapper.findAll('[data-testid="agent-guardrails-chip"]')[1].trigger('click');
		wrapper.getComponent({ name: 'AgentGuardrailModal' }).vm.$emit('remove');

		const updates = wrapper.emitted('update:config')?.[0]?.[0] as AgentJsonConfig;
		expect(updates.config?.guardrails?.tools).toEqual([KEYWORDS_GUARDRAIL]);
	});

	it('opens Guardrails by default and opens Approval when an approval loads', async () => {
		const wrapper = mountSection({}, '<div data-testid="approval-content">Approval content</div>');
		const guardrails = wrapper.get('[data-testid="agent-guardrails-disclosure"] button');
		const approval = wrapper.get('[data-testid="agent-approval-disclosure"] button');
		const approvalContent = wrapper.get('[data-testid="approval-content"]');

		expect(guardrails.attributes('aria-expanded')).toBe('true');
		expect(approval.attributes('aria-expanded')).toBe('false');
		expect(approvalContent.isVisible()).toBe(false);

		await wrapper.setProps({
			config: {
				...wrapper.props('config')!,
				hitlConfigurations: [
					{ id: 'approval', name: 'Finance check', method: 'workflow', workflowId: 'wf' },
				],
			},
		});
		expect(approval.attributes('aria-expanded')).toBe('true');
		expect(approvalContent.isVisible()).toBe(true);
		expect(guardrails.attributes('aria-expanded')).toBe('true');

		await guardrails.trigger('click');
		expect(wrapper.get('[data-testid="agent-guardrails-add"]').isVisible()).toBe(false);
		expect(approvalContent.isVisible()).toBe(true);

		const budget = wrapper.getComponent({ name: 'AgentBudgetPanel' });
		expect(budget.props('embedded')).toBe(true);
		expect(budget.props('projectId')).toBe('project-1');
		expect(budget.props('agentId')).toBe('agent-1');
		expect(budget.props('disabled')).toBe(false);
		expect(
			approval.element.compareDocumentPosition(budget.element) & Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
	});

	it('forwards a budget save as a budget config update', () => {
		const wrapper = mountSection();

		const changes = { config: { guardrails: { budget: { enabled: true, sessionCostCapUsd: 5 } } } };
		wrapper.getComponent({ name: 'AgentBudgetPanel' }).vm.$emit('update:config', changes);

		expect(wrapper.emitted('update:budget-config')?.[0]).toEqual([changes]);
		expect(wrapper.emitted('update:config')).toBeUndefined();
	});

	it('opens the add menu from the empty-state button when no guardrail exists', async () => {
		const wrapper = mountSection({ config: config() });

		await openAddMenu(wrapper);

		expect(document.querySelector('[role="menu"]')).not.toBeNull();
	});

	it('disables the add menu, chips, and budget for a read-only builder', async () => {
		const wrapper = mountSection({ disabled: true });

		await openAddMenu(wrapper);
		expect(document.querySelector('[role="menu"]')).toBeNull();
		expect(wrapper.getComponent({ name: 'AgentGuardrailModal' }).props('open')).toBe(false);

		await wrapper.findAll('[data-testid="agent-guardrails-chip"]')[0].trigger('click');
		expect(wrapper.getComponent({ name: 'AgentGuardrailModal' }).props('open')).toBe(false);

		expect(wrapper.getComponent({ name: 'AgentBudgetPanel' }).props('disabled')).toBe(true);
	});
});
