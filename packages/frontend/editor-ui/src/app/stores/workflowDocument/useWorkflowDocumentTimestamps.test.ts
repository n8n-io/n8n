import { describe, it, expect, vi } from 'vitest';
import { useWorkflowDocumentTimestamps } from './useWorkflowDocumentTimestamps';

function createTimestamps() {
	return useWorkflowDocumentTimestamps();
}

describe('useWorkflowDocumentTimestamps', () => {
	describe('initial state', () => {
		it('should start with -1', () => {
			const { createdAt, updatedAt } = createTimestamps();
			expect(createdAt.value).toBe(-1);
			expect(updatedAt.value).toBe(-1);
		});
	});

	describe('setCreatedAt', () => {
		it('should set createdAt and fire event hook', () => {
			const { createdAt, setCreatedAt, onCreatedAtChange } = createTimestamps();
			const hookSpy = vi.fn();
			onCreatedAtChange(hookSpy);

			setCreatedAt('2024-01-01T00:00:00Z');

			expect(createdAt.value).toBe('2024-01-01T00:00:00Z');
			expect(hookSpy).toHaveBeenCalledWith({
				action: 'update',
				payload: { createdAt: '2024-01-01T00:00:00Z' },
			});
		});

		it('should replace existing createdAt', () => {
			const { createdAt, setCreatedAt } = createTimestamps();
			setCreatedAt('2024-01-01T00:00:00Z');

			setCreatedAt('2024-06-15T12:00:00Z');

			expect(createdAt.value).toBe('2024-06-15T12:00:00Z');
		});

		it('should fire event hook on every call', () => {
			const { setCreatedAt, onCreatedAtChange } = createTimestamps();
			const hookSpy = vi.fn();
			onCreatedAtChange(hookSpy);

			setCreatedAt('2024-01-01T00:00:00Z');
			setCreatedAt('2024-06-15T12:00:00Z');

			expect(hookSpy).toHaveBeenCalledTimes(2);
		});

		it('should accept numeric timestamps', () => {
			const { createdAt, setCreatedAt, onCreatedAtChange } = createTimestamps();
			const hookSpy = vi.fn();
			onCreatedAtChange(hookSpy);

			setCreatedAt(1704067200000);

			expect(createdAt.value).toBe(1704067200000);
			expect(hookSpy).toHaveBeenCalledWith({
				action: 'update',
				payload: { createdAt: 1704067200000 },
			});
		});

		it('should not fire updatedAt event hook', () => {
			const { setCreatedAt, onUpdatedAtChange } = createTimestamps();
			const hookSpy = vi.fn();
			onUpdatedAtChange(hookSpy);

			setCreatedAt('2024-01-01T00:00:00Z');

			expect(hookSpy).not.toHaveBeenCalled();
		});
	});

	describe('setUpdatedAt', () => {
		it('should set updatedAt and fire event hook', () => {
			const { updatedAt, setUpdatedAt, onUpdatedAtChange } = createTimestamps();
			const hookSpy = vi.fn();
			onUpdatedAtChange(hookSpy);

			setUpdatedAt('2024-01-01T00:00:00Z');

			expect(updatedAt.value).toBe('2024-01-01T00:00:00Z');
			expect(hookSpy).toHaveBeenCalledWith({
				action: 'update',
				payload: { updatedAt: '2024-01-01T00:00:00Z' },
			});
		});

		it('should replace existing updatedAt', () => {
			const { updatedAt, setUpdatedAt } = createTimestamps();
			setUpdatedAt('2024-01-01T00:00:00Z');

			setUpdatedAt('2024-06-15T12:00:00Z');

			expect(updatedAt.value).toBe('2024-06-15T12:00:00Z');
		});

		it('should fire event hook on every call', () => {
			const { setUpdatedAt, onUpdatedAtChange } = createTimestamps();
			const hookSpy = vi.fn();
			onUpdatedAtChange(hookSpy);

			setUpdatedAt('2024-01-01T00:00:00Z');
			setUpdatedAt('2024-06-15T12:00:00Z');

			expect(hookSpy).toHaveBeenCalledTimes(2);
		});

		it('should accept numeric timestamps', () => {
			const { updatedAt, setUpdatedAt, onUpdatedAtChange } = createTimestamps();
			const hookSpy = vi.fn();
			onUpdatedAtChange(hookSpy);

			setUpdatedAt(1704067200000);

			expect(updatedAt.value).toBe(1704067200000);
			expect(hookSpy).toHaveBeenCalledWith({
				action: 'update',
				payload: { updatedAt: 1704067200000 },
			});
		});

		it('should not fire createdAt event hook', () => {
			const { setUpdatedAt, onCreatedAtChange } = createTimestamps();
			const hookSpy = vi.fn();
			onCreatedAtChange(hookSpy);

			setUpdatedAt('2024-01-01T00:00:00Z');

			expect(hookSpy).not.toHaveBeenCalled();
		});
	});
});
