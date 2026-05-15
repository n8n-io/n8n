/* eslint-disable import-x/no-extraneous-dependencies -- test-only pattern */
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import ApprovalCard from '../components/interactive/ApprovalCard.vue';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

const stubs = {
	N8nButton: { template: '<button><slot /></button>' },
	N8nCard: { template: '<section><slot /></section>' },
	N8nIcon: { template: '<span />' },
	N8nText: { template: '<span><slot /></span>' },
};

describe('ApprovalCard', () => {
	it('shows browser action previews', () => {
		const wrapper = mount(ApprovalCard, {
			props: {
				input: {
					type: 'approval',
					toolName: 'browser_type',
					args: { element: { ref: 'e1' }, text: 'hello' },
					resources: [
						{
							toolGroup: 'browser',
							resource: 'example.com',
							description: 'Browser: example.com',
							preview: {
								kind: 'text',
								title: 'Preview action: browser_type',
								content: 'Type into ref: e1:\nhello',
							},
						},
					],
				},
			},
			global: { stubs },
		});

		expect(wrapper.text()).toContain('Preview action: browser_type');
		expect(wrapper.text()).toContain('Type into ref: e1:');
		expect(wrapper.text()).toContain('hello');
	});
});
