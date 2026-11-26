import { parseSkillWorkflowMentions } from '@n8n/api-types';
import { N8nMarkdownEditor, type N8nMarkdownEditorEmits } from '@n8n/design-system';
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent } from 'vue';

import AgentSkillMarkdownEditor from '@/features/agents/components/AgentSkillMarkdownEditor.vue';

type Editor = N8nMarkdownEditorEmits['ready'][0];

const flag = vi.hoisted(() => ({ enabled: true }));
vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: () => ({
		isVariantEnabled: (name: string, variant: string) =>
			name === '152_workflows_in_skills' && variant === (flag.enabled ? 'variant' : 'control'),
	}),
}));

vi.mock('vue-router', () => ({
	useRouter: () => ({
		resolve: ({ params }: { params: { workflowId: string } }) => ({
			href: `/base/workflow/${params.workflowId}`,
		}),
	}),
}));

const handleExternalKeydown = vi.fn((event: KeyboardEvent) => {
	if (event.key !== 'Tab') event.preventDefault();
	return true;
});
const PickerStub = defineComponent({
	name: 'SkillWorkflowMentionPicker',
	props: ['open', 'mode', 'query', 'projectId', 'projectName', 'reference', 'focusTarget'],
	emits: ['update:open', 'select'],
	methods: { handleExternalKeydown },
	template: '<div data-testid="skill-workflow-mention-picker" />',
});

const WORKFLOW = { workflowId: 'wf1', name: 'Weekly report' };

enableAutoUnmount(afterEach);

async function mountEditor(props: Record<string, unknown> = {}) {
	const onUpdate = vi.fn();
	const wrapper = mount(AgentSkillMarkdownEditor, {
		props: { modelValue: 'Intro', 'onUpdate:modelValue': onUpdate, ...props },
		global: { stubs: { SkillWorkflowMentionPicker: PickerStub } },
		attachTo: document.body,
	});
	await vi.waitFor(() =>
		expect(wrapper.findComponent(N8nMarkdownEditor).emitted('ready')).toBeTruthy(),
	);
	const editor = wrapper.findComponent(N8nMarkdownEditor).vm.getEditor();
	if (!editor) throw new Error('The editor did not start');
	editor.view.coordsAtPos = () => ({ left: 0, right: 0, top: 0, bottom: 0 });
	editor.commands.setTextSelection(editor.state.doc.content.size - 1);
	return { wrapper, editor, onUpdate, picker: () => wrapper.findComponent(PickerStub) };
}

function typeText(editor: Editor, text: string) {
	const { view } = editor;
	const { from, to } = view.state.selection;
	const insert = () => view.state.tr.insertText(text, from, to);
	const handled = view.someProp('handleTextInput', (handler) =>
		handler(view, from, to, text, insert),
	);
	if (!handled) view.dispatch(insert());
}

async function typeMentionTrigger(editor: Editor) {
	typeText(editor, ' ');
	typeText(editor, '@');
	await flushPromises();
}

function pressKey(editor: Editor, key: string) {
	const event = new KeyboardEvent('keydown', { key, cancelable: true });
	return editor.view.someProp('handleKeyDown', (handler) => handler(editor.view, event));
}

function clickMention(editor: Editor) {
	const { view } = editor;
	const target = view.dom.querySelector('a[href^="n8n://workflow/"]');
	if (!target) throw new Error('The mention link is missing');
	const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
	Object.defineProperty(event, 'target', { value: target });
	view.someProp('handleClick', (handler) => handler(view, MENTION_START + 1, event));
	return event;
}

const MENTION_BODY = 'Run [Weekly report](n8n://workflow/wf1) now';
const MENTION_START = 5;
const MENTION_END = MENTION_START + 'Weekly report'.length;

describe('AgentSkillMarkdownEditor', () => {
	beforeEach(() => {
		flag.enabled = true;
		handleExternalKeydown.mockClear();
	});

	it('opens the picker at the caret when the user types @ after a space', async () => {
		const { editor, picker } = await mountEditor({
			mentionProjectId: 'p1',
			mentionProjectName: 'Ops',
		});
		editor.view.coordsAtPos = () => ({ left: 120, right: 120, top: 40, bottom: 58 });
		const referenceBeforeOpen = picker().props('reference');

		await typeMentionTrigger(editor);

		expect(picker().props()).toEqual(
			expect.objectContaining({
				open: true,
				mode: 'typed',
				query: '',
				projectId: 'p1',
				projectName: 'Ops',
				focusTarget: editor.view.dom,
			}),
		);
		expect(picker().props('reference')).toBe(referenceBeforeOpen);
		expect(picker().props('reference').getBoundingClientRect()).toEqual(
			new DOMRect(120, 40, 0, 18),
		);
	});

	it('passes the text after @ to the picker as the search query', async () => {
		const { editor, picker } = await mountEditor();
		await typeMentionTrigger(editor);

		typeText(editor, 'wee');
		await flushPromises();

		expect(picker().props('query')).toBe('wee');
	});

	it('replaces the @ and the query with a link to the selected workflow', async () => {
		const { editor, picker, onUpdate } = await mountEditor();
		await typeMentionTrigger(editor);
		typeText(editor, 'wee');
		await flushPromises();

		picker().vm.$emit('select', WORKFLOW);
		picker().vm.$emit('update:open', false);
		await flushPromises();

		const markdown = editor.getMarkdown();
		expect(markdown).toBe('Intro [Weekly report](n8n://workflow/wf1) ');
		expect(parseSkillWorkflowMentions(markdown)).toEqual([WORKFLOW]);
		expect(onUpdate).toHaveBeenLastCalledWith(markdown);
		expect(picker().props('open')).toBe(false);
	});

	it('sends the keys to the picker while it is open', async () => {
		const { editor } = await mountEditor();
		await typeMentionTrigger(editor);

		const event = new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true });
		const handled = editor.view.someProp('handleKeyDown', (handler) => handler(editor.view, event));

		expect(handled).toBe(true);
		expect(handleExternalKeydown).toHaveBeenCalledWith(event);
	});

	it('lets Tab move the focus out of the editor', async () => {
		const { editor } = await mountEditor();
		await typeMentionTrigger(editor);

		const event = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true });
		const handled = editor.view.someProp('handleKeyDown', (handler) => handler(editor.view, event));

		expect(handleExternalKeydown).toHaveBeenCalledWith(event);
		expect(handled).toBeFalsy();
	});

	it('closes the picker when the cursor moves without typing', async () => {
		const { editor, picker } = await mountEditor();
		await typeMentionTrigger(editor);

		editor.commands.setTextSelection(1);
		await flushPromises();

		expect(picker().props('open')).toBe(false);
	});

	it('does not open the picker for @ in inline code', async () => {
		const { editor, picker } = await mountEditor({ modelValue: 'Run `code`' });
		editor.commands.setTextSelection(editor.state.doc.content.size - 2);

		typeText(editor, ' ');
		typeText(editor, '@');
		await flushPromises();

		expect(picker().props('open')).toBe(false);
	});

	it('closes the picker when the user deletes the @', async () => {
		const { editor, picker } = await mountEditor();
		await typeMentionTrigger(editor);

		const { from } = editor.state.selection;
		editor.view.dispatch(editor.state.tr.delete(from - 1, from));
		await flushPromises();

		expect(picker().props('open')).toBe(false);
	});

	it('does not open the picker for @ inside a word', async () => {
		const { editor, picker } = await mountEditor();

		typeText(editor, '@');
		await flushPromises();

		expect(picker().props('open')).toBe(false);
	});

	it('keeps the typed text when the user closes the picker', async () => {
		const { editor, picker } = await mountEditor();
		await typeMentionTrigger(editor);
		typeText(editor, 'we');

		picker().vm.$emit('update:open', false);
		await flushPromises();

		expect(editor.getMarkdown()).toBe('Intro @we');
	});

	it.each([
		['Backspace after', MENTION_END],
		['Delete before', MENTION_START],
	])('removes the whole mention with %s it', async (key, position) => {
		const { editor } = await mountEditor({ modelValue: MENTION_BODY });
		editor.commands.setTextSelection(position);

		expect(pressKey(editor, key.split(' ')[0])).toBe(true);

		expect(editor.getMarkdown()).toBe('Run  now');
	});

	it('removes one letter of a link that is not a workflow mention', async () => {
		const { editor } = await mountEditor({ modelValue: 'Run [Docs](https://example.com) now' });
		editor.commands.setTextSelection(MENTION_START + 'Docs'.length);

		expect(pressKey(editor, 'Backspace')).toBeFalsy();
	});

	it('keeps the mention when the editor is disabled', async () => {
		const { editor } = await mountEditor({ modelValue: MENTION_BODY, disabled: true });
		editor.commands.setTextSelection(MENTION_END);

		expect(pressKey(editor, 'Backspace')).toBeFalsy();
		expect(editor.getMarkdown()).toBe(MENTION_BODY);
	});

	it('keeps the default Backspace when the flag is off', async () => {
		flag.enabled = false;
		const { editor } = await mountEditor({ modelValue: MENTION_BODY });
		editor.commands.setTextSelection(MENTION_END);

		expect(pressKey(editor, 'Backspace')).toBeFalsy();
		expect(editor.getMarkdown()).toBe(MENTION_BODY);
	});

	it('opens the workflow of a clicked mention in a new tab', async () => {
		const open = vi.spyOn(window, 'open').mockReturnValue(null);
		const { editor } = await mountEditor({ modelValue: MENTION_BODY });

		const click = clickMention(editor);

		expect(open).toHaveBeenCalledOnce();
		expect(open).toHaveBeenCalledWith('/base/workflow/wf1', '_blank');
		expect(click.defaultPrevented).toBe(true);
		open.mockRestore();
	});

	it('keeps the default link click for a mention when the flag is off', async () => {
		flag.enabled = false;
		const open = vi.spyOn(window, 'open').mockReturnValue(null);
		const { editor } = await mountEditor({ modelValue: MENTION_BODY });

		clickMention(editor);

		expect(open.mock.calls).toEqual([['n8n://workflow/wf1', '_blank']]);
		open.mockRestore();
	});

	it('leaves the editor unchanged when the flag is off', async () => {
		flag.enabled = false;
		const { wrapper, editor } = await mountEditor();

		await typeMentionTrigger(editor);

		expect(wrapper.findComponent(PickerStub).exists()).toBe(false);
		expect(editor.getMarkdown()).toBe('Intro @');
	});

	it('has no picker when the editor is disabled', async () => {
		const { wrapper } = await mountEditor({ disabled: true });

		expect(wrapper.findComponent(PickerStub).exists()).toBe(false);
	});
});
