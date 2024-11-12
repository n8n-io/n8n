import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import TagsInput from '../EditEvaluation/TagsInput.vue';
import { createTestingPinia } from '@pinia/testing';
import type { ITag } from '@/Interface';

describe('TagsInput', () => {
	const mockTags: ITag[] = [
		{ id: '1', name: 'Tag 1' },
		{ id: '2', name: 'Tag 2' },
		{ id: '3', name: 'Tag 3' },
	];

	const mockTagsById: Record<string, ITag> = {
		'1': mockTags[0],
		'2': mockTags[1],
		'3': mockTags[2],
	};

	const defaultProps = {
		allTags: mockTags,
		tagsById: mockTagsById,
		isLoading: false,
		startEditing: vi.fn(),
		saveChanges: vi.fn(),
		cancelEditing: vi.fn(),
	};

	beforeEach(() => {
		vi.resetAllMocks();
	});

	it('renders correctly with default props', () => {
		const wrapper = mount(TagsInput, {
			props: defaultProps,
			global: {
				plugins: [createTestingPinia()],
			},
		});
		expect(wrapper.exists()).toBe(true);
	});

	it('computes tag name correctly', async () => {
		const wrapper = mount(TagsInput, {
			props: {
				...defaultProps,
				modelValue: {
					isEditing: false,
					appliedTagIds: ['1'],
				},
			},
			global: {
				plugins: [createTestingPinia()],
			},
		});

		const vm = wrapper.vm;
		expect(vm.getTagName('1')).toBe('Tag 1');
		expect(vm.getTagName('4')).toBe('');
	});

	it.only('updates tags correctly', async () => {
		const wrapper = mount(TagsInput, {
			props: {
				...defaultProps,
				'onUpdate:modelValue': async (e) => await wrapper.setProps({ modelValue: e }),
			},
			global: {
				plugins: [createTestingPinia()],
			},
		});

		await wrapper.find('[data-test-id=workflow-tags-dropdown]').setValue('test');

		expect(wrapper.emitted('update:modelValue')).toBeTruthy();
		expect(wrapper.emitted('update:modelValue')![0][0]).toEqual({
			isEditing: false,
			appliedTagIds: ['2'],
		});
	});

	it('clears tags when empty array is passed', async () => {
		const wrapper = mount(TagsInput, {
			props: defaultProps,
			global: {
				plugins: [createTestingPinia()],
			},
		});

		await wrapper.vm.updateTags([]);
		expect(wrapper.emitted('update:modelValue')).toBeTruthy();
		expect(wrapper.emitted('update:modelValue')![0][0]).toEqual({
			isEditing: false,
			appliedTagIds: [],
		});
	});

	it('handles editing state correctly', async () => {
		const wrapper = mount(TagsInput, {
			props: {
				...defaultProps,
				modelValue: {
					isEditing: true,
					appliedTagIds: ['1'],
				},
			},
			global: {
				plugins: [createTestingPinia()],
			},
		});

		expect(wrapper.vm.modelValue.isEditing).toBe(true);
	});
});
