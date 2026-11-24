import { describe, it, expect, vi } from 'vitest';
import { useWorkflowDocumentScopes } from './useWorkflowDocumentScopes';

function createScopes() {
	return useWorkflowDocumentScopes();
}

describe('useWorkflowDocumentScopes', () => {
	describe('initial state', () => {
		it('should start with empty scopes', () => {
			const { scopes } = createScopes();
			expect(scopes.value).toEqual([]);
		});
	});

	describe('setScopes', () => {
		it('should set scopes and fire event hook', () => {
			const { scopes, setScopes, onScopesChange } = createScopes();
			const hookSpy = vi.fn();
			onScopesChange(hookSpy);

			setScopes(['workflow:read', 'workflow:update']);

			expect(scopes.value).toEqual(['workflow:read', 'workflow:update']);
			expect(hookSpy).toHaveBeenCalledWith({
				action: 'update',
				payload: { scopes: ['workflow:read', 'workflow:update'] },
			});
		});

		it('should clear scopes with empty array', () => {
			const { scopes, setScopes } = createScopes();
			setScopes(['workflow:read']);

			setScopes([]);

			expect(scopes.value).toEqual([]);
		});

		it('should replace existing scopes', () => {
			const { scopes, setScopes } = createScopes();
			setScopes(['workflow:read']);

			setScopes(['workflow:update', 'workflow:delete']);

			expect(scopes.value).toEqual(['workflow:update', 'workflow:delete']);
		});

		it('should fire event hook on every call', () => {
			const { setScopes, onScopesChange } = createScopes();
			const hookSpy = vi.fn();
			onScopesChange(hookSpy);

			setScopes(['workflow:read']);
			setScopes([]);

			expect(hookSpy).toHaveBeenCalledTimes(2);
		});
	});
});
