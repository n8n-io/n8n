import { describe, it, expect, vi } from 'vitest';
import { useWorkflowDocumentNodeMetadata } from './useWorkflowDocumentNodeMetadata';

function createStore() {
	return useWorkflowDocumentNodeMetadata();
}

describe('useWorkflowDocumentNodeMetadata', () => {
	describe('init lifecycle', () => {
		it('initPristineNodeMetadata creates { pristine: true }', () => {
			const store = createStore();
			store.initPristineNodeMetadata('A');
			expect(store.nodeMetadata.value.A).toEqual({ pristine: true });
		});

		it('initNodeMetadata creates {}', () => {
			const store = createStore();
			store.initNodeMetadata('A');
			expect(store.nodeMetadata.value.A).toEqual({});
		});

		it('initNodeMetadata does not overwrite existing entry', () => {
			const store = createStore();
			store.initPristineNodeMetadata('A');
			store.initNodeMetadata('A');
			expect(store.nodeMetadata.value.A).toEqual({ pristine: true });
		});

		it('initPristineNodeMetadata does not overwrite existing entry', () => {
			const store = createStore();
			store.initNodeMetadata('A');
			store.initPristineNodeMetadata('A');
			expect(store.nodeMetadata.value.A).toEqual({});
		});

		it('removeNodeMetadata removes entry', () => {
			const store = createStore();
			store.initPristineNodeMetadata('A');
			store.removeNodeMetadata('A');
			expect(store.nodeMetadata.value.A).toBeUndefined();
		});

		it('renameNodeMetadata moves key, preserves fields', () => {
			const store = createStore();
			store.initPristineNodeMetadata('A');
			store.touchParametersLastUpdatedAt('A');
			const ts = store.nodeMetadata.value.A.parametersLastUpdatedAt;

			store.renameNodeMetadata('A', 'B');

			expect(store.nodeMetadata.value.A).toBeUndefined();
			expect(store.nodeMetadata.value.B).toEqual({ pristine: true, parametersLastUpdatedAt: ts });
		});

		it('renameNodeMetadata is a no-op when source does not exist', () => {
			const store = createStore();
			store.renameNodeMetadata('A', 'B');
			expect(store.nodeMetadata.value.B).toBeUndefined();
		});

		it('setAllNodeMetadata replaces map', () => {
			const store = createStore();
			store.initPristineNodeMetadata('A');
			store.setAllNodeMetadata({ Z: { pristine: false } });
			expect(store.nodeMetadata.value).toEqual({ Z: { pristine: false } });
		});
	});

	describe('touches', () => {
		it('touchParametersLastUpdatedAt sets Date.now', () => {
			const store = createStore();
			store.initPristineNodeMetadata('A');
			store.touchParametersLastUpdatedAt('A');
			expect(store.nodeMetadata.value.A.parametersLastUpdatedAt).toEqual(expect.any(Number));
		});

		it('touchParametersLastUpdatedAt creates { pristine: true } if missing', () => {
			const store = createStore();
			store.touchParametersLastUpdatedAt('A');
			expect(store.nodeMetadata.value.A.pristine).toBe(true);
			expect(store.nodeMetadata.value.A.parametersLastUpdatedAt).toEqual(expect.any(Number));
		});

		it('touchPinnedDataLastUpdatedAt sets pinnedDataLastUpdatedAt only', () => {
			const store = createStore();
			store.initPristineNodeMetadata('A');
			store.touchPinnedDataLastUpdatedAt('A');
			expect(store.nodeMetadata.value.A.pinnedDataLastUpdatedAt).toEqual(expect.any(Number));
			expect(store.nodeMetadata.value.A.pinnedDataLastRemovedAt).toBeUndefined();
			expect(store.nodeMetadata.value.A.parametersLastUpdatedAt).toBeUndefined();
		});

		it('touchPinnedDataLastRemovedAt sets pinnedDataLastRemovedAt only', () => {
			const store = createStore();
			store.initPristineNodeMetadata('A');
			store.touchPinnedDataLastRemovedAt('A');
			expect(store.nodeMetadata.value.A.pinnedDataLastRemovedAt).toEqual(expect.any(Number));
			expect(store.nodeMetadata.value.A.pinnedDataLastUpdatedAt).toBeUndefined();
		});

		it('clearPinnedDataTimestamps removes both pinned timestamps', () => {
			const store = createStore();
			store.initPristineNodeMetadata('A');
			store.touchPinnedDataLastUpdatedAt('A');
			store.touchPinnedDataLastRemovedAt('A');

			store.clearPinnedDataTimestamps('A');

			expect(store.nodeMetadata.value.A.pinnedDataLastUpdatedAt).toBeUndefined();
			expect(store.nodeMetadata.value.A.pinnedDataLastRemovedAt).toBeUndefined();
			// Preserves pristine and other fields
			expect(store.nodeMetadata.value.A.pristine).toBe(true);
		});

		it('clearPinnedDataTimestamps is a no-op when entry is missing', () => {
			const store = createStore();
			store.clearPinnedDataTimestamps('A');
			expect(store.nodeMetadata.value.A).toBeUndefined();
		});
	});

	describe('getters', () => {
		it('isNodePristine returns true when entry missing', () => {
			const store = createStore();
			expect(store.isNodePristine('A')).toBe(true);
		});

		it('isNodePristine returns pristine flag when entry present', () => {
			const store = createStore();
			store.initPristineNodeMetadata('A');
			expect(store.isNodePristine('A')).toBe(true);

			store.setNodePristine('A', false);
			expect(store.isNodePristine('A')).toBe(false);
		});

		it('getParametersLastUpdate returns undefined when missing', () => {
			const store = createStore();
			expect(store.getParametersLastUpdate('A')).toBeUndefined();
		});

		it('getParametersLastUpdate returns timestamp when set', () => {
			const store = createStore();
			store.touchParametersLastUpdatedAt('A');
			expect(store.getParametersLastUpdate('A')).toEqual(expect.any(Number));
		});

		it('getPinnedDataLastUpdate returns undefined when missing', () => {
			const store = createStore();
			expect(store.getPinnedDataLastUpdate('A')).toBeUndefined();
		});

		it('getPinnedDataLastRemovedAt returns undefined when missing', () => {
			const store = createStore();
			expect(store.getPinnedDataLastRemovedAt('A')).toBeUndefined();
		});
	});

	describe('events', () => {
		it('fires ADD on init', () => {
			const store = createStore();
			const hookSpy = vi.fn();
			store.onNodeMetadataChange(hookSpy);

			store.initPristineNodeMetadata('A');

			expect(hookSpy).toHaveBeenCalledWith({
				action: 'add',
				payload: { nodeName: 'A', metadata: { pristine: true } },
			});
		});

		it('fires DELETE on removeNodeMetadata', () => {
			const store = createStore();
			store.initPristineNodeMetadata('A');

			const hookSpy = vi.fn();
			store.onNodeMetadataChange(hookSpy);
			store.removeNodeMetadata('A');

			expect(hookSpy).toHaveBeenCalledWith({
				action: 'delete',
				payload: { nodeName: 'A', metadata: undefined },
			});
		});

		it('fires UPDATE on rename', () => {
			const store = createStore();
			store.initPristineNodeMetadata('A');

			const hookSpy = vi.fn();
			store.onNodeMetadataChange(hookSpy);
			store.renameNodeMetadata('A', 'B');

			expect(hookSpy).toHaveBeenCalledWith({
				action: 'update',
				payload: { nodeName: 'B', metadata: { pristine: true } },
			});
		});

		it('fires UPDATE on setNodePristine', () => {
			const store = createStore();
			store.initPristineNodeMetadata('A');

			const hookSpy = vi.fn();
			store.onNodeMetadataChange(hookSpy);
			store.setNodePristine('A', false);

			expect(hookSpy).toHaveBeenCalledWith({
				action: 'update',
				payload: { nodeName: 'A', metadata: { pristine: false } },
			});
		});

		it('fires bulk UPDATE on setAllNodeMetadata', () => {
			const store = createStore();
			const hookSpy = vi.fn();
			store.onNodeMetadataChange(hookSpy);

			store.setAllNodeMetadata({ A: { pristine: true } });

			expect(hookSpy).toHaveBeenCalledWith({
				action: 'update',
				payload: { nodeMetadata: { A: { pristine: true } } },
			});
		});
	});
});
