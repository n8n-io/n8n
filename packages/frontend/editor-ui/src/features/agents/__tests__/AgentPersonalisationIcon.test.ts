import { DEFAULT_AGENT_PERSONALISATION } from '@n8n/api-types';
import { waitFor } from '@testing-library/vue';
import { describe, expect, it } from 'vitest';

import { createComponentRenderer } from '@/__tests__/render';

import AgentPersonalisationIcon from '../components/AgentPersonalisationIcon.vue';
import type { AgentJsonConfig } from '../types';

const renderComponent = createComponentRenderer(AgentPersonalisationIcon);

const gradient = { from: '#00ABED', to: '#EE5F00', angle: 171, fromStop: 0, toStop: 97 };

describe('AgentPersonalisationIcon', () => {
	it('draws the default agent icon for an icon name no icon set has', async () => {
		const { getByTestId } = renderComponent({
			props: { personalisation: { icon: 'not-an-icon', gradient } },
		});

		await waitFor(() => {
			expect(
				getByTestId('agent-personalisation-icon-tile').querySelector(
					`svg[data-icon="${DEFAULT_AGENT_PERSONALISATION.icon}"]`,
				),
			).toBeTruthy();
		});
	});

	it('draws the default gradient for a stored gradient the schema would reject', () => {
		const personalisation = {
			icon: 'bot',
			gradient: { ...gradient, from: '#X000FF' },
		} as unknown as AgentJsonConfig['personalisation'];
		const { getByTestId } = renderComponent({ props: { personalisation } });
		const style = getByTestId('agent-personalisation-icon-tile').style;
		const { from, to, angle, fromStop, toStop } = DEFAULT_AGENT_PERSONALISATION.gradient;

		expect({
			from: style.getPropertyValue('--agent-personalisation-gradient-from'),
			to: style.getPropertyValue('--agent-personalisation-gradient-to'),
			angle: style.getPropertyValue('--agent-personalisation-gradient-angle'),
			fromStop: style.getPropertyValue('--agent-personalisation-gradient-from-stop'),
			toStop: style.getPropertyValue('--agent-personalisation-gradient-to-stop'),
		}).toEqual({ from, to, angle: `${angle}deg`, fromStop: `${fromStop}%`, toStop: `${toStop}%` });
	});
});
