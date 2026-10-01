import { describe, it, expect, vi } from 'vitest';
import type { WorkflowHistory } from '@n8n/rest-api-client';
import { useWorkflowDocumentActive } from './useWorkflowDocumentActive';

function createActive() {
	return useWorkflowDocumentActive();
}

function createVersion(versionId: string): WorkflowHistory {
	return {
		versionId,
		authors: 'Test Author',
		createdAt: '2026-04-21T00:00:00.000Z',
		updatedAt: '2026-04-21T00:00:00.000Z',
		workflowPublishHistory: [],
		name: `Version ${versionId}`,
		description: null,
	};
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

	describe('setActiveVersion', () => {
		it('should update activeVersion without changing activeVersionId', () => {
			const { activeVersionId, activeVersion, setActiveState, setActiveVersion } = createActive();
			setActiveState({ activeVersionId: 'v1', activeVersion: null });

			const version = createVersion('v1');
			setActiveVersion(version);

			expect(activeVersionId.value).toBe('v1');
			expect(activeVersion.value).toEqual(version);
		});

		it('should fire onActiveChange with combined payload', () => {
			const { setActiveState, setActiveVersion, onActiveChange } = createActive();
			setActiveState({ activeVersionId: 'v1', activeVersion: null });

			const hookSpy = vi.fn();
			onActiveChange(hookSpy);

			const version = createVersion('v1');
			setActiveVersion(version);

			expect(hookSpy).toHaveBeenCalledWith({
				action: 'update',
				payload: { activeVersionId: 'v1', activeVersion: version },
			});
		});

		it('should clear activeVersion when passed null', () => {
			const { activeVersion, setActiveState, setActiveVersion } = createActive();
			const version = createVersion('v1');
			setActiveState({ activeVersionId: 'v1', activeVersion: version });

			setActiveVersion(null);

			expect(activeVersion.value).toBeNull();
		});

		it('should preserve null activeVersionId when setting version', () => {
			const { activeVersionId, activeVersion, setActiveVersion } = createActive();

			const version = createVersion('v1');
			setActiveVersion(version);

			expect(activeVersionId.value).toBeNull();
			expect(activeVersion.value).toEqual(version);
		});
	});
});
