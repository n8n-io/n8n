import { fireEvent, waitFor } from '@testing-library/vue';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';

import N8nChatInput from './ChatInput.vue';
import { textToDoc } from './chatInputTokens';

const WORKFLOW = '[@Orders](n8n-resource://workflow/1)';

async function mountTokenInput(modelValue = '', trigger = true) {
	const wrapper = mount(N8nChatInput, {
		props: {
			modelValue,
			tokens: { trigger, icon: () => 'workflow' },
			'onUpdate:modelValue': async (value: string) => await wrapper.setProps({ modelValue: value }),
		},
		global: { stubs: { N8nTooltip: { template: '<div><slot /></div>' } } },
		attachTo: document.body,
	});
	await waitFor(() => expect(wrapper.vm.getEditorElement()).toBeDefined());
	// The editor finishes its setup, such as the caret position, on the next task.
	await new Promise((resolve) => setTimeout(resolve, 0));
	return wrapper;
}

function queries(wrapper: Awaited<ReturnType<typeof mountTokenInput>>) {
	return (wrapper.emitted('token-query') ?? []).map(([query]) => query);
}

function lastModelValue(wrapper: Awaited<ReturnType<typeof mountTokenInput>>) {
	const updates = wrapper.emitted('update:modelValue') ?? [];
	return updates[updates.length - 1]?.[0];
}

describe('N8nChatInput with tokens', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	it('turns each line into a paragraph with inline tokens', () => {
		const doc = textToDoc(`Fix ${WORKFLOW} and\n[@Bot](n8n-resource://agent/2) please`);
		expect(doc.content).toHaveLength(2);
		expect(doc.content?.[0].content?.[1]).toEqual({
			type: 'chatToken',
			attrs: { label: 'Orders', href: 'n8n-resource://workflow/1' },
		});
	});

	it('keeps lines, empty lines and tokens through the editor', async () => {
		const text = `One ${WORKFLOW}\n\nTwo`;
		const wrapper = await mountTokenInput(text);
		wrapper.vm.getTokenEditor()?.insertText('!');
		await nextTick();
		expect(lastModelValue(wrapper)).toBe(`${text}!`);
		wrapper.unmount();
	});

	it('shows the tokens of the value as chips', async () => {
		const wrapper = await mountTokenInput(`Fix ${WORKFLOW} now`);
		await waitFor(() => expect(wrapper.find('[data-test-id="chat-token"]').exists()).toBe(true));
		expect(wrapper.find('[data-test-id="chat-token"]').text()).toBe('Orders');
		expect(wrapper.find('textarea').exists()).toBe(false);
		wrapper.unmount();
	});

	it('reports the query after a typed @ and replaces it with the picked token', async () => {
		const wrapper = await mountTokenInput('Fix ');
		const tokenEditor = wrapper.vm.getTokenEditor();
		tokenEditor?.insertText('@Ord');
		await nextTick();
		expect(queries(wrapper).at(-1)).toBe('Ord');

		tokenEditor?.insertToken({ label: 'Orders', href: 'n8n-resource://workflow/1' });
		await nextTick();
		expect(lastModelValue(wrapper)).toBe(`Fix ${WORKFLOW} `);
		wrapper.unmount();
	});

	it('does not report an @ inside a word', async () => {
		const wrapper = await mountTokenInput('');
		wrapper.vm.getTokenEditor()?.insertText('me@example');
		await nextTick();
		expect(wrapper.emitted('token-query')).toBeUndefined();
		wrapper.unmount();
	});

	it('reports a deleted trigger', async () => {
		const wrapper = await mountTokenInput('');
		const tokenEditor = wrapper.vm.getTokenEditor();
		tokenEditor?.insertText('@');
		await nextTick();
		expect(tokenEditor?.removeEmptyTrigger()).toBe(true);
		await nextTick();
		expect(lastModelValue(wrapper)).toBe('');
		wrapper.unmount();
	});

	it('does not reopen a dismissed trigger', async () => {
		const wrapper = await mountTokenInput('');
		const tokenEditor = wrapper.vm.getTokenEditor();
		tokenEditor?.insertText('@Or');
		await nextTick();
		tokenEditor?.dismissTrigger();
		tokenEditor?.insertText('d');
		await nextTick();
		expect(queries(wrapper)).toEqual(['Or']);
		wrapper.unmount();
	});

	it('reports no query while the trigger is off', async () => {
		const wrapper = await mountTokenInput('', false);
		wrapper.vm.getTokenEditor()?.insertText('@Ord');
		await nextTick();
		expect(wrapper.emitted('token-query')).toBeUndefined();
		wrapper.unmount();
	});

	it('submits on Enter', async () => {
		const wrapper = await mountTokenInput(`Fix ${WORKFLOW}`);
		const element = wrapper.vm.getEditorElement();
		if (!element) throw new Error('No editor');
		await fireEvent.keyDown(element, { key: 'Enter' });
		expect(wrapper.emitted('submit')).toHaveLength(1);
		wrapper.unmount();
	});

	it('replaces the content when the value changes from outside', async () => {
		const wrapper = await mountTokenInput('Draft');
		await wrapper.setProps({ modelValue: `Fix ${WORKFLOW}` });
		await waitFor(() => expect(wrapper.find('[data-test-id="chat-token"]').exists()).toBe(true));
		await wrapper.setProps({ modelValue: '' });
		await waitFor(() => expect(wrapper.find('[data-test-id="chat-token"]').exists()).toBe(false));
		wrapper.unmount();
	});
});
