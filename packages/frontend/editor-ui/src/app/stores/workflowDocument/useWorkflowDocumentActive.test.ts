import { describe, it, expect, vi } from 'vitest';
import { useWorkflowDocumentActive } from './useWorkflowDocumentActive';

function createActive() {
	return useWorkflowDocumentActive();
}

describe('useWorkflowDocumentActive', () => {
	describe('initial state', () => {
		it('should start inactive with null values', () => {
			const { active, activeVersionId, activeVersion } = createActive();
			expect(active.value).toBe(false);
			expect(activeVersionId.value).toBeNull();
			expect(activeVersion.value).toBeNull();
		});
	});

	describe('setActiveState', () => {
		it('should set active state and fire event hook', () => {
			const { active, activeVersionId, activeVersion, setActiveState, onActiveChange } =
				createActive();
			const hookSpy = vi.fn();
			onActiveChange(hookSpy);

			setActiveState({ activeVersionId: 'v1', activeVersion: null });

			expect(active.value).toBe(true);
			expect(activeVersionId.value).toBe('v1');
			expect(activeVersion.value).toBeNull();
			expect(hookSpy).toHaveBeenCalledWith({
				action: 'update',
				payload: { activeVersionId: 'v1', activeVersion: null },
			});
		});

		it('should clear active state', () => {
			const { active, activeVersionId, setActiveState } = createActive();
			setActiveState({ activeVersionId: 'v1', activeVersion: null });

			setActiveState({ activeVersionId: null, activeVersion: null });

			expect(active.value).toBe(false);
			expect(activeVersionId.value).toBeNull();
		});

		it('should replace existing active state', () => {
			const { activeVersionId, setActiveState } = createActive();
			setActiveState({ activeVersionId: 'v1', activeVersion: null });

			setActiveState({ activeVersionId: 'v2', activeVersion: null });

			expect(activeVersionId.value).toBe('v2');
		});

		it('should fire event hook on every call', () => {
			const { setActiveState, onActiveChange } = createActive();
			const hookSpy = vi.fn();
			onActiveChange(hookSpy);

			setActiveState({ activeVersionId: 'v1', activeVersion: null });
			setActiveState({ activeVersionId: null, activeVersion: null });

			expect(hookSpy).toHaveBeenCalledTimes(2);
		});
	});
});
