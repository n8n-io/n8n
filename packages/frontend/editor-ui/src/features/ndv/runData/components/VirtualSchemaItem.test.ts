import userEvent from '@testing-library/user-event';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import type { INodeTypeDescription } from 'n8n-workflow';
import { createComponentRenderer } from '@/__tests__/render';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useUIStore } from '@/app/stores/ui.store';
import { HTML_PREVIEW_MODAL_KEY } from '@/app/constants';
import VirtualSchemaItem from './VirtualSchemaItem.vue';

const NODE_TYPE = 'n8n-nodes-base.uiBuilder';
const html = '<p>Hello</p>';

const renderComponent = createComponentRenderer(VirtualSchemaItem, {
	props: {
		id: 'item-1',
		icon: 'type' as const,
		title: 'html',
		path: '.html',
		nodeType: NODE_TYPE,
		value: '<p>Hel...',
		rawValue: html,
	},
});

const setup = (outputFieldRendering?: INodeTypeDescription['outputFieldRendering']) => {
	const pinia = createTestingPinia({ stubActions: false });
	setActivePinia(pinia);

	useNodeTypesStore().setNodeTypes([
		{
			name: NODE_TYPE,
			displayName: 'UI Builder',
			description: '',
			version: 1,
			defaultVersion: 1,
			group: [],
			defaults: { name: 'UI Builder' },
			inputs: [],
			outputs: [],
			properties: [],
			...(outputFieldRendering ? { outputFieldRendering } : {}),
		} as INodeTypeDescription,
	]);

	return pinia;
};

describe('VirtualSchemaItem', () => {
	it('replaces the value of a declared HTML field with a preview control', async () => {
		const pinia = setup({ html: 'html' });
		const openModalWithData = vi.spyOn(useUIStore(), 'openModalWithData');
		const { getByTestId, queryByTestId } = renderComponent({ pinia });

		expect(queryByTestId('run-data-schema-item-value')).not.toBeInTheDocument();

		await userEvent.click(getByTestId('run-data-schema-item-html'));

		expect(openModalWithData).toHaveBeenCalledWith({
			name: HTML_PREVIEW_MODAL_KEY,
			data: { html, title: 'html' },
		});
	});

	it('keeps printing the value when the node type declares nothing', () => {
		const pinia = setup();
		const { getByTestId, queryByTestId } = renderComponent({ pinia });

		expect(getByTestId('run-data-schema-item-value')).toBeInTheDocument();
		expect(queryByTestId('run-data-schema-item-html')).not.toBeInTheDocument();
	});

	it('keeps printing an undeclared field of a declaring node type', () => {
		const pinia = setup({ html: 'html' });
		const { getByTestId, queryByTestId } = renderComponent({
			pinia,
			props: { path: '.body', title: 'body' },
		});

		expect(getByTestId('run-data-schema-item-value')).toBeInTheDocument();
		expect(queryByTestId('run-data-schema-item-html')).not.toBeInTheDocument();
	});
});
