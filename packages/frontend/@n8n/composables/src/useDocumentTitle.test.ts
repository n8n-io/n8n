import { ref } from 'vue';
import { useDocumentTitle } from './useDocumentTitle';

describe('useDocumentTitle', () => {
	it('should set the document title', () => {
		const { set } = useDocumentTitle({ releaseChannel: 'stable' });
		set('Test Title');
		expect(document.title).toBe('Test Title - n8n');
	});

	it('should reset the document title', () => {
		const { set, reset } = useDocumentTitle({ releaseChannel: 'stable' });
		set('Test Title');
		reset();
		expect(document.title).toBe('Workflow Automation - n8n');
	});

	it('should use the correct suffix for the release channel', () => {
		const { set } = useDocumentTitle({ releaseChannel: 'beta' });
		set('Test Title');
		expect(document.title).toBe('Test Title - n8n[BETA]');
	});

	it('should use default suffix when releaseChannel is not provided', () => {
		const { set } = useDocumentTitle();
		set('Test Title');
		expect(document.title).toBe('Test Title - n8n');
	});

	it('should set document title with workflow status icons', () => {
		const { setDocumentTitle } = useDocumentTitle({ releaseChannel: 'stable' });

		setDocumentTitle('My Workflow', 'EXECUTING');
		expect(document.title).toBe('🔄 My Workflow - n8n');

		setDocumentTitle('My Workflow', 'IDLE');
		expect(document.title).toBe('▶️ My Workflow - n8n');

		setDocumentTitle('My Workflow', 'ERROR');
		expect(document.title).toBe('⚠️ My Workflow - n8n');

		setDocumentTitle('My Workflow', 'DEBUG');
		expect(document.title).toBe('⚠️ My Workflow - n8n');
	});

	it('should set title on custom window reference', () => {
		const mockDocument = { title: '' };
		const mockWindow = { document: mockDocument } as unknown as Window;
		const windowRef = ref<Window | undefined>(mockWindow);

		const { set } = useDocumentTitle({ releaseChannel: 'stable', windowRef });
		set('Pop Out Title');

		expect(mockDocument.title).toBe('Pop Out Title - n8n');
	});

	it('should fall back to main document when windowRef is undefined', () => {
		const windowRef = ref<Window | undefined>(undefined);

		const { set } = useDocumentTitle({ releaseChannel: 'stable', windowRef });
		set('Main Title');

		expect(document.title).toBe('Main Title - n8n');
	});
});
