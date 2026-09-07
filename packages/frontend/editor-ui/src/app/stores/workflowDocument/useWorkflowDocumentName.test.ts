import { describe, it, expect, vi } from 'vitest';
import { useWorkflowDocumentName } from './useWorkflowDocumentName';

vi.mock('../workflows.store', () => ({
	useWorkflowsStore: vi.fn(() => ({
		workflowObject: { name: '' },
	})),
}));

function createName() {
	return useWorkflowDocumentName({ syncWorkflowObject: vi.fn() });
}

describe('useWorkflowDocumentName', () => {
	describe('initial state', () => {
		it('should start with empty string', () => {
			const { name } = createName();
			expect(name.value).toBe('');
		});
	});

	describe('setName', () => {
		it('should set name and fire event hook', () => {
			const { name, setName, onNameChange } = createName();
			const hookSpy = vi.fn();
			onNameChange(hookSpy);

			setName('My Workflow');

			expect(name.value).toBe('My Workflow');
			expect(hookSpy).toHaveBeenCalledWith({
				action: 'update',
				payload: { name: 'My Workflow' },
			});
		});

		it('should replace existing value', () => {
			const { name, setName } = createName();
			setName('First Name');

			setName('Second Name');

			expect(name.value).toBe('Second Name');
		});

		it('should fire event hook on every call', () => {
			const { setName, onNameChange } = createName();
			const hookSpy = vi.fn();
			onNameChange(hookSpy);

			setName('First');
			setName('Second');

			expect(hookSpy).toHaveBeenCalledTimes(2);
		});
	});
});
