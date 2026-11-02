import { fireEvent, render, screen } from '@testing-library/vue';

import N8nAttachment from './Attachment.vue';

describe('N8nAttachment', function describeComponent() {
	it('emits removal', async function testActions() {
		const { emitted } = render(N8nAttachment, {
			props: { fileName: 'example.pdf', mimeType: 'application/pdf' },
		});

		await fireEvent.click(screen.getByRole('button', { name: 'Remove' }));

		expect(emitted('remove')).toHaveLength(1);
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
