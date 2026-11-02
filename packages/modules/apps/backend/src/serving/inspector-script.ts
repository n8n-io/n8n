import { APP_INSPECTOR_MESSAGE_SOURCE } from '@n8n/api-types';

export function runInspector(editorOrigin: string, messageSource: string) {
	const INTERACTIVE = 'button, a, input, select, textarea, summary, [role="button"], [onclick]';
	const CAPTURED_POINTER_EVENTS = ['mousedown', 'mouseup', 'pointerdown', 'pointerup'] as const;

	type Box = { box: HTMLElement; label: HTMLElement };

	let active = false;
	let hovered: Element | null = null;
	let selected: Element | null = null;
	let selectedObserver: ResizeObserver | undefined;

	const host = document.createElement('div');
	host.style.cssText =
		'position:fixed;inset:0;pointer-events:none;z-index:2147483647;contain:layout style;';
	const shadow = host.attachShadow({ mode: 'open' });
	const style = document.createElement('style');
	style.textContent = `
		.box { position: fixed; display: none; box-sizing: border-box; border: 2px solid #ff6d5a; border-radius: 3px; }
		.box.hover { background: rgba(255, 109, 90, 0.12); }
		.label { position: absolute; left: -2px; max-width: 260px; padding: 2px 6px; overflow: hidden; border-radius: 3px;
			background: #ff6d5a; color: #fff; font: 600 11px/16px system-ui, sans-serif; white-space: nowrap; text-overflow: ellipsis; }
	`;
	const createBox = (kind: 'hover' | 'selected'): Box => {
		const box = document.createElement('div');
		box.className = `box ${kind}`;
		const label = document.createElement('div');
		label.className = 'label';
		box.append(label);
		shadow.append(box);
		return { box, label };
	};
	shadow.append(style);
	const hoverBox = createBox('hover');
	const selectedBox = createBox('selected');
	document.documentElement.append(host);

	const shortText = (element: Element, max: number) =>
		(element.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

	const place = ({ box, label }: Box, element: Element | null) => {
		if (!element?.isConnected) {
			box.style.display = 'none';
			return;
		}
		const rect = element.getBoundingClientRect();
		if (rect.width === 0 && rect.height === 0) {
			box.style.display = 'none';
			return;
		}
		const text = shortText(element, 24);
		label.textContent = `<${element.tagName.toLowerCase()}>${text ? ` ${text}` : ''}`;
		label.style.top = rect.top < 24 ? `${rect.height + 2}px` : '-20px';
		box.style.cssText = `display:block;left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;`;
	};

	const refresh = () => {
		place(hoverBox, active ? hovered : null);
		place(selectedBox, selected);
	};

	const area = (rect: DOMRect) => rect.width * rect.height;

	const findInertAt = (x: number, y: number) => {
		let best: Element | null = null;
		let bestArea = Infinity;
		for (const candidate of document.querySelectorAll(INTERACTIVE)) {
			if (getComputedStyle(candidate).pointerEvents !== 'none') continue;
			const rect = candidate.getBoundingClientRect();
			if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) continue;
			if (area(rect) > 0 && area(rect) < bestArea) {
				best = candidate;
				bestArea = area(rect);
			}
		}
		return best;
	};

	const resolveAt = (x: number, y: number) => {
		const hit = document.elementFromPoint(x, y);
		if (!hit || hit === host) return null;
		const inert = findInertAt(x, y);
		if (inert && hit.contains(inert)) return inert;
		return hit.closest(INTERACTIVE) ?? hit;
	};

	const post = (message: Record<string, unknown>) =>
		window.parent.postMessage({ source: messageSource, ...message }, editorOrigin);

	const selectorOf = (element: Element) => {
		const testId = element.getAttribute('data-testid');
		if (testId) return `[data-testid="${CSS.escape(testId)}"]`;
		if (element.id) return `#${CSS.escape(element.id)}`;
		const classes = [...element.classList].slice(0, 3);
		return classes.length > 0 ? `.${classes.map((name) => CSS.escape(name)).join('.')}` : undefined;
	};

	const describeElement = (element: Element) => ({
		tagName: element.tagName.toLowerCase(),
		text: shortText(element, 200) || undefined,
		selector: selectorOf(element),
		route: location.pathname + (location.hash.startsWith('#/') ? location.hash : ''),
	});

	const swallow = (event: Event) => {
		event.preventDefault();
		event.stopPropagation();
		event.stopImmediatePropagation();
	};

	const onMouseMove = (event: MouseEvent) => {
		hovered = resolveAt(event.clientX, event.clientY);
		refresh();
	};

	const pick = (element: Element | null) => {
		if (!element) return;
		selected = element;
		selectedObserver?.disconnect();
		if (typeof ResizeObserver !== 'undefined') {
			selectedObserver = new ResizeObserver(refresh);
			selectedObserver.observe(element);
		}
		post({ type: 'inspect:selected', element: describeElement(element) });
		disable();
	};

	const onClick = (event: MouseEvent) => {
		swallow(event);
		pick(resolveAt(event.clientX, event.clientY));
	};

	const onKeyDown = (event: KeyboardEvent) => {
		if (event.key === 'Escape') {
			swallow(event);
			disable();
			post({ type: 'inspect:cancelled' });
		} else if (event.key === 'Enter' || event.key === ' ') {
			swallow(event);
			pick(hovered);
		}
	};

	function enable() {
		if (active) return;
		active = true;
		document.documentElement.style.cursor = 'crosshair';
		document.addEventListener('mousemove', onMouseMove, true);
		document.addEventListener('click', onClick, true);
		document.addEventListener('keydown', onKeyDown, true);
		for (const type of CAPTURED_POINTER_EVENTS) document.addEventListener(type, swallow, true);
	}

	function disable() {
		if (!active) return;
		active = false;
		hovered = null;
		document.documentElement.style.cursor = '';
		document.removeEventListener('mousemove', onMouseMove, true);
		document.removeEventListener('click', onClick, true);
		document.removeEventListener('keydown', onKeyDown, true);
		for (const type of CAPTURED_POINTER_EVENTS) document.removeEventListener(type, swallow, true);
		refresh();
	}

	function clear() {
		selected = null;
		selectedObserver?.disconnect();
		refresh();
	}

	window.addEventListener('scroll', refresh, true);
	window.addEventListener('resize', refresh);
	window.addEventListener('message', (event) => {
		if (event.origin !== editorOrigin || event.source !== window.parent) return;
		const data: unknown = event.data;
		if (typeof data !== 'object' || data === null) return;
		const message = data as { source?: unknown; type?: unknown };
		if (message.source !== messageSource) return;
		if (message.type === 'inspect:enable') enable();
		else if (message.type === 'inspect:disable') disable();
		else if (message.type === 'inspect:clear') clear();
	});
}

export function buildInspectorScript(editorOrigin: string): string {
	const args = [editorOrigin, APP_INSPECTOR_MESSAGE_SOURCE]
		.map((value) => JSON.stringify(value).replace(/</g, '\\u003c'))
		.join(',');
	return `(${runInspector.toString()})(${args});`;
}

export function injectInspectorScript(html: string, editorOrigin: string): string {
	const tag = `<script>${buildInspectorScript(editorOrigin)}</script>`;
	const bodyClose = html.lastIndexOf('</body>');
	if (bodyClose === -1) return html + tag;
	return html.slice(0, bodyClose) + tag + html.slice(bodyClose);
}
