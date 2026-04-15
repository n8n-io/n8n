import { describe, it, expect, vi } from 'vitest';
import { useWorkflowDocumentIsArchived } from './useWorkflowDocumentIsArchived';

function createIsArchived() {
	return useWorkflowDocumentIsArchived();
}

describe('useWorkflowDocumentIsArchived', () => {
	describe('initial state', () => {
		it('should start with false', () => {
			const { isArchived } = createIsArchived();
			expect(isArchived.value).toBe(false);
		});
	});

	describe('setIsArchived', () => {
		it('should set isArchived and fire event hook', () => {
			const { isArchived, setIsArchived, onIsArchivedChange } = createIsArchived();
			const hookSpy = vi.fn();
			onIsArchivedChange(hookSpy);

			setIsArchived(true);

			expect(isArchived.value).toBe(true);
			expect(hookSpy).toHaveBeenCalledWith({
				action: 'update',
				payload: { isArchived: true },
			});
		});

		it('should replace existing value', () => {
			const { isArchived, setIsArchived } = createIsArchived();
			setIsArchived(true);

			setIsArchived(false);

			expect(isArchived.value).toBe(false);
		});

		it('should fire event hook on every call', () => {
			const { setIsArchived, onIsArchivedChange } = createIsArchived();
			const hookSpy = vi.fn();
			onIsArchivedChange(hookSpy);

			setIsArchived(true);
			setIsArchived(false);

			expect(hookSpy).toHaveBeenCalledTimes(2);
		});
	});
});
