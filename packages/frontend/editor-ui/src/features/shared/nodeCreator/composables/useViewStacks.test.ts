<<<<<<< HEAD
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { DEFAULT_SUBCATEGORY } from '@/app/constants';
import { useNodeCreatorStore } from '@/features/shared/nodeCreator/nodeCreator.store';
import { mockSimplifiedNodeType } from '../__tests__/utils';
import { useViewStacks } from './useViewStacks';

describe('useViewStacks', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: false }));
	});

	it('does not accumulate forceIncludeNodes when the same stack is opened twice', () => {
		const nodeCreatorStore = useNodeCreatorStore();
		nodeCreatorStore.mergedNodes = [
			mockSimplifiedNodeType({ name: 'nodeA' }),
			mockSimplifiedNodeType({ name: 'nodeB' }),
		];

		const viewStacks = useViewStacks();
		const openStack = () =>
			viewStacks.pushViewStack(
				{
					subcategory: DEFAULT_SUBCATEGORY,
					title: 'Subcategory',
					forceIncludeNodes: ['nodeB'],
				},
				{ resetStacks: true },
			);

		openStack();
		const firstOpen = viewStacks.activeViewStack.items?.map((item) => item.key);

		openStack();
		const secondOpen = viewStacks.activeViewStack.items?.map((item) => item.key);

		expect(secondOpen).toEqual(firstOpen);
=======
import { createPinia, setActivePinia } from 'pinia';

import { DEFAULT_SUBCATEGORY, TRIGGER_NODE_CREATOR_VIEW } from '@/app/constants';
import {
	mockActionCreateElement,
	mockSimplifiedNodeType,
	mockSubcategoryCreateElement,
} from '@/features/shared/nodeCreator/__tests__/utils';
import { useNodeCreatorStore } from '@/features/shared/nodeCreator/nodeCreator.store';
import { mockRestrictedNodeTypes } from '@n8n/frontend-module-type-availability-policies/__tests__/mocks';
import { useViewStacks } from './useViewStacks';

const mockDocumentStoreState = {
	allNodes: [],
	workflowTriggerNodes: [],
	aiNodes: [],
	getExpressionHandler: () => null,
};
vi.mock('@/app/stores/workflowDocument.store', () => ({
	useWorkflowDocumentStore: () => mockDocumentStoreState,
	createWorkflowDocumentId: (id: string) => `${id}@latest`,
	injectWorkflowDocumentStore: () => ({ value: mockDocumentStoreState }),
}));

const TRIGGER_NAME = 'n8n-nodes-base.acmeTrigger';

describe('useViewStacks', () => {
	describe('trigger name in a subcategory', () => {
		beforeEach(() => {
			setActivePinia(createPinia());

			const nodeCreatorStore = useNodeCreatorStore();
			nodeCreatorStore.setMergeNodes([
				mockSimplifiedNodeType({
					name: TRIGGER_NAME,
					displayName: 'Acme Trigger',
					group: ['trigger'],
				}),
			]);
			nodeCreatorStore.setActions({
				[TRIGGER_NAME]: [
					mockActionCreateElement().properties,
					mockActionCreateElement().properties,
				],
			});
		});

		function openAppTriggerSubcategory() {
			const viewStacks = useViewStacks();
			viewStacks.pushViewStack(
				viewStacks.subcategoryStack(
					{
						...mockSubcategoryCreateElement({ title: 'App Trigger Nodes' }),
						key: DEFAULT_SUBCATEGORY,
					},
					TRIGGER_NODE_CREATOR_VIEW,
				),
			);

			return viewStacks.activeViewStack.baselineItems?.flatMap((item) =>
				item.type === 'node' ? [item.properties.displayName] : [],
			);
		}

		it('drops "Trigger" from the name when the trigger is allowed', () => {
			mockRestrictedNodeTypes();

			expect(openAppTriggerSubcategory()).toEqual(['Acme']);
		});

		it('keeps the full name when the app node of the trigger is restricted', () => {
			mockRestrictedNodeTypes({ 'n8n-nodes-base.acme': 'instance' });

			expect(openAppTriggerSubcategory()).toEqual(['Acme Trigger']);
		});

		it('keeps the full name when the trigger is restricted', () => {
			mockRestrictedNodeTypes({ [TRIGGER_NAME]: 'instance' });

			expect(openAppTriggerSubcategory()).toEqual(['Acme Trigger']);
		});
>>>>>>> ba34719a31a9117002efb3db579f9aaf45bab4f5
	});
});
