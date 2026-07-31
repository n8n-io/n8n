import { createTestingPinia } from '@pinia/testing';
import { mount } from '@vue/test-utils';
import { defineComponent, nextTick } from 'vue';
import { describe, expect, it, vi } from 'vitest';

import AgentExpressionAwareMarkdownEditor from '../components/AgentExpressionAwareMarkdownEditor.vue';
import AgentExpressionInput from '../components/AgentExpressionInput.vue';

const { completionStatusMock } = vi.hoisted(() => ({ completionStatusMock: vi.fn() }));

vi.mock('@codemirror/autocomplete', async (importOriginal) => ({
	...(await importOriginal<typeof import('@codemirror/autocomplete')>()),
	completionStatus: completionStatusMock,
}));

const expressionFocus = vi.fn();

const ExpressionInputStub = defineComponent({
	name: 'AgentExpressionInput',
	props: ['modelValue', 'readonly', 'containerClass'],
	setup(_, { expose }) {
		expose({ focus: expressionFocus });
		return {};
	},
	template: '<div />',
});

const MarkdownEditorStub = defineComponent({
	name: 'MarkdownEditor',
	props: ['modelValue'],
	emits: ['update:modelValue'],
	template: '<div />',
});

const InlineExpressionEditorInputStub = defineComponent({
	name: 'InlineExpressionEditorInput',
	props: ['modelValue', 'additionalData'],
	emits: ['update:modelValue'],
	setup(_, { expose }) {
		expose({
			editor: { state: { doc: { toString: () => '{{ $vars.latest }}' } } },
			focus: vi.fn(),
		});
	},
	template: '<div />',
});

function mountAwareEditor(
	modelValue: string,
	props: { readonly?: boolean; containerClass?: string } = {},
) {
	return mount(AgentExpressionAwareMarkdownEditor, {
		props: { modelValue, ...props },
		global: {
			stubs: {
				AgentExpressionInput: ExpressionInputStub,
				N8nMarkdownEditor: MarkdownEditorStub,
				MarkdownEditor: MarkdownEditorStub,
			},
		},
	});
}

describe('AgentExpressionAwareMarkdownEditor', () => {
	it('keeps ordinary instructions in the Markdown editor and forwards updates', () => {
		const wrapper = mountAwareEditor('# Role\nHelp users.');
		const markdown = wrapper.findComponent(MarkdownEditorStub);

		expect(markdown.props('modelValue')).toBe('# Role\nHelp users.');
		markdown.vm.$emit('update:modelValue', '# Role\nBe concise.');

		expect(wrapper.emitted('update:modelValue')).toEqual([['# Role\nBe concise.']]);
	});

	it('switches at a leading equals sign and preserves focus', async () => {
		expressionFocus.mockClear();
		const wrapper = mountAwareEditor('', { readonly: true, containerClass: 'fill-height' });

		wrapper.findComponent(MarkdownEditorStub).vm.$emit('update:modelValue', '=');
		await nextTick();

		expect(wrapper.findComponent(ExpressionInputStub).props()).toMatchObject({
			modelValue: '=',
			readonly: true,
			containerClass: 'fill-height',
		});
		expect(expressionFocus).toHaveBeenCalledOnce();
	});
});

describe('AgentExpressionInput', () => {
	it('adapts raw values and submits the current document after completion closes', async () => {
		completionStatusMock.mockReturnValue(null);
		const wrapper = mount(AgentExpressionInput, {
			props: { modelValue: '={{ $vars.team }}', submitOnEnter: true },
			global: {
				plugins: [createTestingPinia()],
				stubs: { InlineExpressionEditorInput: InlineExpressionEditorInputStub },
			},
		});
		const inline = wrapper.findComponent(InlineExpressionEditorInputStub);

		expect(inline.props('modelValue')).toBe('{{ $vars.team }}');
		expect(inline.props('additionalData')).toHaveProperty('$vars');

		inline.vm.$emit('update:modelValue', {
			value: '={{ $vars.department }}',
			segments: [],
		});

		expect(wrapper.emitted('update:modelValue')).toEqual([['={{ $vars.department }}']]);

		await inline.trigger('keydown', { key: 'Enter' });
		expect(wrapper.emitted('submit')).toEqual([['={{ $vars.latest }}']]);

		completionStatusMock.mockReturnValue('active');
		await inline.trigger('keydown', { key: 'Enter' });
		expect(wrapper.emitted('submit')).toHaveLength(1);
	});
});
