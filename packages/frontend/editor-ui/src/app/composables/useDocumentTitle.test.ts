import { ref } from 'vue';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { STORES } from '@n8n/stores';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';

describe('useDocumentTitle', () => {
	beforeEach(() => {
		const pinia = createTestingPinia({
			initialState: {
				[STORES.SETTINGS]: {
					settings: {
						releaseChannel: 'stable',
					},
				},
			},
		});
		setActivePinia(pinia);
	});

	it('should set the document title using releaseChannel from settings store', () => {
		const { set } = useDocumentTitle();
		set('Test Title');
		expect(document.title).toBe('Test Title - n8n');
	});

	it('should reset the document title', () => {
		const { set, reset } = useDocumentTitle();
		set('Test Title');
		reset();
		expect(document.title).toBe('Workflow Automation - n8n');
	});

	it('should set document title with workflow status icons', () => {
		const { setDocumentTitle } = useDocumentTitle();

		setDocumentTitle('My Workflow', 'EXECUTING');
		expect(document.title).toBe('🔄 My Workflow - n8n');

		setDocumentTitle('My Workflow', 'IDLE');
		expect(document.title).toBe('▶️ My Workflow - n8n');

		setDocumentTitle('My Workflow', 'ERROR');
		expect(document.title).toBe('⚠️ My Workflow - n8n');
	});

	it('should set title on custom window reference', () => {
		const mockDocument = { title: '' };
		const mockWindow = { document: mockDocument } as unknown as Window;
		const windowRef = ref<Window | undefined>(mockWindow);

		const { set } = useDocumentTitle(windowRef);
		set('Pop Out Title');

		expect(mockDocument.title).toBe('Pop Out Title - n8n');
	});

	it('should fall back to main document when windowRef is undefined', () => {
		const windowRef = ref<Window | undefined>(undefined);

		const { set } = useDocumentTitle(windowRef);
		set('Main Title');

		expect(document.title).toBe('Main Title - n8n');
	});

	describe('with non-stable release channel', () => {
		beforeEach(() => {
			const pinia = createTestingPinia({
				initialState: {
					[STORES.SETTINGS]: {
						settings: {
							releaseChannel: 'beta',
						},
					},
				},
			});
			setActivePinia(pinia);
		});

		it('should use the correct suffix for the release channel', () => {
			const { set } = useDocumentTitle();
			set('Test Title');
			expect(document.title).toBe('Test Title - n8n[BETA]');
		});
	});
});
