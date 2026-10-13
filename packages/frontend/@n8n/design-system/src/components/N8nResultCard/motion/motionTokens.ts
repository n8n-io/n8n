/**
 * Runtime access to the motion tokens declared in `_tokens.scss`. The primitives
 * that need a JS timer (text swap, morph, soft swap, dropdown close) read the
 * same custom property the CSS transition uses, so changing a token in one
 * place changes both. Fallbacks are the reference values.
 */

export function readToken(el: Element | null | undefined, name: string, fallback: string): string {
	if (!el || typeof getComputedStyle !== 'function') return fallback;
	const value = getComputedStyle(el).getPropertyValue(name).trim();
	return value || fallback;
}

/** Reads a `<time>` token in milliseconds; accepts `250ms` and `0.25s`. */
export function readMs(el: Element | null | undefined, name: string, fallback: number): number {
	const raw = readToken(el, name, '');
	if (!raw) return fallback;
	const value = parseFloat(raw);
	if (!Number.isFinite(value)) return fallback;
	return /s$/.test(raw) && !/ms$/.test(raw) ? value * 1000 : value;
}

/** Reads a unitless or `px`/`deg` token as a number. */
export function readNumber(el: Element | null | undefined, name: string, fallback: number): number {
	const value = parseFloat(readToken(el, name, ''));
	return Number.isFinite(value) ? value : fallback;
}

export function prefersReducedMotion(): boolean {
	return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Forces a style flush so a class added right after a DOM change starts a transition from its start state. */
export function reflow(el: Element | null | undefined): void {
	if (el instanceof HTMLElement) void el.offsetHeight;
}
