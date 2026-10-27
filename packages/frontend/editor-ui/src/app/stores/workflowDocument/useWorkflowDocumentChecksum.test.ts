import { describe, it, expect, vi } from 'vitest';
import { useWorkflowDocumentChecksum } from './useWorkflowDocumentChecksum';

function createChecksum() {
	return useWorkflowDocumentChecksum();
}

describe('useWorkflowDocumentChecksum', () => {
	describe('initial state', () => {
		it('should start with empty string', () => {
			const { checksum } = createChecksum();
			expect(checksum.value).toBe('');
		});
	});

	describe('setChecksum', () => {
		it('should set checksum and fire event hook', () => {
			const { checksum, setChecksum, onChecksumChange } = createChecksum();
			const hookSpy = vi.fn();
			onChecksumChange(hookSpy);

			setChecksum('abc123');

			expect(checksum.value).toBe('abc123');
			expect(hookSpy).toHaveBeenCalledWith({
				action: 'update',
				payload: { checksum: 'abc123' },
			});
		});

		it('should replace existing checksum', () => {
			const { checksum, setChecksum } = createChecksum();
			setChecksum('abc123');

			setChecksum('def456');

			expect(checksum.value).toBe('def456');
		});

		it('should fire event hook on every call', () => {
			const { setChecksum, onChecksumChange } = createChecksum();
			const hookSpy = vi.fn();
			onChecksumChange(hookSpy);

			setChecksum('abc123');
			setChecksum('def456');

			expect(hookSpy).toHaveBeenCalledTimes(2);
		});
	});
});
