import { describe, it, expect, vi } from 'vitest';
import { useWorkflowDocumentMeta } from './useWorkflowDocumentMeta';

function createMeta() {
	return useWorkflowDocumentMeta();
}

describe('useWorkflowDocumentMeta', () => {
	describe('initial state', () => {
		it('should start with undefined meta', () => {
			const { meta } = createMeta();
			expect(meta.value).toBeUndefined();
		});
	});

	describe('setMeta', () => {
		it('should set meta and fire event hook', () => {
			const { meta, setMeta, onMetaChange } = createMeta();
			const hookSpy = vi.fn();
			onMetaChange(hookSpy);

			setMeta({ templateId: '123' });

			expect(meta.value).toEqual({ templateId: '123' });
			expect(hookSpy).toHaveBeenCalledWith({
				action: 'update',
				payload: { meta: { templateId: '123' } },
			});
		});

		it('should replace existing meta entirely', () => {
			const { meta, setMeta } = createMeta();
			setMeta({ templateId: '123', instanceId: 'abc' });

			setMeta({ onboardingId: '456' });

			expect(meta.value).toEqual({ onboardingId: '456' });
		});

		it('should allow setting undefined', () => {
			const { meta, setMeta } = createMeta();
			setMeta({ templateId: '123' });

			setMeta(undefined);

			expect(meta.value).toBeUndefined();
		});
	});

	describe('addToMeta', () => {
		it('should merge with existing meta and fire event hook', () => {
			const { meta, setMeta, addToMeta, onMetaChange } = createMeta();
			setMeta({ templateId: '123' });

			const hookSpy = vi.fn();
			onMetaChange(hookSpy);

			addToMeta({ instanceId: 'abc' });

			expect(meta.value).toEqual({ templateId: '123', instanceId: 'abc' });
			expect(hookSpy).toHaveBeenCalledWith({
				action: 'update',
				payload: { meta: { templateId: '123', instanceId: 'abc' } },
			});
		});

		it('should create meta from undefined when adding', () => {
			const { meta, addToMeta } = createMeta();

			addToMeta({ templateId: '123' });

			expect(meta.value).toEqual({ templateId: '123' });
		});

		it('should override existing keys', () => {
			const { meta, setMeta, addToMeta } = createMeta();
			setMeta({ templateId: '123' });

			addToMeta({ templateId: '456' });

			expect(meta.value).toEqual({ templateId: '456' });
		});
	});
});
