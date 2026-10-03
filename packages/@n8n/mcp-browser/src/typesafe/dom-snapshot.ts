/**
 * In-page candidate snapshot for the `browser_act` loop.
 *
 * Why not the accessibility tree: `ariaSnapshot({ mode: 'ai' })` annotates
 * nearly every node — measured 49 refs for 10 real controls — and carries no
 * geometry, so there is no way to tell a control that is merely below the fold
 * from one clipped out of a non-scrollable carousel. A date picker makes that
 * difference decisive: the hidden months are `checkVisibility() === true` and
 * would be offered as targets.
 *
 * The test used here is computed visibility, plus `aria-hidden`/`inert`, plus
 * an ancestor walk asking whether the element lies inside each clipping
 * ancestor's **scrollable extent** rather than its current client box. A
 * below-the-fold button and one inside a scrollable div both pass; a month
 * translated out of an `overflow: hidden` carousel does not. Against
 * Playwright's own clickability this matched on 7 of 8 fixture cases, the
 * exception being `aria-hidden`, which Playwright clicks and this rejects on
 * purpose.
 *
 * Node identity lives in a page-side `WeakMap`/`Map` pair, so an id refers to
 * an actual observed element rather than a selector the model invented. Ids
 * are not Playwright `aria-ref` values.
 */

import { z } from 'zod';

import { redactString } from '../redaction/redact';
import { MAX_CANDIDATES, type SnapshotElement } from './snapshot-elements';

/** Page-side state key. Kept off `window` names a site is likely to use. */
const CACHE = '__n8nBrowserAct';

/**
 * Value length kept after redaction.
 *
 * Truncation happens here rather than in the page, and only once redaction has
 * run: the secret patterns require a minimum token length, so cutting a long
 * value first can drop it below the threshold and leak the fragment that
 * remains.
 */
const MAX_VALUE_LENGTH = 200;

/** Page-side ceiling, generous enough that a secret arrives whole to be matched. */
const PROBE_VALUE_LENGTH = 2000;

/**
 * Attribute used to hand a chosen element to the existing click/type path.
 *
 * Execution stays with the adapter — real pointer events, actionability
 * guards, `waitForCompletion` — and the adapter addresses elements by selector
 * or `aria-ref`. Neither can name a page-side id, so the element is marked for
 * the duration of one action and unmarked afterwards.
 */
export const TARGET_ATTRIBUTE = 'data-n8n-act-target';

const elementSchema = z.object({
	id: z.string(),
	role: z.string(),
	name: z.string(),
	value: z.string().optional(),
	context: z.string().optional(),
	state: z.string().optional(),
	disabled: z.boolean().optional(),
	required: z.boolean().optional(),
});

const resultSchema = z.object({
	url: z.string(),
	title: z.string(),
	elements: z.array(elementSchema),
	omitted: z.number(),
});

export type DomSnapshot = z.infer<typeof resultSchema>;

/**
 * Reads candidates. Returns `null` when the document cannot be read at all, so
 * the caller can fall back to the accessibility tree.
 */
export function parseDomSnapshot(raw: unknown): DomSnapshot | null {
	const parsed = resultSchema.safeParse(raw);
	if (!parsed.success) return null;
	return parsed.data;
}

/** Candidates in the shape the question builder already understands. */
export function toSnapshotElements(snapshot: DomSnapshot): SnapshotElement[] {
	return snapshot.elements.map((element) => {
		const flags = [
			element.state,
			element.disabled ? 'disabled=true' : '',
			element.required ? 'required=true' : '',
		]
			.filter(Boolean)
			.join(' ');
		return {
			ref: element.id,
			role: element.role,
			name: clean(element.name),
			// The vendor is a third party and a field can hold a secret the page put
			// there. Values pass through the same redaction as any tool result.
			...(element.value ? { value: clean(element.value) } : {}),
			...(flags ? { state: flags } : {}),
			...(element.context ? { context: clean(element.context) } : {}),
			...(element.disabled ? { disabled: true } : {}),
		};
	});
}

function clean(value: string): string {
	return redactString(value).slice(0, MAX_VALUE_LENGTH);
}

/**
 * The script evaluated in the page. Written as a string because it runs in the
 * browser, not here; kept in one expression so `adapter.evaluate` can return
 * its value directly.
 */
export const DOM_SNAPSHOT_SCRIPT = `(() => {
  if (!document.body) return null;
  var cache = window.${CACHE} = window.${CACHE} || { ids: new WeakMap(), nodes: new Map(), next: 1 };
  for (var entry of cache.nodes) if (!entry[1].isConnected) cache.nodes.delete(entry[0]);
  function identity(el) {
    if (!cache.ids.has(el)) cache.ids.set(el, 'n' + cache.next++);
    var id = cache.ids.get(el);
    cache.nodes.set(id, el);
    return id;
  }

  var ROLES = ['button','link','checkbox','radio','switch','tab','menuitem','menuitemcheckbox',
    'menuitemradio','option','combobox','textbox','searchbox','spinbutton','slider','gridcell','treeitem'];
  var SELECTOR = 'a[href],button,input,textarea,select,summary,[contenteditable="true"],' +
    ROLES.map(function (r) { return '[role="' + r + '"]'; }).join(',');

  // Never read these: a password or file field's value is not ours to send.
  function safe(el) { return ['password','file','hidden'].indexOf(el.type) === -1; }

  function role(el) {
    var explicit = el.getAttribute('role');
    if (ROLES.indexOf(explicit) !== -1) return explicit;
    if (el.tagName === 'BUTTON' || el.tagName === 'SUMMARY') return 'button';
    if (el.tagName === 'A') return 'link';
    if (el.tagName === 'SELECT') return 'combobox';
    if (el.tagName === 'TEXTAREA' || el.isContentEditable) return 'textbox';
    if (el.tagName === 'INPUT') {
      if (['checkbox','radio'].indexOf(el.type) !== -1) return el.type;
      if (['button','submit','reset','image'].indexOf(el.type) !== -1) return 'button';
      if (el.type === 'search') return 'searchbox';
      if (el.type === 'number') return 'spinbutton';
      if (['text','email','url','tel','password'].indexOf(el.type) !== -1) return 'textbox';
    }
    return null;
  }

  function label(el, seen) {
    seen = seen || new Set();
    if (!el || seen.has(el)) return '';
    seen.add(el);
    var referenced = (el.getAttribute && el.getAttribute('aria-labelledby') || '').split(/\\s+/)
      .map(function (id) { return label(document.getElementById(id), seen); })
      .filter(Boolean).join(' ');
    if (referenced) return referenced;
    var aria = el.getAttribute && el.getAttribute('aria-label');
    if (aria) return aria;
    if (el.labels && el.labels.length) {
      var fromLabels = Array.prototype.map.call(el.labels, function (l) { return label(l, seen); })
        .filter(Boolean).join(' ');
      if (fromLabels) return fromLabels;
    }
    if (['button','submit','reset'].indexOf(el.type) !== -1 && el.value) return el.value;
    var alt = el.getAttribute && el.getAttribute('alt');
    if (alt) return alt;
    if (el.tagName !== 'INPUT') {
      var text = Array.prototype.map.call(el.childNodes, function (n) {
        if (n.nodeType === 3) return n.textContent;
        if (n.nodeType === 1 && n.getAttribute('aria-hidden') !== 'true') return label(n, seen);
        return '';
      }).join(' ').replace(/\\s+/g, ' ').trim();
      if (text) return text;
    }
    return (el.getAttribute && (el.getAttribute('title') || el.getAttribute('placeholder'))) || '';
  }

  /**
   * Can the element be brought into view at all? Viewport position is
   * deliberately NOT part of this: a control below the fold or inside a
   * scrollable container is reachable, and rejecting it would drop real
   * targets.
   */
  function reachable(el) {
    if (!el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false;
    if (el.closest('[aria-hidden="true"],[inert]')) return false;
    var rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;
    // Covered by something on top — an open dialog's overlay, a sticky bar.
    // Only checked while the centre is inside the viewport, because
    // elementFromPoint answers about the viewport and returns null outside it;
    // penalising that would drop every control below the fold. Uses contains
    // rather than identity, since a button's centre usually resolves to an
    // icon or span inside it.
    var cx = rect.x + rect.width / 2, cy = rect.y + rect.height / 2;
    if (cx >= 0 && cy >= 0 && cx < innerWidth && cy < innerHeight) {
      if (!el.contains(document.elementFromPoint(cx, cy))) return false;
    }
    var node = el.parentElement;
    while (node) {
      var style = getComputedStyle(node);
      if (/hidden|clip|auto|scroll/.test(style.overflowX + style.overflowY)) {
        var box = node.getBoundingClientRect();
        var top = rect.top - box.top + node.scrollTop;
        var left = rect.left - box.left + node.scrollLeft;
        if (top < -1 || top > node.scrollHeight + 1) return false;
        if (left < -1 || left > node.scrollWidth + 1) return false;
      }
      node = node.parentElement;
    }
    return true;
  }

  /** The row, dialog or section an element sits in, to tell repeated labels apart. */
  function context(el) {
    var scope = el.closest('tr,[role="row"],li,[role="listitem"],dialog,[role="dialog"],fieldset,form,section,[role="region"],table,[role="grid"]');
    while (scope) {
      var named = label(scope);
      if (named && named.length <= 120) return named;
      scope = scope.parentElement && scope.parentElement.closest('tr,[role="row"],li,dialog,[role="dialog"],fieldset,form,section,[role="region"]');
    }
    return '';
  }

  var elements = [];
  var nodes = document.querySelectorAll(SELECTOR);
  for (var i = 0; i < nodes.length; i++) {
    var el = nodes[i];
    if (!safe(el)) continue;
    var name = role(el);
    if (!name) continue;
    if (!reachable(el)) continue;
    var entry = { id: identity(el), role: name, name: String(label(el) || '').slice(0, 200) };
    // Reported rather than dropped. A disabled submit is the clearest sign that
    // a required field is still empty, and hiding it leaves the best
    // goal-matching label elsewhere on the page — which is how a run ends up
    // re-clicking the button that opened the dialog it is already inside.
    if (el.matches(':disabled') || el.closest('[aria-disabled="true"]')) entry.disabled = true;
    if (el.required || el.getAttribute('aria-required') === 'true') entry.required = true;
    var scope = context(el);
    if (scope && scope !== entry.name) entry.context = scope.slice(0, 120);
    if (el.tagName === 'SELECT') {
      entry.value = Array.prototype.map.call(el.selectedOptions, function (o) { return o.label; }).join(', ').slice(0, ${PROBE_VALUE_LENGTH});
    } else if ('value' in el && typeof el.value === 'string') {
      entry.value = el.value.slice(0, ${PROBE_VALUE_LENGTH});
    } else if (el.isContentEditable) {
      entry.value = (el.innerText || '').trim().slice(0, ${PROBE_VALUE_LENGTH});
    }
    var flags = [];
    for (var key of ['checked','selected','expanded']) {
      var attr = el.getAttribute('aria-' + key);
      if (attr !== null) flags.push(key + '=' + attr);
    }
    if (['checkbox','radio'].indexOf(el.type) !== -1) flags.push('checked=' + el.checked);
    if (flags.length) entry.state = flags.join(' ');
    elements.push(entry);
  }

  var omitted = Math.max(0, elements.length - ${MAX_CANDIDATES});
  elements.length = Math.min(elements.length, ${MAX_CANDIDATES});
  return { url: location.href, title: document.title, elements: elements, omitted: omitted };
})()`;

/**
 * Marks one candidate so the adapter can address it, and reports whether it is
 * still there and still reachable. A stale or newly-hidden target returns
 * `false` and the action is refused rather than sent somewhere else.
 */
export function markTargetScript(id: string): string {
	return `(() => {
  var cache = window.${CACHE};
  if (!cache) return false;
  var previous = document.querySelectorAll('[${TARGET_ATTRIBUTE}]');
  for (var i = 0; i < previous.length; i++) previous[i].removeAttribute('${TARGET_ATTRIBUTE}');
  var el = cache.nodes.get(${JSON.stringify(id)});
  if (!el || !el.isConnected) return false;
  if (!el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false;
  if (el.closest('[aria-hidden="true"],[inert]')) return false;
  if (el.matches(':disabled') || el.closest('[aria-disabled="true"]')) return false;
  // Refuse a covered element here rather than letting the driver retry against
  // an overlay until its timeout. Same viewport caveat as the probe: outside
  // it, elementFromPoint cannot answer and the driver scrolls before acting.
  var rect = el.getBoundingClientRect();
  var cx = rect.x + rect.width / 2, cy = rect.y + rect.height / 2;
  if (cx >= 0 && cy >= 0 && cx < innerWidth && cy < innerHeight) {
    if (!el.contains(document.elementFromPoint(cx, cy))) return false;
  }
  el.setAttribute('${TARGET_ATTRIBUTE}', '1');
  return true;
})()`;
}

export const CLEAR_TARGET_SCRIPT = `(() => {
  var marked = document.querySelectorAll('[${TARGET_ATTRIBUTE}]');
  for (var i = 0; i < marked.length; i++) marked[i].removeAttribute('${TARGET_ATTRIBUTE}');
  return true;
})()`;

/** Selector the adapter uses for whichever element is currently marked. */
export const TARGET_SELECTOR = `[${TARGET_ATTRIBUTE}]`;
