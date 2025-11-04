import { createTestNode, createTestWorkflowObject } from '@/__tests__/mocks';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { render, waitFor } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';
import { NodeConnectionTypes } from 'n8n-workflow';
import { nextTick } from 'vue';
import ExperimentalEmbeddedNdvMapper from './ExperimentalEmbeddedNdvMapper.vue';
import { useExperimentalNdvStore } from '../experimentalNdv.store';

describe('ExperimentalEmbeddedNdvMapper', () => {
	const node = createTestNode({ name: 'n1' });
	const workflow = createTestWorkflowObject({
		nodes: [node],
		connections: {
			n0: {
				[NodeConnectionTypes.Main]: [[{ index: 0, node: 'n0', type: NodeConnectionTypes.Main }]],
			},
		},
	});

	it('should open the popover on hover if visibleOnHover is true', async () => {
		const reference = document.createElement('div');
		const rendered = render(ExperimentalEmbeddedNdvMapper, {
			global: { plugins: [createTestingPinia({ stubActions: false })] },
			props: {
				workflow,
				node,
				inputNodeName: 'n0',
				reference,
				visibleOnHover: true,
			},
		});

		await nextTick();
		await userEvent.hover(reference);
		expect(rendered.queryByTestId('ndv-input-panel')).toBeInTheDocument();
	});

	it('should not open the popover on hover if visibleOnHover is false', async () => {
		const reference = document.createElement('div');
		const rendered = render(ExperimentalEmbeddedNdvMapper, {
			global: { plugins: [createTestingPinia({ stubActions: false })] },
			props: {
				workflow,
				node,
				inputNodeName: 'n0',
				reference,
				visibleOnHover: false,
			},
		});

		await nextTick();
		await userEvent.hover(reference);
		expect(rendered.queryByTestId('ndv-input-panel')).not.toBeInTheDocument();
	});

	it('should not open the popover if a mapper is already opened elsewhere', async () => {
		const pinia = createTestingPinia({ stubActions: false });
		const store = useExperimentalNdvStore(pinia);
		const reference = document.createElement('div');
		const rendered = render(ExperimentalEmbeddedNdvMapper, {
			global: { plugins: [pinia] },
			props: {
				workflow,
				node,
				inputNodeName: 'n0',
				reference,
				visibleOnHover: true,
			},
		});

		store.setMapperOpen(true);

		await nextTick();
		await userEvent.hover(reference);
		expect(rendered.queryByTestId('ndv-input-panel')).not.toBeInTheDocument();
	});

	it('should close the popover on mouse leave if the popover is opened by hover', async () => {
		const reference = document.createElement('div');
		const rendered = render(ExperimentalEmbeddedNdvMapper, {
			global: { plugins: [createTestingPinia({ stubActions: false })] },
			props: {
				workflow,
				node,
				inputNodeName: 'n0',
				reference,
				visibleOnHover: true,
			},
		});

		await nextTick();
		await userEvent.hover(reference);
		expect(await rendered.findByTestId('ndv-input-panel')).toBeInTheDocument();

		await userEvent.unhover(reference);
		await flushPromises();
		await waitFor(() => expect(rendered.queryByTestId('ndv-input-panel')).not.toBeInTheDocument());
	});
});
