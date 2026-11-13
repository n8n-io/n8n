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
		await fireEvent.click(screen.getByTestId('attachment-remove'));

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
		expect(screen.queryByTestId('attachment-remove')).not.toBeInTheDocument();
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
		await fireEvent.click(screen.getByTestId('attachment-remove'));
		expect(root.style.display).not.toBe('none');
		expect(root.firstElementChild).toHaveAttribute('aria-hidden', 'true');
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
			await fireEvent.click(screen.getByTestId('attachment-remove'));
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
			await fireEvent.click(screen.getByTestId('attachment-remove'));
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

		expect(screen.queryByTestId('attachment-remove')).not.toBeInTheDocument();
		expect(screen.queryByRole('button')).not.toBeInTheDocument();
	});

	it.each([
		['photo.png', 'image/png', 'file'],
		['clip.mp4', 'video/mp4', 'video'],
		['document', 'application/pdf', 'pdf'],
		['document.PDF', 'application/octet-stream', 'pdf'],
		['notes', 'text/markdown; charset=utf-8', 'markdown'],
		['notes.MD', 'text/plain', 'markdown'],
		['archive.zip', 'application/zip', 'file'],
	])('selects the display type for %s (%s)', function testFileType(fileName, mimeType, type) {
		render(N8nAttachment, { props: { fileName, mimeType } });

		expect(screen.getByRole('figure')).toHaveAttribute('data-type', type);
		expect(screen.getByTitle(fileName).parentElement).toBe(screen.getByRole('figure'));
		expect(screen.getByTitle(fileName).tagName).toBe('FIGCAPTION');
		expect(screen.getByTitle(fileName)).toBeInTheDocument();
	});

	it.each([
		'a-very-long-file-name12.pdf',
		'report.final.PDF',
		'README',
		'.gitignore',
		'a-very-long-name-without-extension',
		'a-very-long-file-name12.longextension',
	])('renders the full file name for %s', function testFileName(fileName) {
		render(N8nAttachment, { props: { fileName, mimeType: 'application/octet-stream' } });

		const caption = screen.getByTitle(fileName);
		const visibleName = caption.querySelector('[aria-hidden="true"]');

		expect(visibleName).toHaveTextContent(fileName);
		expect(caption.firstElementChild).toHaveTextContent(fileName);
	});

	it('starts the marquee when the caption overflows', async function testHover() {
		const fileName = 'a-very-long-file-name12.pdf';
		render(N8nAttachment, { props: { fileName, mimeType: 'application/pdf' } });

		const container = screen.getByRole('figure').parentElement;
		const viewport = screen.getByTitle(fileName).querySelector<HTMLElement>('[aria-hidden="true"]');
		expect(container).not.toBeNull();
		expect(viewport).not.toBeNull();
		if (!container || !viewport) return;
		Object.defineProperty(viewport, 'scrollWidth', { value: 200 });
		Object.defineProperty(viewport, 'clientWidth', { value: 100 });

		await fireEvent.mouseEnter(container);
		await nextTick();
		expect(viewport.style.getPropertyValue('--marquee-distance')).toBe('-100px');
		expect(viewport.firstElementChild?.className).toContain('scrolling');
	});

	it('keeps the full name through the return transition', async function testReturn() {
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
		expect(viewport.className).toContain('marqueeMask');

		const transitionEnd = new Event('transitionend', { bubbles: true });
		Object.defineProperty(transitionEnd, 'propertyName', { value: 'transform' });
		await fireEvent(name, transitionEnd);
		expect(viewport.className).not.toContain('marqueeMask');
	});

	it('renders the attachment as a link that opens in a new tab', function testFileLink() {
		const { container } = render(N8nAttachment, {
			props: {
				fileName: 'example.pdf',
				mimeType: 'application/pdf',
				href: 'https://example.com/example.pdf',
			},
		});

		const link = screen.getByRole('link');
		expect(link).toHaveAttribute('href', 'https://example.com/example.pdf');
		expect(link).toHaveClass('n8n-attachment');
		expect(link.querySelector('a')).toBeNull();
		expect(link.querySelector('figcaption')).toBeNull();
		expect(screen.getByTitle('example.pdf').tagName).toBe('DIV');
		expect(container.firstElementChild).not.toHaveAttribute('href');
		expect(link).toHaveAttribute('target', '_blank');
		expect(link).toHaveAttribute('rel', 'noopener noreferrer');
		expect(link).not.toContainElement(screen.getByTestId('attachment-remove'));
	});

	it('does not use the thumbnail URL as a file link', function testThumbnailOnly() {
		render(N8nAttachment, {
			props: { fileName: 'photo.png', mimeType: 'image/png', src: '/thumbnail.png' },
		});

		expect(screen.queryByRole('link')).not.toBeInTheDocument();
	});

	it('removes the file link when removal starts', async function testRemoveLinkedFile() {
		const { baseElement, emitted } = render(N8nAttachment, {
			props: {
				fileName: 'example.pdf',
				mimeType: 'application/pdf',
				href: 'https://example.com/example.pdf',
			},
		});

		const sprite = baseElement.querySelector('img')!;
		await fireEvent.load(sprite);
		await fireEvent.click(screen.getByTestId('attachment-remove'));
		expect(screen.queryByRole('link')).not.toBeInTheDocument();
		await fireEvent.animationEnd(sprite);
		expect(emitted('remove')).toHaveLength(1);
	});

	it('names the remove button with the file name', function testRemoveLabel() {
		render(N8nAttachment, {
			props: { fileName: 'report.pdf', mimeType: 'application/pdf' },
		});

		expect(screen.getByRole('button', { name: 'Remove report.pdf' })).toBeVisible();
	});

	it('emits the preview load event', async function testPreviewLoad() {
		const { emitted } = render(N8nAttachment, {
			props: { fileName: 'photo.png', mimeType: 'image/png', src: '/photo.png' },
		});

		await fireEvent.load(screen.getByAltText('photo.png'));

		expect(emitted('load')).toHaveLength(1);
		expect(screen.getByRole('figure')).toHaveAttribute('data-type', 'image');
	});

	it('uses the file display when the preview URL is absent', function testMissingPreview() {
		render(N8nAttachment, {
			props: { fileName: 'photo.png', mimeType: 'image/png' },
		});

		expect(screen.queryByAltText('photo.png')).not.toBeInTheDocument();
		expect(screen.getByRole('figure')).toHaveAttribute('data-type', 'file');
		expect(screen.getByTitle('photo.png')).toBeVisible();
	});

	it('falls back after a preview error and retries a new URL', async function testPreviewError() {
		const { emitted, rerender } = render(N8nAttachment, {
			props: { fileName: 'photo.png', mimeType: 'image/png', src: '/photo.png' },
		});

		await fireEvent.error(screen.getByAltText('photo.png'));

		expect(emitted('error')).toHaveLength(1);
		expect(screen.queryByAltText('photo.png')).not.toBeInTheDocument();
		expect(screen.getByRole('figure')).toHaveAttribute('data-type', 'file');
		expect(screen.getByTitle('photo.png')).toBeVisible();
		expect(screen.getByRole('button', { name: 'Remove photo.png' })).toBeVisible();

		await rerender({ src: '/replacement.png' });

		expect(screen.getByAltText('photo.png')).toHaveAttribute('src', '/replacement.png');
		expect(screen.getByRole('figure')).toHaveAttribute('data-type', 'image');
	});

	it('renders the file name', function testContent() {
		render(N8nAttachment, {
			props: { fileName: 'example.pdf', mimeType: 'application/pdf' },
		});

		expect(screen.getByTitle('example.pdf')).toBeVisible();
	});
});
