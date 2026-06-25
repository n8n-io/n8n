/* eslint-disable import-x/no-extraneous-dependencies -- test-only patterns */
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';

import AgentVersionStatusIndicator from '../components/VersionHistory/AgentVersionStatusIndicator.vue';

describe('AgentVersionStatusIndicator', () => {
	it('renders with the published modifier class when status="published"', () => {
		const wrapper = mount(AgentVersionStatusIndicator, {
			props: { status: 'published' },
		});

		const span = wrapper.find('span');
		expect(span.classes().join(' ')).toMatch(/indicator-published/);
	});

	it('renders with the default modifier class when no status is supplied', () => {
		const wrapper = mount(AgentVersionStatusIndicator);

		const span = wrapper.find('span');
		expect(span.classes().join(' ')).toMatch(/indicator-default/);
	});

	it('renders with the default modifier class when status="default"', () => {
		const wrapper = mount(AgentVersionStatusIndicator, {
			props: { status: 'default' },
		});

		const span = wrapper.find('span');
		expect(span.classes().join(' ')).toMatch(/indicator-default/);
	});
});
