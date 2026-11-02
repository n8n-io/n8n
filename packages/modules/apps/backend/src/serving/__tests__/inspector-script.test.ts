import { JSDOM } from 'jsdom';

import { APP_INSPECTOR_MESSAGE_SOURCE } from '@n8n/api-types';
import { buildInspectorScript, injectInspectorScript } from '../inspector-script';

const EDITOR_ORIGIN = 'https://n8n.example.net';

const COMMANDS = ['inspect:enable', 'inspect:disable', 'inspect:clear'];

type PostedMessage = { source: string; type: string; element?: Record<string, unknown> };

function setup(body = '<button data-testid="save">Save</button><p>Hello</p>') {
	const dom = new JSDOM(`<!doctype html><body>${body}</body>`, {
		url: `${EDITOR_ORIGIN}/orders/12`,
		runScripts: 'outside-only',
	});
	const { window } = dom;
	const posted: PostedMessage[] = [];
	window.addEventListener('message', (event) => {
		const { source, type } = event.data ?? {};
		if (source === APP_INSPECTOR_MESSAGE_SOURCE && !COMMANDS.includes(type))
			posted.push(event.data);
	});
	Object.assign(window, { CSS: { escape: (value: string) => value.replace(/"/g, '\\"') } });
	window.eval(buildInspectorScript(EDITOR_ORIGIN));

	const rects = new Map<Element, DOMRect>();
	const place = (element: Element, rect: Partial<DOMRect>) => {
		rects.set(element, { left: 0, top: 0, width: 0, height: 0, ...rect } as DOMRect);
		element.getBoundingClientRect = () => rects.get(element)!;
	};
	const button = window.document.querySelector('button')!;
	place(button, { left: 40, top: 60, width: 80, height: 30, right: 120, bottom: 90 });
	window.document.elementFromPoint = () => button;

	const send = (type: string, origin = EDITOR_ORIGIN) =>
		window.dispatchEvent(
			new window.MessageEvent('message', {
				data: { source: APP_INSPECTOR_MESSAGE_SOURCE, type },
				origin,
				source: window as unknown as MessageEventSource,
			}),
		);
	const overlay = (kind: 'hover' | 'selected') => {
		const host = [...window.document.documentElement.children].find((node) => node.shadowRoot);
		const box = host!.shadowRoot!.querySelector<HTMLElement>(`.box.${kind}`)!;
		return { box, label: box.querySelector('.label')!.textContent };
	};
	const hover = () =>
		window.document.dispatchEvent(new window.MouseEvent('mousemove', { clientX: 50, clientY: 70 }));
	const flush = async () => await new Promise((resolve) => setTimeout(resolve, 0));

	return { window, button, posted, place, send, overlay, hover, flush };
}

describe('inspector script', () => {
	it('shows a labelled hover overlay on the element under the cursor', () => {
		const { send, hover, overlay } = setup();

		send('inspect:enable');
		hover();

		const { box, label } = overlay('hover');
		expect(box.style.display).toBe('block');
		expect(box.style.left).toBe('40px');
		expect(box.style.top).toBe('60px');
		expect(box.style.width).toBe('80px');
		expect(label).toBe('<button> Save');
	});

	it('shows no overlay while inspect mode is off', () => {
		const { hover, overlay } = setup();

		hover();

		expect(overlay('hover').box.style.display).not.toBe('block');
	});

	it('ignores commands from another origin', () => {
		const { send, hover, overlay } = setup();

		send('inspect:enable', 'https://evil.example.net');
		hover();

		expect(overlay('hover').box.style.display).not.toBe('block');
	});

	it('reports the picked element and keeps it highlighted after inspect mode ends', async () => {
		const { window, button, posted, send, hover, overlay, flush } = setup();
		const appClick = vi.fn();
		button.addEventListener('click', appClick);

		send('inspect:enable');
		hover();
		button.dispatchEvent(
			new window.MouseEvent('click', { bubbles: true, cancelable: true, clientX: 50, clientY: 70 }),
		);
		await flush();

		expect(appClick).not.toHaveBeenCalled();
		expect(posted).toEqual([
			{
				source: APP_INSPECTOR_MESSAGE_SOURCE,
				type: 'inspect:selected',
				element: {
					tagName: 'button',
					text: 'Save',
					selector: '[data-testid="save"]',
					route: '/orders/12',
				},
			},
		]);
		expect(overlay('hover').box.style.display).toBe('none');
		expect(overlay('selected').box.style.display).toBe('block');
		expect(overlay('selected').label).toBe('<button> Save');
	});

	it('escapes the data-testid in the selector', async () => {
		const { window, posted, send, hover, flush } = setup(
			"<button data-testid='a\"b'>Save</button>",
		);

		send('inspect:enable');
		hover();
		window.document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter' }));
		await flush();

		expect(posted[0].element?.selector).toBe('[data-testid="a\\"b"]');
	});

	it('lets the app handle clicks again after a pick', () => {
		const { window, button, send, hover } = setup();
		const appClick = vi.fn();
		button.addEventListener('click', appClick);

		send('inspect:enable');
		hover();
		button.dispatchEvent(
			new window.MouseEvent('click', { bubbles: true, cancelable: true, clientX: 50, clientY: 70 }),
		);
		button.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));

		expect(appClick).toHaveBeenCalledTimes(1);
	});

	it('picks the highlighted element with Enter, for controls that get no pointer events', async () => {
		const { window, posted, send, hover, flush } = setup();

		send('inspect:enable');
		hover();
		window.document.dispatchEvent(
			new window.KeyboardEvent('keydown', { key: 'Enter', cancelable: true }),
		);
		await flush();

		expect(posted.map(({ type }) => type)).toEqual(['inspect:selected']);
	});

	it('cancels with Escape and keeps an earlier selection', async () => {
		const { window, posted, send, hover, overlay, flush } = setup();
		send('inspect:enable');
		hover();
		window.document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter' }));

		send('inspect:enable');
		window.document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape' }));
		await flush();

		expect(posted.map(({ type }) => type)).toEqual(['inspect:selected', 'inspect:cancelled']);
		expect(overlay('selected').box.style.display).toBe('block');
	});

	it('clears the selected overlay on inspect:clear', () => {
		const { window, send, hover, overlay } = setup();
		send('inspect:enable');
		hover();
		window.document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter' }));

		send('inspect:clear');

		expect(overlay('selected').box.style.display).toBe('none');
	});

	it('moves the selected overlay with the element on scroll', () => {
		const { window, button, send, hover, place, overlay } = setup();
		send('inspect:enable');
		hover();
		window.document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter' }));

		place(button, { left: 40, top: 10, width: 80, height: 30 });
		window.dispatchEvent(new window.Event('scroll'));

		expect(overlay('selected').box.style.top).toBe('10px');
	});

	it('hides the selected overlay when the element leaves the page', () => {
		const { window, button, send, hover, overlay } = setup();
		send('inspect:enable');
		hover();
		window.document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter' }));

		button.remove();
		window.dispatchEvent(new window.Event('resize'));

		expect(overlay('selected').box.style.display).toBe('none');
	});

	it('puts the label inside the overlay when the element touches the top edge', () => {
		const { button, send, hover, place, overlay } = setup();
		place(button, { left: 0, top: 4, width: 80, height: 30 });

		send('inspect:enable');
		hover();

		const label = overlay('hover').box.querySelector<HTMLElement>('.label')!;
		expect(label.style.top).toBe('32px');
	});
});

describe('injectInspectorScript', () => {
	it('adds the script before the closing body tag', () => {
		const html = injectInspectorScript(
			'<html><body><div id="app"></div></body></html>',
			EDITOR_ORIGIN,
		);

		expect(html).toMatch(/<div id="app"><\/div><script>.*<\/script><\/body><\/html>$/s);
		expect(html).toContain(JSON.stringify(EDITOR_ORIGIN));
	});

	it('appends the script when the document has no body tag', () => {
		const html = injectInspectorScript('<div id="app"></div>', EDITOR_ORIGIN);

		expect(html.startsWith('<div id="app"></div><script>')).toBe(true);
	});
});
