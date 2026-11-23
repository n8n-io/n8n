import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { mount } from '@vue/test-utils';
import type { AgentConfigValidationIssue } from '@n8n/api-types';

import AgentToolGuardrailsSection from '../components/AgentToolGuardrailsSection.vue';
import type { AgentJsonToolRef } from '../types';

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
				'agents.builder.guardrails.title': 'Guardrails',
				'agents.builder.guardrails.description': 'Checks on what tools receive and return.',
				'agents.builder.guardrails.add': 'Add guardrail',
				'agents.builder.guardrails.chip.allTools': 'All tools',
				'agents.builder.guardrails.kind.keywords': 'Blocked keywords',
				'agents.builder.guardrails.kind.nsfw': 'NSFW detection',
				'agents.builder.guardrails.kind.jailbreak': 'Jailbreak detection',
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

const TOOL: AgentJsonToolRef = {
	type: 'node',
	name: 'HTTP Request',
	node: {
		nodeType: 'n8n-nodes-base.httpRequest',
		nodeTypeVersion: 4.2,
		nodeParameters: { url: 'https://api.example.com' },
	},
} as AgentJsonToolRef;

const WORKFLOW_TOOL: AgentJsonToolRef = {
	type: 'workflow',
	workflow: 'Sync customers',
	workflowId: 'wf-1',
} as AgentJsonToolRef;

const NAMED_GUARDRAIL = {
	kind: 'keywords',
	id: 'g-named',
	name: 'Block secrets',
	stage: 'before',
	keywords: ['secret'],
	tools: [
		{ type: 'node', name: 'HTTP Request' },
		{ type: 'node', name: 'Gmail' },
	],
} as const;

const OTHER_TOOL_GUARDRAIL = {
	kind: 'keywords',
	id: 'g-other-tool',
	name: 'Not this tool',
	stage: 'before',
	keywords: ['x'],
	tools: [{ type: 'node', name: 'Slack' }],
} as const;

const OTHER_WORKFLOW_GUARDRAIL = {
	kind: 'keywords',
	id: 'g-other-workflow',
	name: 'Other workflow',
	stage: 'before',
	keywords: ['x'],
	tools: [{ type: 'workflow', workflowId: 'wf-9' }],
} as const;

const WILDCARD_GUARDRAIL = {
	kind: 'nsfw',
	id: 'g-wildcard',
	name: 'Global check',
	stage: 'before',
} as const;

function agentTools(): AgentJsonToolRef[] {
	return [TOOL, WORKFLOW_TOOL];
}

/** Every mounted section, so the portaled add menus tear down between tests. */
const mountedSections: Array<ReturnType<typeof mount>> = [];

function guardrailsFor(): Array<Record<string, unknown>> {
	return [NAMED_GUARDRAIL, OTHER_TOOL_GUARDRAIL, OTHER_WORKFLOW_GUARDRAIL, WILDCARD_GUARDRAIL];
}

function mountSection(
	overrides: Partial<{
		toolRef: AgentJsonToolRef;
		guardrails: Array<Record<string, unknown>>;
		validationIssues: AgentConfigValidationIssue[];
		disabled: boolean;
	}> = {},
) {
	const guardrails = overrides.guardrails ?? guardrailsFor();
	// Narrow once so the optional prop's getter never returns undefined.
	const issueList = overrides.validationIssues;
	const onUpdateGuardrails = vi.fn((tools: Array<Record<string, unknown>>) => {
		// Keep the list live, as the host's config write does.
		guardrails.splice(0, guardrails.length, ...tools);
	});
	const wrapper = mount(AgentToolGuardrailsSection, {
		attachTo: document.body,
		props: {
			toolRef: overrides.toolRef ?? TOOL,
			getGuardrails: () => guardrails as never,
			getTools: () => agentTools(),
			onUpdateGuardrails: onUpdateGuardrails as never,
			...(issueList ? { validationIssues: () => issueList } : {}),
			disabled: () => overrides.disabled ?? false,
		},
	});
	mountedSections.push(wrapper);
	return { wrapper, onUpdateGuardrails };
}

/** Opens the add menu with a real pointer sequence, as a click does in the app. */
async function openAddMenu(wrapper: ReturnType<typeof mountSection>['wrapper']) {
	await userEvent.click(wrapper.get('[data-testid="agent-tool-guardrails-add"]').element);
}

/** The portaled menu item for a kind, once the add menu is open. */
function addMenuItem(kind: string): HTMLElement | null {
	return document.querySelector<HTMLElement>(`[data-test-id="agent-tool-guardrails-add-${kind}"]`);
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

afterEach(() => {
	for (const wrapper of mountedSections.splice(0)) wrapper.unmount();
	document.body.innerHTML = '';
});

describe('AgentToolGuardrailsSection', () => {
	it('shows only the guardrails that name this tool, then wildcards', () => {
		const { wrapper } = mountSection();

		const named = wrapper.findAll('[data-testid="agent-tool-guardrails-chip"]');
		const wildcards = wrapper.findAll('[data-testid="agent-tool-guardrails-wildcard-chip"]');
		expect(named).toHaveLength(1);
		expect(wildcards).toHaveLength(1);
		expect(named[0].text()).toContain('Block secrets');
		expect(wildcards[0].text()).toContain('Global check');
		expect(wildcards[0].text()).toContain('All tools');
		// The named chip is not a wildcard: no globe icon chip text claims all tools.
		expect(named[0].text()).not.toContain('All tools');
		// The named chip stays before the wildcard chip in the box.
		expect(
			named[0].element.compareDocumentPosition(wildcards[0].element) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
	});

	it('matches a workflow tool by its workflow id', () => {
		const { wrapper } = mountSection({ toolRef: WORKFLOW_TOOL });

		const named = wrapper.findAll('[data-testid="agent-tool-guardrails-chip"]');
		expect(named).toHaveLength(0);
		// The workflow-targeting guardrail targets wf-9, not wf-1: only the wildcard remains.
		expect(wrapper.findAll('[data-testid="agent-tool-guardrails-wildcard-chip"]')).toHaveLength(1);
	});

	it('renders the heading copy', () => {
		const { wrapper } = mountSection();

		expect(wrapper.find('[data-testid="agent-tool-guardrails-section"]').text()).toContain(
			'Guardrails',
		);
		expect(wrapper.find('[data-testid="agent-tool-guardrails-section"]').text()).toContain(
			'Checks on what tools receive and return.',
		);
	});

	it('renders the chips enabled and emits an edit request on chip click', async () => {
		const { wrapper } = mountSection();

		const chips = wrapper.findAllComponents({ name: 'AgentChipButton' });
		expect(chips[0].props('disabled')).toBe(false);
		expect(chips[1].props('disabled')).toBe(false);

		await wrapper.get('[data-testid="agent-tool-guardrails-chip"]').trigger('click');
		expect(wrapper.emitted('open-guardrail')).toEqual([[{ guardrail: NAMED_GUARDRAIL }]]);

		await wrapper.get('[data-testid="agent-tool-guardrails-wildcard-chip"]').trigger('click');
		expect(wrapper.emitted('open-guardrail')?.at(-1)).toEqual([{ guardrail: WILDCARD_GUARDRAIL }]);
	});

	it('disables the chips and the add menu when the user has no write access', async () => {
		const { wrapper } = mountSection({ disabled: true });

		const chips = wrapper.findAllComponents({ name: 'AgentChipButton' });
		expect(chips[0].props('disabled')).toBe(true);
		expect(chips[1].props('disabled')).toBe(true);
		expect(wrapper.get('[data-testid="agent-tool-guardrails-add"]').attributes('disabled')).toBe(
			'',
		);

		// jsdom fires listeners on disabled buttons, so the handlers must guard too.
		await wrapper.get('[data-testid="agent-tool-guardrails-chip"]').trigger('click');
		await wrapper.get('[data-testid="agent-tool-guardrails-wildcard-chip"]').trigger('click');
		expect(wrapper.emitted('open-guardrail')).toBeUndefined();
	});

	it('emits a create request with the picked kind and no guardrail', async () => {
		const { wrapper } = mountSection();

		await openAddMenu(wrapper);
		await pickKind('jailbreak');

		expect(wrapper.emitted('open-guardrail')).toEqual([[{ guardrail: null, kind: 'jailbreak' }]]);
	});

	it('marks a chip invalid only for its own guardrail issues', () => {
		const { wrapper } = mountSection({
			validationIssues: [
				issue({ kind: 'guardrail', id: 'g-named' }),
				issue({ kind: 'tool', id: 'g-named' }, 'tools[0].node.nodeParameters.url'),
			],
		});

		const chips = wrapper.findAllComponents({ name: 'AgentChipButton' });
		expect(chips[0].props('invalid')).toBe(true);
		expect(chips[0].props('invalidReasons')).toHaveLength(1);
		expect(chips[1].props('invalid')).toBe(false);
	});

	it('emits nothing until a chip is clicked or a kind is picked', () => {
		const { wrapper } = mountSection();

		expect(wrapper.emitted('open-guardrail')).toBeUndefined();
	});
});
