import { mock } from 'vitest-mock-extended';
import { describe, it, expect } from 'vitest';
import type { FrontendSettings } from '@n8n/api-types';
import { useDocumentTitle } from '../useDocumentTitle';

const settings = mock<FrontendSettings>({ releaseChannel: 'stable' });
vi.mock('@/stores/settings.store', () => ({
	useSettingsStore: vi.fn(() => ({ settings })),
}));

describe('useDocumentTitle', () => {
	it('should set the document title', () => {
		const { set } = useDocumentTitle();
		set('Test Title');
		expect(document.title).toBe('n8n - Test Title');
	});

	it('should reset the document title', () => {
		const { set, reset } = useDocumentTitle();
		set('Test Title');
		reset();
		expect(document.title).toBe('n8n - Workflow Automation');
	});

	it('should not use the default prefix if useDefaultPrefix is false', () => {
		const { set } = useDocumentTitle({ useDefaultPrefix: false });
		set('Test Title');
		expect(document.title).toBe('Test Title');
	});

	it('should use the correct prefix for the release channel', () => {
		settings.releaseChannel = 'beta';
		const { set } = useDocumentTitle();
		set('Test Title');
		expect(document.title).toBe('[BETA] - Test Title');
	});
});
