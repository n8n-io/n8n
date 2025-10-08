import { nextTick } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { fireEvent } from '@testing-library/vue';
import {
	mockSubcategoryCreateElement,
	mockLabelCreateElement,
	mockNodeCreateElement,
	mockActionCreateElement,
	mockViewCreateElement,
	mockSectionCreateElement,
} from './__tests__/utils';
import ItemsRenderer from '@/components/Node/NodeCreator/Renderers/ItemsRenderer.vue';
import { createComponentRenderer } from '@/__tests__/render';

const renderComponent = createComponentRenderer(ItemsRenderer);

describe('ItemsRenderer', () => {
	it('should render items', async () => {
		const items = [
			mockSubcategoryCreateElement({ title: 'Subcategory 1' }),
			mockLabelCreateElement('subcategory', { key: 'label1' }),
			mockNodeCreateElement(
				{ subcategory: 'subcategory' },
				{ displayName: 'Node 1', name: 'node1' },
			),
			mockNodeCreateElement(
				{ subcategory: 'subcategory' },
				{ displayName: 'Node 2', name: 'node2' },
			),
			mockNodeCreateElement(
				{ subcategory: 'subcategory' },
				{ displayName: 'Node 3', name: 'node3' },
			),
			mockLabelCreateElement('subcategory', { key: 'label2' }),
			mockNodeCreateElement(
				{ subcategory: 'subcategory' },
				{ displayName: 'Node 2', name: 'node2' },
			),
			mockNodeCreateElement(
				{ subcategory: 'subcategory' },
				{ displayName: 'Node 3', name: 'node3' },
			),
			mockSubcategoryCreateElement({ title: 'Subcategory 2' }),
			mockSectionCreateElement(),
		];

		const { container } = renderComponent({
			pinia: createTestingPinia(),
			props: { elements: items },
			global: {
				stubs: ['N8nLoading'],
			},
		});

		await nextTick();

		const nodeItems = container.querySelectorAll('.iteratorItem .nodeItem');
		const labels = container.querySelectorAll('.iteratorItem .label');
		const subCategories = container.querySelectorAll('.iteratorItem .subCategory');
		const sections = container.querySelectorAll('.categoryItem');

		expect(sections.length).toBe(1);
		expect(nodeItems.length).toBe(7); // 5 nodes in subcategories | 2 nodes in a section
		expect(labels.length).toBe(2);
		expect(subCategories.length).toBe(2);
	});

	it('should fire selected events on click', async () => {
		const items = [
			mockSubcategoryCreateElement(),
			mockNodeCreateElement(),
			mockActionCreateElement(),
			mockViewCreateElement(),
		];
		const { container, emitted } = renderComponent({
			pinia: createTestingPinia(),
			props: { elements: items },
		});
		//
		await nextTick();

		const itemTypes = {
			node: container.querySelector('.iteratorItem .nodeItem'),
			subcategory: container.querySelector('.iteratorItem .subCategory'),
			action: container.querySelector('.iteratorItem .action'),
			view: container.querySelector('.iteratorItem .view'),
		};

		for (const [index, itemType] of Object.keys(itemTypes).entries()) {
			const itemElement = itemTypes[itemType as keyof typeof itemTypes];
			if (itemElement) {
				await fireEvent.click(itemElement);
				const emittedEvent = emitted().selected[index];
				// Use a type guard to check if emittedEvent is an array and if its first element has a 'type' property
				if (
					Array.isArray(emittedEvent) &&
					emittedEvent.length > 0 &&
					typeof emittedEvent[0] === 'object' &&
					'type' in emittedEvent[0]
				) {
					expect(emittedEvent[0].type).toBe(itemType);
				} else {
					fail('Emitted event is not an array or does not have a type property');
				}
			}
		}
	});
});
