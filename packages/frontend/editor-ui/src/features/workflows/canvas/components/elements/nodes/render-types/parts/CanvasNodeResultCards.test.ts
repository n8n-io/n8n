import type { ResultCard } from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import { fireEvent } from '@testing-library/vue';
import { setActivePinia } from 'pinia';
import { defineComponent } from 'vue';

import { createComponentRenderer } from '@/__tests__/render';
import { createCanvasNodeProvide } from '@/features/workflows/canvas/__tests__/utils';
import CanvasNodeResultCards from './CanvasNodeResultCards.vue';

const renderComponent = createComponentRenderer(CanvasNodeResultCards);

const weather: ResultCard = {
	type: 'weather',
	title: 'Berlin',
	location: 'Berlin',
	temperature: 18,
	unit: 'C',
	icon: 'partly-cloudy',
	condition: 'Partly cloudy',
	sources: [{ name: 'Open-Meteo', temperature: 18 }],
};

beforeEach(() => {
	setActivePinia(createTestingPinia());
});

describe('CanvasNodeResultCards', () => {
	it('renders nothing when the node declared no cards', () => {
		const { queryByTestId } = renderComponent({
			global: { provide: { ...createCanvasNodeProvide() } },
		});

		expect(queryByTestId('canvas-node-result-cards')).toBeNull();
	});

	it('renders every declared card beside the node', () => {
		const { getByTestId, getByText } = renderComponent({
			global: {
				provide: {
					...createCanvasNodeProvide({
						data: {
							runData: { outputMap: {}, iterations: 1, visible: true, resultCards: [weather] },
						},
					}),
				},
			},
		});

		expect(getByTestId('canvas-node-result-cards')).toBeInTheDocument();
		expect(getByText('Berlin')).toBeInTheDocument();
		expect(getByText('Partly cloudy')).toBeInTheDocument();
	});

	it('keeps pointer interaction from reaching the node', async () => {
		const onMouseDown = vi.fn();
		const onDblClick = vi.fn();
		const Host = defineComponent({
			components: { CanvasNodeResultCards },
			setup: () => ({ onMouseDown, onDblClick }),
			template:
				'<div @mousedown="onMouseDown" @dblclick="onDblClick"><CanvasNodeResultCards /></div>',
		});
		const { getByText } = createComponentRenderer(Host)({
			global: {
				provide: {
					...createCanvasNodeProvide({
						data: {
							runData: { outputMap: {}, iterations: 1, visible: true, resultCards: [weather] },
						},
					}),
				},
			},
		});

		await fireEvent.mouseDown(getByText('Berlin'));
		await fireEvent.dblClick(getByText('Berlin'));

		expect(onMouseDown).not.toHaveBeenCalled();
		expect(onDblClick).not.toHaveBeenCalled();
	});
});
