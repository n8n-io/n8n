import { describe, it, expect, vi } from 'vitest';
import { useWorkflowDocumentTags, type TagAction } from './useWorkflowDocumentTags';

/**
 * Creates the composable wired through a spy onChange.
 * The spy calls handleAction, simulating the store's unified dispatcher.
 */
function createTags() {
	const onChangeSpy = vi.fn<(action: TagAction) => void>();
	const composable = useWorkflowDocumentTags(onChangeSpy);

	// Wire the spy to call handleAction, simulating the store's onChange dispatcher
	onChangeSpy.mockImplementation(composable.handleAction);

	return { ...composable, onChangeSpy };
}

describe('useWorkflowDocumentTags', () => {
	describe('initial state', () => {
		it('should start with empty tags', () => {
			const { tags } = createTags();
			expect(tags.value).toEqual([]);
		});
	});

	describe('setTags', () => {
		it('should set tags via onChange', () => {
			const { tags, setTags, onChangeSpy } = createTags();

			setTags(['tag1', 'tag2']);

			expect(onChangeSpy).toHaveBeenCalledWith({
				name: 'setTags',
				payload: { tags: ['tag1', 'tag2'] },
			});
			expect(tags.value).toEqual(['tag1', 'tag2']);
		});

		it('should replace existing tags entirely', () => {
			const { tags, setTags } = createTags();
			setTags(['tag1']);

			setTags(['tag2', 'tag3']);

			expect(tags.value).toEqual(['tag2', 'tag3']);
		});

		it('should allow setting empty tags', () => {
			const { tags, setTags } = createTags();
			setTags(['tag1']);

			setTags([]);

			expect(tags.value).toEqual([]);
		});
	});

	describe('addTags', () => {
		it('should add tags via onChange', () => {
			const { tags, addTags, onChangeSpy } = createTags();

			addTags(['tag1', 'tag2']);

			expect(onChangeSpy).toHaveBeenCalledWith({
				name: 'addTags',
				payload: { tags: ['tag1', 'tag2'] },
			});
			expect(tags.value).toEqual(['tag1', 'tag2']);
		});

		it('should append to existing tags', () => {
			const { tags, setTags, addTags } = createTags();
			setTags(['tag1']);

			addTags(['tag2']);

			expect(tags.value).toEqual(['tag1', 'tag2']);
		});

		it('should deduplicate tags', () => {
			const { tags, setTags, addTags } = createTags();
			setTags(['tag1', 'tag2']);

			addTags(['tag2', 'tag3']);

			expect(tags.value).toEqual(['tag1', 'tag2', 'tag3']);
		});
	});

	describe('removeTag', () => {
		it('should remove a tag via onChange', () => {
			const { tags, setTags, removeTag, onChangeSpy } = createTags();
			setTags(['tag1', 'tag2', 'tag3']);
			onChangeSpy.mockClear();

			removeTag('tag2');

			expect(onChangeSpy).toHaveBeenCalledWith({
				name: 'removeTag',
				payload: { tagId: 'tag2' },
			});
			expect(tags.value).toEqual(['tag1', 'tag3']);
		});

		it('should handle removing a non-existent tag gracefully', () => {
			const { tags, setTags, removeTag } = createTags();
			setTags(['tag1']);

			removeTag('nonexistent');

			expect(tags.value).toEqual(['tag1']);
		});

		it('should handle removing from empty tags', () => {
			const { tags, removeTag } = createTags();

			removeTag('tag1');

			expect(tags.value).toEqual([]);
		});
	});

	describe('handleAction', () => {
		it('should apply setTags action directly', () => {
			const { tags, handleAction } = createTags();

			handleAction({ name: 'setTags', payload: { tags: ['tag1'] } });

			expect(tags.value).toEqual(['tag1']);
		});

		it('should apply addTags action directly', () => {
			const { tags, handleAction } = createTags();
			handleAction({ name: 'setTags', payload: { tags: ['tag1'] } });

			handleAction({ name: 'addTags', payload: { tags: ['tag2'] } });

			expect(tags.value).toEqual(['tag1', 'tag2']);
		});

		it('should apply removeTag action directly', () => {
			const { tags, handleAction } = createTags();
			handleAction({ name: 'setTags', payload: { tags: ['tag1', 'tag2'] } });

			handleAction({ name: 'removeTag', payload: { tagId: 'tag1' } });

			expect(tags.value).toEqual(['tag2']);
		});
	});
});
