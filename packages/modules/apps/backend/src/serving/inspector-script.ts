import { APP_INSPECTOR_MESSAGE_SOURCE } from '@n8n/api-types';

const INSPECTOR_SOURCE = String.raw`function (editorOrigin, messageSource) {
	var INTERACTIVE = 'button, a, input, select, textarea, summary, [role="button"], [onclick]';
	var CAPTURED_POINTER_EVENTS = ['mousedown', 'mouseup', 'pointerdown', 'pointerup'];
	var active = false;
	var hovered = null;
	var selected = null;
	var selectedObserver = null;

	var host = document.createElement('div');
	host.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147483647;contain:layout style;';
	var shadow = host.attachShadow({ mode: 'open' });
	var style = document.createElement('style');
	style.textContent = [
		'.box { position: fixed; display: none; box-sizing: border-box; border: 2px solid #ff6d5a; border-radius: 3px; }',
		'.box.hover { background: rgba(255, 109, 90, 0.12); }',
		'.label { position: absolute; left: -2px; max-width: 260px; padding: 2px 6px; overflow: hidden; border-radius: 3px;',
		'background: #ff6d5a; color: #fff; font: 600 11px/16px system-ui, sans-serif; white-space: nowrap; text-overflow: ellipsis; }',
	].join('\n');
	shadow.append(style);

	function createBox(kind) {
		var box = document.createElement('div');
		box.className = 'box ' + kind;
		var label = document.createElement('div');
		label.className = 'label';
		box.append(label);
		shadow.append(box);
		return { box: box, label: label };
	}

	var hoverBox = createBox('hover');
	var selectedBox = createBox('selected');
	document.documentElement.append(host);

	function shortText(element, max) {
		return (element.textContent || '').replace(/\s+/g, ' ').trim().slice(0, max);
	}

	function place(target, element) {
		if (!element || !element.isConnected) {
			target.box.style.display = 'none';
			return;
		}
		var rect = element.getBoundingClientRect();
		if (rect.width === 0 && rect.height === 0) {
			target.box.style.display = 'none';
			return;
		}
		var text = shortText(element, 24);
		target.label.textContent = '<' + element.tagName.toLowerCase() + '>' + (text ? ' ' + text : '');
		target.label.style.top = rect.top < 24 ? rect.height + 2 + 'px' : '-20px';
		target.box.style.cssText =
			'display:block;left:' + rect.left + 'px;top:' + rect.top + 'px;width:' + rect.width + 'px;height:' + rect.height + 'px;';
	}

	function refresh() {
		place(hoverBox, active ? hovered : null);
		place(selectedBox, selected);
	}

	function area(rect) {
		return rect.width * rect.height;
	}

	function findInertAt(x, y) {
		var best = null;
		var bestArea = Infinity;
		var candidates = document.querySelectorAll(INTERACTIVE);
		for (var i = 0; i < candidates.length; i++) {
			var candidate = candidates[i];
			if (getComputedStyle(candidate).pointerEvents !== 'none') continue;
			var rect = candidate.getBoundingClientRect();
			if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) continue;
			if (area(rect) > 0 && area(rect) < bestArea) {
				best = candidate;
				bestArea = area(rect);
			}
		}
		return best;
	}

	function resolveAt(x, y) {
		var hit = document.elementFromPoint(x, y);
		if (!hit || hit === host) return null;
		var inert = findInertAt(x, y);
		if (inert && hit.contains(inert)) return inert;
		return hit.closest(INTERACTIVE) || hit;
	}

	function post(type, element) {
		window.parent.postMessage({ source: messageSource, type: type, element: element }, editorOrigin);
	}

	function identifies(selector, element) {
		try {
			var found = document.querySelectorAll(selector);
			return found.length === 1 && found[0] === element;
		} catch (error) {
			return false;
		}
	}

	function selectorOf(element) {
		var candidates = [];
		var testId = element.getAttribute('data-testid');
		if (testId) candidates.push('[data-testid="' + CSS.escape(testId) + '"]');
		if (element.id) candidates.push('#' + CSS.escape(element.id));
		var classes = Array.prototype.slice.call(element.classList, 0, 3);
		if (classes.length > 0) {
			candidates.push('.' + classes.map(function (name) { return CSS.escape(name); }).join('.'));
		}
		for (var i = 0; i < candidates.length; i++) {
			if (candidates[i].length <= 500 && identifies(candidates[i], element)) return candidates[i];
		}
		return undefined;
	}

	function describeElement(element) {
		var hash = location.hash.indexOf('#/') === 0 ? location.hash : '';
		return {
			tagName: element.tagName.toLowerCase().slice(0, 50),
			text: shortText(element, 200) || undefined,
			selector: selectorOf(element),
			route: (location.pathname + hash).slice(0, 500),
		};
	}

	function swallow(event) {
		event.preventDefault();
		event.stopPropagation();
		event.stopImmediatePropagation();
	}

	function onMouseMove(event) {
		hovered = resolveAt(event.clientX, event.clientY);
		refresh();
	}

	function pick(element) {
		if (!element) return;
		selected = element;
		if (selectedObserver) selectedObserver.disconnect();
		if (typeof ResizeObserver !== 'undefined') {
			selectedObserver = new ResizeObserver(refresh);
			selectedObserver.observe(element);
		}
		post('inspect:selected', describeElement(element));
		disable();
	}

	function onClick(event) {
		swallow(event);
		pick(resolveAt(event.clientX, event.clientY));
	}

	function onKeyDown(event) {
		if (event.key === 'Escape') {
			swallow(event);
			disable();
			post('inspect:cancelled');
		} else if (event.key === 'Enter' || event.key === ' ') {
			swallow(event);
			pick(hovered);
		}
	}

	function enable() {
		if (active) return;
		active = true;
		document.documentElement.style.cursor = 'crosshair';
		document.addEventListener('mousemove', onMouseMove, true);
		document.addEventListener('click', onClick, true);
		document.addEventListener('keydown', onKeyDown, true);
		CAPTURED_POINTER_EVENTS.forEach(function (type) {
			document.addEventListener(type, swallow, true);
		});
	}

	function disable() {
		if (!active) return;
		active = false;
		hovered = null;
		document.documentElement.style.cursor = '';
		document.removeEventListener('mousemove', onMouseMove, true);
		document.removeEventListener('click', onClick, true);
		document.removeEventListener('keydown', onKeyDown, true);
		CAPTURED_POINTER_EVENTS.forEach(function (type) {
			document.removeEventListener(type, swallow, true);
		});
		refresh();
	}

	function clear() {
		selected = null;
		if (selectedObserver) selectedObserver.disconnect();
		refresh();
	}

	window.addEventListener('scroll', refresh, true);
	window.addEventListener('resize', refresh);
	window.addEventListener('message', function (event) {
		if (event.origin !== editorOrigin || event.source !== window.parent) return;
		var data = event.data;
		if (typeof data !== 'object' || data === null || data.source !== messageSource) return;
		if (data.type === 'inspect:enable') enable();
		else if (data.type === 'inspect:disable') disable();
		else if (data.type === 'inspect:clear') clear();
	});
}`;

export function buildInspectorScript(editorOrigin: string): string {
	const args = [editorOrigin, APP_INSPECTOR_MESSAGE_SOURCE]
		.map((value) => JSON.stringify(value).replace(/</g, '\\u003c'))
		.join(',');
	return `(${INSPECTOR_SOURCE})(${args});`;
}

export function injectInspectorScript(html: string, editorOrigin: string): string {
	const tag = `<script>${buildInspectorScript(editorOrigin)}</script>`;
	const bodyClose = html.lastIndexOf('</body>');
	if (bodyClose === -1) return html + tag;
	return html.slice(0, bodyClose) + tag + html.slice(bodyClose);
}
