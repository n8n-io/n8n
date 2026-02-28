import { describe, it, expect, vi } from 'vitest';
import { useWorkflowDocumentTags } from './useWorkflowDocumentTags';

function createTags() {
	return useWorkflowDocumentTags();
}

describe('useWorkflowDocumentTags', () => {
	describe('initial state', () => {
		it('should start with empty tags', () => {
			const { tags } = createTags();
			expect(tags.value).toEqual([]);
		});
	});

	describe('setTags', () => {
		it('should set tags and fire event hook', () => {
			const { tags, setTags, onTagsChange } = createTags();
			const hookSpy = vi.fn();
			onTagsChange(hookSpy);

			setTags(['tag1', 'tag2']);

			expect(tags.value).toEqual(['tag1', 'tag2']);
			expect(hookSpy).toHaveBeenCalledWith({
				action: 'update',
				payload: { tags: ['tag1', 'tag2'] },
			});
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
		it('should add tags and fire event hook', () => {
			const { tags, addTags, onTagsChange } = createTags();
			const hookSpy = vi.fn();
			onTagsChange(hookSpy);

			addTags(['tag1', 'tag2']);

			expect(tags.value).toEqual(['tag1', 'tag2']);
			expect(hookSpy).toHaveBeenCalledWith({
				action: 'add',
				payload: { tags: ['tag1', 'tag2'] },
			});
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
		it('should remove a tag and fire event hook', () => {
			const { tags, setTags, removeTag, onTagsChange } = createTags();
			setTags(['tag1', 'tag2', 'tag3']);
			const hookSpy = vi.fn();
			onTagsChange(hookSpy);

			removeTag('tag2');

			expect(tags.value).toEqual(['tag1', 'tag3']);
			expect(hookSpy).toHaveBeenCalledWith({
				action: 'delete',
				payload: { tags: ['tag1', 'tag3'] },
			});
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
});
