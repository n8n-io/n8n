/**
 * Runs inside a served App document (opaque-origin, sandboxed) to let the parent
 * editor-ui pick an element for the Instance AI chat. The parent cannot reach into
 * this document's DOM directly, so all of the hover-highlight/click-catch logic
 * lives here and reports back over `postMessage`.
 */
export const INSPECTOR_SCRIPT_SOURCE = `(function () {
	var ACTIVE = false;
	var overlay;
	var lastHovered = null;
	var INTERACTIVE_SELECTOR = 'button, a, input, select, textarea, summary, [role="button"], [onclick]';

	function rectArea(rect) {
		return rect.width * rect.height;
	}

	// A disabled/pointer-events:none control (still worth selecting — e.g. to
	// ask for it to be enabled, or its label changed) never receives real
	// pointer events, so the browser's own hit-test skips straight past it to
	// whatever is behind it. Find the smallest such control whose box contains
	// the cursor, so it can still be picked.
	function findInertCandidateAt(x, y) {
		var candidates = document.querySelectorAll(INTERACTIVE_SELECTOR);
		var best = null;
		var bestRect = null;
		for (var i = 0; i < candidates.length; i++) {
			var el = candidates[i];
			if (getComputedStyle(el).pointerEvents !== 'none') continue;
			var rect = el.getBoundingClientRect();
			if (rect.width === 0 || rect.height === 0) continue;
			if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) continue;
			if (!best || rectArea(rect) < rectArea(bestRect)) {
				best = el;
				bestRect = rect;
			}
		}
		return best;
	}

	// Most buttons/links wrap their label in a child (a <span>, an icon).
	// Hovering the label itself would otherwise select that inner element
	// instead of the button — climb to the nearest interactive ancestor.
	// Prefer a geometrically-matched inert control only when it actually sits
	// under the natively hit element, so one obscured by something else on
	// top of it (e.g. a modal) is correctly skipped.
	function resolveHoveredElement(x, y) {
		var nativeHit = document.elementFromPoint(x, y);
		if (!(nativeHit instanceof Element) || nativeHit === overlay) return null;
		var inert = findInertCandidateAt(x, y);
		if (inert && nativeHit.contains(inert)) return inert;
		return nativeHit.closest(INTERACTIVE_SELECTOR) || nativeHit;
	}

	function ensureOverlay() {
		if (overlay) return overlay;
		overlay = document.createElement('div');
		overlay.style.position = 'fixed';
		overlay.style.zIndex = '2147483647';
		overlay.style.pointerEvents = 'none';
		overlay.style.border = '2px solid #ff6d5a';
		overlay.style.borderRadius = '2px';
		overlay.style.background = 'rgba(255, 109, 90, 0.1)';
		overlay.style.display = 'none';
		document.body.appendChild(overlay);
		return overlay;
	}

	function onMouseMove(event) {
		var target = resolveHoveredElement(event.clientX, event.clientY);
		lastHovered = target;
		var box = ensureOverlay();
		if (!target) {
			box.style.display = 'none';
			return;
		}
		var rect = target.getBoundingClientRect();
		box.style.display = 'block';
		box.style.top = rect.top + 'px';
		box.style.left = rect.left + 'px';
		box.style.width = rect.width + 'px';
		box.style.height = rect.height + 'px';
	}

	// The served document's own URL is /apps/<namespace>/<app-relative path>, or
	// /apps-preview/<token>/<app-relative path> for a thread's live preview —
	// strip that two-segment prefix so the route is relative to the app itself
	// (what AppPreviewFrame's \`path\` prop and the app's own router.ts expect),
	// not the serving path.
	function appRelativeRoute() {
		var segments = window.location.pathname.split('/').filter(Boolean);
		return '/' + segments.slice(2).join('/');
	}

	function describe(target) {
		var testId = target.getAttribute('data-testid');
		var selector = testId
			? '[data-testid="' + testId + '"]'
			: target.id
				? '#' + target.id
				: typeof target.className === 'string' && target.className.trim()
					? '.' + target.className.trim().split(/\\s+/).join('.')
					: undefined;
		return {
			tagName: target.tagName.toLowerCase(),
			text: (target.textContent || '').trim().slice(0, 200) || undefined,
			selector: selector,
			route: appRelativeRoute(),
		};
	}

	// One pick and inspect mode ends, matching the toggle turning back off in
	// the parent (which posts a matching inspect:disable, but not fast enough
	// to avoid a flash of the overlay/cursor — turn off locally right away too).
	function select(target) {
		if (!target) return;
		window.parent.postMessage({ source: 'n8nable', type: 'inspect:selected', element: describe(target) }, '*');
		disable();
	}

	function onClick(event) {
		var target = resolveHoveredElement(event.clientX, event.clientY);
		if (!target) return;
		event.preventDefault();
		event.stopPropagation();
		select(target);
	}

	// A disabled form control dispatches no pointer event at all — not just
	// click, but mousedown/mouseup/pointerdown/pointerup too (a hard platform
	// behavior, not a pointer-events quirk) — so it can never be clicked to
	// select. Enter/Space selects whatever is currently highlighted instead.
	function onKeyDown(event) {
		if (event.key !== 'Enter' && event.key !== ' ') return;
		event.preventDefault();
		select(lastHovered);
	}

	function enable() {
		if (ACTIVE) return;
		ACTIVE = true;
		document.body.style.cursor = 'crosshair';
		document.addEventListener('mousemove', onMouseMove, true);
		document.addEventListener('click', onClick, true);
		document.addEventListener('keydown', onKeyDown, true);
	}

	function disable() {
		if (!ACTIVE) return;
		ACTIVE = false;
		document.body.style.cursor = '';
		document.removeEventListener('mousemove', onMouseMove, true);
		document.removeEventListener('click', onClick, true);
		document.removeEventListener('keydown', onKeyDown, true);
		lastHovered = null;
		if (overlay) overlay.style.display = 'none';
	}

	// The editor's preview can try the app in another color scheme without
	// saving it: the template toggles the same class from its saved theme mode.
	function setTheme(mode) {
		var dark =
			mode === 'dark' ||
			(mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
		document.documentElement.classList.toggle('dark', dark);
	}

	window.addEventListener('message', function (event) {
		var data = event.data;
		if (!data || data.source !== 'n8nable') return;
		if (data.type === 'inspect:enable') enable();
		else if (data.type === 'inspect:disable') disable();
		else if (data.type === 'theme:set') setTheme(data.mode);
	});
})();
`;
