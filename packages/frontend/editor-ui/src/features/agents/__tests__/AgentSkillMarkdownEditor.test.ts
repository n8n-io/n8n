import { parseSkillWorkflowMentions } from '@n8n/api-types';
import { N8nMarkdownEditor, type N8nMarkdownEditorEmits } from '@n8n/design-system';
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent } from 'vue';

import AgentSkillMarkdownEditor from '@/features/agents/components/AgentSkillMarkdownEditor.vue';

type Editor = N8nMarkdownEditorEmits['ready'][0];

const flag = vi.hoisted(() => ({ enabled: true }));
vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: () => ({ isFeatureEnabled: () => flag.enabled }),
}));

const handleExternalKeydown = vi.fn(() => true);
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

		const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
		const handled = editor.view.someProp('handleKeyDown', (handler) => handler(editor.view, event));

		expect(handled).toBe(true);
		expect(handleExternalKeydown).toHaveBeenCalledWith(event);
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
