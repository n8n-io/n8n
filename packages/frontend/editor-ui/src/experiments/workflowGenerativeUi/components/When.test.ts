import { describe, expect, it } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import When from './When.vue';

const renderComponent = createComponentRenderer(When, {
	props: {
		kind: 'schedule',
		summary: 'Every five minutes',
		app: null,
		nodeId: 'node-1',
	},
	global: {
		stubs: {
			NodeBrand: true,
		},
	},
});

describe('When', () => {
	it('keeps the trigger kind readable when an app takes the title', () => {
		const { getByText } = renderComponent({
			props: { kind: 'appEvent', app: 'Slack', summary: 'When someone posts in #incidents' },
		});

		expect(getByText('App event trigger')).toBeInTheDocument();
		expect(getByText('Slack')).toBeInTheDocument();
		expect(getByText('When someone posts in #incidents')).toBeInTheDocument();
	});

	it('falls back to the trigger kind as the title when there is no app', () => {
		const { getByText } = renderComponent();

		expect(getByText('Schedule trigger')).toBeInTheDocument();
		expect(getByText('Schedule')).toBeInTheDocument();
		expect(getByText('Every five minutes')).toBeInTheDocument();
	});
});
