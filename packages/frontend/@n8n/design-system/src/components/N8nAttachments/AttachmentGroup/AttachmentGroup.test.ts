import { render, screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { mount } from '@vue/test-utils';
import { h, nextTick, ref } from 'vue';

import N8nAttachment from '../Attachment/Attachment.vue';

import N8nAttachmentGroup from './AttachmentGroup.vue';

describe('N8nAttachmentGroup', function describeComponent() {
	it('focuses the first attachment and restores focus on Escape after repeated calls', async () => {
		const origin = document.createElement('button');
		document.body.append(origin);
		origin.focus();
		const wrapper = mount(N8nAttachmentGroup, {
			attachTo: document.body,
			slots: {
				default:
					'<div><a class="n8n-attachment" href="#first">First</a></div><div><a href="#second">Second</a></div>',
			},
		});

		try {
			wrapper.vm.focus();
			expect(document.activeElement).toBe(wrapper.get('a').element);
			wrapper.vm.focus();
			await wrapper.get('a').trigger('keydown', { key: 'Escape' });
			expect(document.activeElement).toBe(origin);
		} finally {
			wrapper.unmount();
			origin.remove();
		}
	});

	it('focuses a non-link attachment instead of its remove button', () => {
		const wrapper = mount(N8nAttachmentGroup, {
			attachTo: document.body,
			slots: {
				default: '<div><figure class="n8n-attachment">File</figure><button>Remove</button></div>',
			},
		});

		try {
			wrapper.vm.focus();
			expect(document.activeElement).toBe(wrapper.get('figure').element);
			expect(wrapper.get('figure').attributes('tabindex')).toBe('0');
		} finally {
			wrapper.unmount();
		}
	});

	it('enters non-removable attachments with Tab and navigates with arrow keys', async () => {
		const user = userEvent.setup();
		const origin = document.createElement('button');
		document.body.append(origin);
		origin.focus();
		const wrapper = mount(N8nAttachmentGroup, {
			attachTo: document.body,
			slots: {
				default: () => [
					h(N8nAttachment, {
						fileName: 'first.pdf',
						mimeType: 'application/pdf',
						isRemovable: false,
					}),
					h(N8nAttachment, {
						fileName: 'second.pdf',
						mimeType: 'application/pdf',
						isRemovable: false,
					}),
				],
			},
		});

		try {
			const [first, second] = wrapper.findAll('.n8n-attachment');
			await user.tab();
			expect(document.activeElement).toBe(first.element);
			await user.keyboard('{ArrowRight}');
			expect(document.activeElement).toBe(second.element);
		} finally {
			wrapper.unmount();
			origin.remove();
		}
	});

	it('sets the tab stop when attachments arrive after mount', async () => {
		const files = ref<string[]>([]);
		const wrapper = mount(N8nAttachmentGroup, {
			slots: {
				default: () =>
					files.value.map((fileName) =>
						h(N8nAttachment, {
							key: fileName,
							fileName,
							mimeType: 'application/pdf',
							isRemovable: false,
						}),
					),
			},
		});
		try {
			files.value = ['first.pdf', 'second.pdf'];
			await nextTick();
			const [first, second] = wrapper.findAll('.n8n-attachment');
			expect(first.attributes('tabindex')).toBe('0');
			expect(second.attributes('tabindex')).toBe('-1');
			files.value = ['second.pdf'];
			await nextTick();
			expect(wrapper.get('.n8n-attachment').attributes('tabindex')).toBe('0');
		} finally {
			wrapper.unmount();
		}
	});

	it('moves the tab stop with Left and Right and stops at the ends', async () => {
		const wrapper = mount(N8nAttachmentGroup, {
			attachTo: document.body,
			slots: {
				default: '<a href="#first">First</a><a href="#second">Second</a>',
			},
		});

		try {
			const [first, second] = wrapper.findAll('a');
			wrapper.vm.focus();
			expect(first.attributes('tabindex')).toBe('0');
			expect(second.attributes('tabindex')).toBe('-1');

			await first.trigger('keydown', { key: 'ArrowLeft' });
			expect(document.activeElement).toBe(first.element);
			await first.trigger('keydown', { key: 'ArrowRight' });
			expect(document.activeElement).toBe(second.element);
			expect(first.attributes('tabindex')).toBe('-1');
			expect(second.attributes('tabindex')).toBe('0');

			await second.trigger('keydown', { key: 'ArrowRight' });
			expect(document.activeElement).toBe(second.element);
			await second.trigger('keydown', { key: 'ArrowLeft' });
			expect(document.activeElement).toBe(first.element);
		} finally {
			wrapper.unmount();
		}
	});

	it('removes attachments with Backspace and moves focus to the next item or origin', async () => {
		const origin = document.createElement('textarea');
		document.body.append(origin);
		origin.focus();
		const wrapper = mount(N8nAttachmentGroup, {
			attachTo: document.body,
			slots: {
				default: () => [
					h(N8nAttachment, { fileName: 'first.pdf', mimeType: 'application/pdf' }),
					h(N8nAttachment, { fileName: 'second.pdf', mimeType: 'application/pdf' }),
				],
			},
		});

		try {
			const [first, second] = wrapper.findAll('.n8n-attachment');
			wrapper.vm.focus();
			await first.trigger('keydown', { key: 'Backspace' });
			await nextTick();
			expect(first.attributes('aria-hidden')).toBe('true');
			expect(document.activeElement).toBe(second.element);

			await second.trigger('keydown', { key: 'Backspace' });
			await nextTick();
			expect(second.attributes('aria-hidden')).toBe('true');
			expect(document.activeElement).toBe(origin);
		} finally {
			wrapper.unmount();
			origin.remove();
		}
	});

	it('focuses the previous item when removing the last item', async () => {
		const origin = document.createElement('textarea');
		document.body.append(origin);
		origin.focus();
		const wrapper = mount(N8nAttachmentGroup, {
			attachTo: document.body,
			slots: {
				default: () => [
					h(N8nAttachment, { fileName: 'first.pdf', mimeType: 'application/pdf' }),
					h(N8nAttachment, { fileName: 'second.pdf', mimeType: 'application/pdf' }),
				],
			},
		});

		try {
			const [first, second] = wrapper.findAll('.n8n-attachment');
			wrapper.vm.focus();
			await first.trigger('keydown', { key: 'ArrowRight' });
			await second.trigger('keydown', { key: 'Backspace' });
			await nextTick();

			expect(second.attributes('aria-hidden')).toBe('true');
			expect(first.attributes('aria-hidden')).toBeUndefined();
			expect(first.attributes('tabindex')).toBe('0');
			expect(document.activeElement).toBe(first.element);
			await first.trigger('keydown', { key: 'Escape' });
			expect(document.activeElement).toBe(origin);
		} finally {
			wrapper.unmount();
			origin.remove();
		}
	});

	it('does nothing when the group is empty', () => {
		const wrapper = mount(N8nAttachmentGroup);
		const activeElement = document.activeElement;

		wrapper.vm.focus();

		expect(document.activeElement).toBe(activeElement);
		wrapper.unmount();
	});
	it('renders the default slot', function testContent() {
		render(N8nAttachmentGroup, {
			slots: { default: 'example.pdf' },
		});

		expect(screen.getByText('example.pdf')).toBeVisible();
	});
});
