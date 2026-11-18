import type { ToolPolicySelector } from '@n8n/api-types';
import { mount, type VueWrapper } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';

import AgentToolPolicyToolField from '../components/AgentToolPolicyToolField.vue';
import { toolPolicySelectorKey } from '../utils/tool-policy-config';
import type { ToolPickerOption } from '../utils/tool-policy-picker';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string, options?: { interpolate?: Record<string, string | number> }) => {
			const copy: Record<string, string> = {
				'agents.toolPolicy.picker.server.all': 'all tools',
				'agents.toolPolicy.picker.server.some': '{count} of {total} tools',
				'agents.toolPolicy.picker.server.failed': 'Could not load its tools',
				'agents.toolPolicy.picker.selected': '{count} selected',
			};
			const values = options?.interpolate ?? {};
			return (copy[key] ?? key).replace(/\{(\w+)\}/g, (_, name: string) =>
				String(values[name] ?? ''),
			);
		},
	}),
}));

const option = (
	selector: ToolPolicySelector,
	label: string,
	source?: ToolPickerOption['source'],
): ToolPickerOption => ({ key: toolPolicySelectorKey(selector), label, selector, source });

const readsData = option({ kind: 'category', value: 'readsData' }, 'Any tool that reads data', {
	type: 'category',
	category: 'readsData',
});
const sendEmail = option(
	{ kind: 'tool', ref: { type: 'node', name: 'Send Email' } },
	'Send Email',
	{ type: 'node', name: 'Send Email' },
);
const crm = option({ kind: 'tool', ref: { type: 'mcpServer', name: 'crm' } }, 'crm (MCP server)', {
	type: 'mcpServer',
	name: 'crm',
});
const crmTool = (tool: string) =>
	option(
		{ kind: 'tool', ref: { type: 'mcpServer', name: 'crm', tool } },
		`${tool} (crm MCP tool)`,
		{ type: 'mcpTool', server: 'crm', tool },
	);
const getContact = crmTool('get_contact');
const sendMail = crmTool('send_mail');
const options = [readsData, sendEmail, crm, getContact, sendMail];

// The popover renders its content in a teleport when it is open. The stub shows both parts.
const stubs = {
	N8nPopover: {
		name: 'N8nPopover',
		template: '<div><slot name="trigger" /><slot name="content" /></div>',
	},
};

function render(modelValue: string[], props: Record<string, unknown> = {}) {
	return mount(AgentToolPolicyToolField, {
		props: { modelValue, options, ...props },
		global: { stubs },
	});
}

/** `text()` joins the parts of a row without the gap that the layout shows between them. */
const texts = (wrapper: VueWrapper, testId: string) =>
	wrapper.findAll(`[data-testid="${testId}"]`).map((row) => row.text().replace(/\s+/g, ' '));

/** Clicks the checkbox of the row with this text. */
async function check(wrapper: VueWrapper, testId: string, text: string) {
	const row = wrapper
		.findAll(`[data-testid="${testId}"]`)
		.find((candidate) => candidate.text().includes(text));
	await row?.find('button[role="checkbox"]').trigger('click');
}

const lastKeys = (wrapper: VueWrapper) =>
	wrapper.emitted<[string[]]>('update:modelValue')?.at(-1)?.[0];

describe('AgentToolPolicyToolField', () => {
	describe('chips', () => {
		it('shows one chip for the tools of a server, with how many are selected', () => {
			const wrapper = render([sendEmail.key, sendMail.key]);

			expect(texts(wrapper, 'agent-tool-policy-chip')).toEqual(['Send Email', 'crm· 1 of 2 tools']);
		});

		it('shows a whole server as all tools', () => {
			expect(texts(render([crm.key]), 'agent-tool-policy-chip')).toEqual(['crm· all tools']);
		});

		it('removes every selection that a chip stands for', async () => {
			const wrapper = render([sendEmail.key, getContact.key, sendMail.key]);

			await wrapper.findAll('[data-testid="agent-tool-policy-chip-remove"]')[1].trigger('click');

			expect(lastKeys(wrapper)).toEqual([sendEmail.key]);
		});

		it('has no remove control when disabled', () => {
			const wrapper = render([sendEmail.key], { disabled: true });

			expect(wrapper.find('[data-testid="agent-tool-policy-chip-remove"]').exists()).toBe(false);
		});
	});

	describe('picker', () => {
		it('shows the tools of a server under the server, by their own name', async () => {
			const wrapper = render([sendMail.key]);

			// A server with some of its tools selected is open.
			expect(texts(wrapper, 'agent-tool-policy-picker-option')).toEqual([
				'Any tool that reads data',
				'Send Email',
				'get_contact',
				'send_mail',
			]);
			expect(texts(wrapper, 'agent-tool-policy-picker-server')).toEqual(['crm1 of 2 tools']);

			await wrapper.find('[data-testid="agent-tool-policy-picker-server-toggle"]').trigger('click');
			expect(texts(wrapper, 'agent-tool-policy-picker-option')).toEqual([
				'Any tool that reads data',
				'Send Email',
			]);
		});

		it('selects and clears a plain option', async () => {
			const wrapper = render([readsData.key]);

			await check(wrapper, 'agent-tool-policy-picker-option', 'Send Email');
			expect(lastKeys(wrapper)).toEqual([readsData.key, sendEmail.key]);

			await check(wrapper, 'agent-tool-policy-picker-option', 'Any tool that reads data');
			expect(lastKeys(wrapper)).toEqual([]);
		});

		it('selects a whole server in place of its tools', async () => {
			const wrapper = render([sendMail.key]);

			await check(wrapper, 'agent-tool-policy-picker-server', 'crm');

			expect(lastKeys(wrapper)).toEqual([crm.key]);
		});

		it('leaves the other tools when one tool is taken out of a whole server', async () => {
			const wrapper = render([crm.key]);
			await wrapper.find('[data-testid="agent-tool-policy-picker-server-toggle"]').trigger('click');

			await check(wrapper, 'agent-tool-policy-picker-option', 'send_mail');

			expect(lastKeys(wrapper)).toEqual([getContact.key]);
		});

		it('filters by the search text and opens the servers that match', async () => {
			const wrapper = render([]);

			wrapper.findComponent({ name: 'N8nInput' }).vm.$emit('update:modelValue', 'mail');
			await nextTick();

			expect(texts(wrapper, 'agent-tool-policy-picker-option')).toEqual([
				'Send Email',
				'send_mail',
			]);
			expect(texts(wrapper, 'agent-tool-policy-picker-server')).toHaveLength(1);
		});

		it('says so when no tool matches the search', async () => {
			const wrapper = render([]);

			wrapper.findComponent({ name: 'N8nInput' }).vm.$emit('update:modelValue', 'nothing');
			await nextTick();

			expect(wrapper.find('[data-testid="agent-tool-policy-picker-empty"]').exists()).toBe(true);
		});

		it('says that the tools of a server did not load, and asks for them again', async () => {
			const wrapper = mount(AgentToolPolicyToolField, {
				props: { modelValue: [], options: [crm], serverStates: { crm: 'failed' } },
				global: { stubs },
			});

			expect(texts(wrapper, 'agent-tool-policy-picker-server')[0]).toContain(
				'Could not load its tools',
			);
			await wrapper.find('[data-testid="agent-tool-policy-picker-server-retry"]').trigger('click');

			expect(wrapper.emitted('retry')).toEqual([['crm']]);
		});

		it('clears the selection', async () => {
			const wrapper = render([sendEmail.key, crm.key]);

			await wrapper.find('[data-testid="agent-tool-policy-picker-clear"]').trigger('click');

			expect(lastKeys(wrapper)).toEqual([]);
		});

		it('does not change the selection when disabled', async () => {
			const wrapper = render([sendEmail.key], { disabled: true });

			await check(wrapper, 'agent-tool-policy-picker-option', 'Any tool that reads data');

			expect(wrapper.emitted('update:modelValue')).toBeUndefined();
		});
	});
});
