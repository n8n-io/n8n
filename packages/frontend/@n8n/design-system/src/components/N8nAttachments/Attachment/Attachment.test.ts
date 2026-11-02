import { cleanup, fireEvent, render, screen } from '@testing-library/vue';

import { nextTick } from 'vue';

import N8nAttachment from './Attachment.vue';

describe('N8nAttachment', function describeComponent() {
	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
		vi.useRealTimers();
	});

	it('emits removal after the loaded sprite finishes once', async function testActions() {
		vi.useFakeTimers();
		const { emitted, container, baseElement, unmount } = render(N8nAttachment, {
			props: { fileName: 'example.pdf', mimeType: 'application/pdf' },
		});

		const root = screen.getByRole('figure').parentElement!;
		vi.spyOn(root, 'getBoundingClientRect').mockReturnValue(new DOMRect(40, 60, 80, 80));
		const sprite = baseElement.querySelector('img')!;
		const overlay = sprite.parentElement!;
		expect(container.contains(overlay)).toBe(false);
		await fireEvent.load(sprite);
		await fireEvent.click(screen.getByRole('button', { name: 'Remove' }));

		expect(root.style.display).not.toBe('none');
		await vi.advanceTimersByTimeAsync(159);
		await nextTick();
		expect(root.style.display).not.toBe('none');
		await vi.advanceTimersByTimeAsync(1);
		await nextTick();
		expect(root).toHaveStyle({ display: 'none' });
		expect(overlay).toHaveAttribute('aria-hidden', 'true');
		expect(overlay).toHaveStyle({ left: '40px', top: '60px', width: '80px', height: '80px' });
		expect(emitted('remove')).toBeUndefined();
		expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument();
		expect(emitted('remove')).toBeUndefined();
		await fireEvent.animationEnd(sprite);
		await fireEvent.animationEnd(sprite);
		expect(emitted('remove')).toHaveLength(1);
		unmount();
		expect(overlay).not.toBeInTheDocument();
	});

	it('keeps the teleported sprite available while it loads after removal', async function testLateLoad() {
		const { baseElement, emitted } = render(N8nAttachment, {
			props: { fileName: 'example.pdf', mimeType: 'application/pdf' },
		});
		const root = screen.getByRole('figure').parentElement!;
		await fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
		expect(root).toHaveStyle({ display: 'none' });
		const sprite = baseElement.querySelector('img')!;
		await fireEvent.load(sprite);
		expect(emitted('remove')).toBeUndefined();
		await fireEvent.animationEnd(sprite);
		expect(emitted('remove')).toHaveLength(1);
	});

	it('removes immediately with reduced motion', async function testReducedMotion() {
		vi.stubGlobal('matchMedia', (query: string) => ({
			matches: query.includes('prefers-reduced-motion'),
			media: query,
			addEventListener() {},
			removeEventListener() {},
			addListener() {},
			removeListener() {},
		}));
		try {
			const { emitted, unmount } = render(N8nAttachment, {
				props: { fileName: 'example.pdf', mimeType: 'application/pdf' },
			});
			await fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
			expect(emitted('remove')).toHaveLength(1);
			unmount();
		} finally {
			vi.unstubAllGlobals();
		}
	});

	it('clears the fallback on unmount', async function testCleanup() {
		vi.useFakeTimers();
		try {
			const { unmount, emitted } = render(N8nAttachment, {
				props: { fileName: 'example.pdf', mimeType: 'application/pdf' },
			});
			await fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
			unmount();
			vi.runAllTimers();
			expect(emitted('remove')).toBeUndefined();
		} finally {
			vi.useRealTimers();
		}
	});

	it('hides removal when the attachment is not removable', function testReadOnly() {
		render(N8nAttachment, {
			props: { fileName: 'example.pdf', mimeType: 'application/pdf', isRemovable: false },
		});

		expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument();
		expect(screen.queryByRole('button')).not.toBeInTheDocument();
	});

	it.each([
		['photo.png', 'image/png', 'image'],
		['clip.mp4', 'video/mp4', 'video'],
		['document', 'application/pdf', 'pdf'],
		['document.PDF', 'application/octet-stream', 'pdf'],
		['notes', 'text/markdown; charset=utf-8', 'markdown'],
		['notes.MD', 'text/plain', 'markdown'],
		['archive.zip', 'application/zip', 'file'],
	])('selects the display type for %s (%s)', function testFileType(fileName, mimeType, type) {
		render(N8nAttachment, { props: { fileName, mimeType } });

		expect(screen.getByRole('figure')).toHaveAttribute('data-type', type);
		expect(screen.getByTitle(fileName)).toBeInTheDocument();
	});

	it.each([
		['a-very-long-file-name12.pdf', 'a-very-long-f…12.pdf'],
		['report.final.PDF', 'report.final.PDF'],
		['README', 'README'],
		['.gitignore', '.gitignore'],
		['a-very-long-name-without-extension', 'a-very-long-na…nsion'],
		['a-very-long-file-name12.longextension', 'a-v…12.longextension'],
	])('preserves the file name suffix for %s', function testFileName(fileName, expected) {
		render(N8nAttachment, { props: { fileName, mimeType: 'application/octet-stream' } });

		const caption = screen.getByTitle(fileName);
		const visibleName = caption.querySelector('[aria-hidden="true"]');

		expect(visibleName).toHaveTextContent(expected);
		expect(caption.firstElementChild).toHaveTextContent(fileName);
	});

	it('shows the full file name on hover and restores truncation on leave', async function testHover() {
		const fileName = 'a-very-long-file-name12.pdf';
		render(N8nAttachment, { props: { fileName, mimeType: 'application/pdf' } });

		const container = screen.getByRole('figure').parentElement;
		const visibleName = screen.getByTitle(fileName).querySelector('[aria-hidden="true"]');
		expect(container).not.toBeNull();
		if (!container) return;

		await fireEvent.mouseEnter(container);
		expect(visibleName).toHaveTextContent(fileName);

		await fireEvent.mouseLeave(container);
		expect(visibleName).toHaveTextContent('a-very-long-f…12.pdf');
	});

	it('keeps the full name until the return transition ends', async function testReturn() {
		const fileName = 'a-very-long-file-name12.pdf';
		render(N8nAttachment, { props: { fileName, mimeType: 'application/pdf' } });
		const container = screen.getByRole('figure').parentElement!;
		const viewport = screen.getByTitle(fileName).querySelector('[aria-hidden="true"]')!;
		const name = viewport.firstElementChild!;
		Object.defineProperty(viewport, 'scrollWidth', { value: 200 });
		Object.defineProperty(viewport, 'clientWidth', { value: 100 });

		await fireEvent.mouseEnter(container);
		name.setAttribute('style', 'transform: matrix(1, 0, 0, 1, -50, 0)');
		await fireEvent.mouseLeave(container);
		expect(viewport).toHaveTextContent(fileName);

		const transitionEnd = new Event('transitionend', { bubbles: true });
		Object.defineProperty(transitionEnd, 'propertyName', { value: 'transform' });
		await fireEvent(name, transitionEnd);
		expect(viewport).toHaveTextContent('a-very-long-f…12.pdf');
	});

	it('renders the file name', function testContent() {
		render(N8nAttachment, {
			props: { fileName: 'example.pdf', mimeType: 'application/pdf' },
		});

		expect(screen.getByTitle('example.pdf')).toBeVisible();
	});
});
