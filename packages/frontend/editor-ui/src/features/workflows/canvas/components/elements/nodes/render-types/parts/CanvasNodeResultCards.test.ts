import type { ResultCard } from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import { fireEvent } from '@testing-library/vue';
import { setActivePinia } from 'pinia';
import { defineComponent, nextTick } from 'vue';

import { createComponentRenderer } from '@/__tests__/render';
import { createCanvasNodeProvide } from '@/features/workflows/canvas/__tests__/utils';
import { RESULT_CARD_PLACEMENT_STORAGE_KEY } from '@/features/workflows/canvas/composables/useCanvasResultCardPlacement';
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

	it('offers a grip that moves the stack with the keyboard and remembers it', async () => {
		localStorage.clear();
		const provide = createCanvasNodeProvide({
			id: 'node-1',
			data: { runData: { outputMap: {}, iterations: 1, visible: true, resultCards: [weather] } },
		});
		const { getByTestId, queryByTestId } = renderComponent({ global: { provide } });

		const stack = getByTestId('canvas-node-result-cards');
		const handle = getByTestId('canvas-node-result-cards-handle');
		expect(handle).toHaveAttribute('role', 'button');
		expect(stack.style.transform).toBe('translate(28px, calc(-50% + 0px))');
		expect(stack).not.toHaveAttribute('data-moved');
		expect(queryByTestId('canvas-node-result-cards-reset')).toBeNull();

		await fireEvent.keyDown(handle, { key: 'ArrowUp' });
		await fireEvent.keyDown(handle, { key: 'ArrowLeft', shiftKey: true });
		expect(stack.style.transform).toBe('translate(-36px, calc(-50% + -16px))');
		expect(stack).toHaveAttribute('data-moved', 'true');
		expect(localStorage.getItem(RESULT_CARD_PLACEMENT_STORAGE_KEY)).toContain('"node-1"');

		await fireEvent.click(getByTestId('canvas-node-result-cards-reset'));
		expect(stack.style.transform).toBe('translate(28px, calc(-50% + 0px))');
		expect(queryByTestId('canvas-node-result-cards-reset')).toBeNull();
	});

	it('draws the connector once the node and the stack are measured', async () => {
		const sizes: Record<string, [number, number]> = {};
		vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function (
			this: HTMLElement,
		) {
			return sizes[this.dataset.testId ?? this.className]?.[0] ?? 100;
		});
		vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (
			this: HTMLElement,
		) {
			return sizes[this.dataset.testId ?? this.className]?.[1] ?? 100;
		});
		sizes['canvas-node-result-cards'] = [320, 200];

		const { getByTestId } = renderComponent({
			global: {
				provide: createCanvasNodeProvide({
					data: { runData: { outputMap: {}, iterations: 1, visible: true, resultCards: [weather] } },
				}),
			},
		});
		await nextTick();
		const connector = getByTestId('canvas-node-result-cards-connector');
		expect(connector.querySelector('path')?.getAttribute('d')).toMatch(/^M-28\.0 100\.0 C/);
		vi.restoreAllMocks();
	});
});
