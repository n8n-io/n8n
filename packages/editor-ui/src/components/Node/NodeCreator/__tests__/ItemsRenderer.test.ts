import Vue from 'vue';
import { PiniaVuePlugin } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { render, fireEvent } from '@testing-library/vue';
import {
	mockSubcategoryCreateElement,
	mockLabelCreateElement,
	mockNodeCreateElement,
} from './utils';
import ItemsRenderer from '../Renderers/ItemsRenderer.vue';
import { mockActionCreateElement } from './utils';
import { mockViewCreateElement } from './utils';

describe('ItemsRenderer', () => {
	it('should render items', async () => {
		const items = [
			mockSubcategoryCreateElement({ title: 'Subcategory 1' }),
			mockLabelCreateElement('subcategory', { key: 'label1' }),
			mockNodeCreateElement('subcategory', { displayName: 'Node 1', name: 'node1' }),
			mockNodeCreateElement('subcategory', { displayName: 'Node 2', name: 'node2' }),
			mockNodeCreateElement('subcategory', { displayName: 'Node 3', name: 'node3' }),
			mockLabelCreateElement('subcategory', { key: 'label2' }),
			mockNodeCreateElement('subcategory', { displayName: 'Node 2', name: 'node2' }),
			mockNodeCreateElement('subcategory', { displayName: 'Node 3', name: 'node3' }),
			mockSubcategoryCreateElement({ title: 'Subcategory 2' }),
		];
		const { container } = render(
			ItemsRenderer,
			{
				pinia: createTestingPinia(),
				props: { elements: items },
			},
			(vue) => {
				vue.use(PiniaVuePlugin);
			},
		);
		//
		await Vue.nextTick();

		const nodeItems = container.querySelectorAll('.iteratorItem .nodeItem');
		const labels = container.querySelectorAll('.iteratorItem .label');
		const subCategories = container.querySelectorAll('.iteratorItem .subCategory');

		expect(nodeItems.length).toBe(5);
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
		const { container, emitted } = render(
			ItemsRenderer,
			{
				pinia: createTestingPinia(),
				props: { elements: items },
			},
			(vue) => {
				vue.use(PiniaVuePlugin);
			},
		);
		//
		await Vue.nextTick();

		const itemTypes = {
			node: container.querySelector('.iteratorItem .nodeItem'),
			subcategory: container.querySelector('.iteratorItem .subCategory'),
			action: container.querySelector('.iteratorItem .action'),
			view: container.querySelector('.iteratorItem .view'),
		};

		for (const [index, itemType] of Object.keys(itemTypes).entries()) {
			const itemElement = itemTypes[itemType as keyof typeof itemTypes];
			await fireEvent.click(itemElement!);
			expect(emitted().selected[index][0].type).toBe(itemType);
		}
	});
});
