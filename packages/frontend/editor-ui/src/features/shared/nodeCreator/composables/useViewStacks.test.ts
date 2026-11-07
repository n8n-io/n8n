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
	});
});
