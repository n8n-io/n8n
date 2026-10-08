import { effectScope, reactive } from 'vue';

import { openSafeUrl } from '@/app/utils/htmlUtils';

import { useCanvasOnlyExternalLinks } from './useCanvasOnlyExternalLinks';

const settingsStore = reactive({ isCanvasOnly: false });

vi.mock('@n8n/stores/settings.store', () => ({
	useSettingsStore: () => settingsStore,
}));

vi.mock('@/app/utils/htmlUtils', () => ({
	openSafeUrl: vi.fn(),
}));

describe('useCanvasOnlyExternalLinks', () => {
	let scope: ReturnType<typeof effectScope>;
	let root: HTMLDivElement;

	const mountComposable = (canvasOnly: boolean) => {
		settingsStore.isCanvasOnly = canvasOnly;
		scope = effectScope();
		scope.run(() => {
			useCanvasOnlyExternalLinks(root);
		});
	};

	beforeEach(() => {
		root = document.createElement('div');
		document.body.append(root);
	});

	afterEach(() => {
		scope?.stop();
		root.remove();
		settingsStore.isCanvasOnly = false;
		vi.clearAllMocks();
	});

	it('opens docs links in the node details view in a new tab when canvas-only is on', () => {
		mountComposable(true);

		const link = document.createElement('a');
		link.href = 'https://docs.n8n.io/advanced-ai/intro-tutorial/';
		link.textContent = 'tutorial';
		root.append(link);
		link.click();

		expect(openSafeUrl).toHaveBeenCalledWith(link.href);
	});

	it('opens relative template links in the node details view in a new tab when canvas-only is on', () => {
		mountComposable(true);

		const link = document.createElement('a');
		link.href = '/workflows/templates/1954';
		link.textContent = 'example';
		link.addEventListener('click', (event) => event.preventDefault());
		root.append(link);
		link.click();

		expect(openSafeUrl).toHaveBeenCalledWith(link.href);
	});

	it('does not intercept clicks when canvas-only is off', () => {
		mountComposable(false);

		const link = document.createElement('a');
		link.href = 'https://docs.n8n.io/advanced-ai/intro-tutorial/';
		link.textContent = 'tutorial';
		link.addEventListener('click', (event) => event.preventDefault());
		root.append(link);
		link.click();

		expect(openSafeUrl).not.toHaveBeenCalled();
	});

	it('does not intercept notice action links', () => {
		mountComposable(true);

		const link = document.createElement('a');
		link.dataset.key = 'toggle-expand';
		link.textContent = 'Show more';
		root.append(link);
		link.click();

		expect(openSafeUrl).not.toHaveBeenCalled();
	});

	it('does not intercept clicks outside the node details view', () => {
		mountComposable(true);

		const link = document.createElement('a');
		link.href = '/projects/abc123';
		link.textContent = 'Project';
		link.addEventListener('click', (event) => event.preventDefault());
		document.body.append(link);
		link.click();

		expect(openSafeUrl).not.toHaveBeenCalled();

		link.remove();
	});
});
