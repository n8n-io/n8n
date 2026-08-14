import { screen } from '@testing-library/vue';
import { createPinia, setActivePinia } from 'pinia';
import { renderComponent } from '@/__tests__/render';
import { defaultNodeDescriptions } from '@/__tests__/mocks';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import PlaygroundView from './PlaygroundView.vue';
import { FOLLOW_UP_RESERVE_VALUE, FOLLOW_UP_RESERVE_VARIABLE } from '../followUpReserve';
import { useWorkflowGenerativeUiStore } from '../workflowGenerativeUi.store';

describe('PlaygroundView', () => {
	beforeEach(() => {
		localStorage.clear();
		setActivePinia(createPinia());
		useNodeTypesStore().setNodeTypes(defaultNodeDescriptions);
	});

	it('reserves the shared follow-up scroll space on the preview', () => {
		renderComponent(PlaygroundView);

		expect(screen.getByTestId('generative-ui-playground-preview')).toHaveStyle({
			[FOLLOW_UP_RESERVE_VARIABLE]: FOLLOW_UP_RESERVE_VALUE,
		});
	});

	it('keeps the follow-up outside the scrolling preview content', () => {
		const store = useWorkflowGenerativeUiStore();
		store.view = 'story';

		renderComponent(PlaygroundView);

		const scroller = screen.getByTestId('generative-ui-playground-preview-scroll');
		const followUp = screen.getByTestId('generative-ui-follow-up');
		expect(scroller).not.toContainElement(followUp);
		expect(scroller.parentElement).toContainElement(followUp);
	});
});
