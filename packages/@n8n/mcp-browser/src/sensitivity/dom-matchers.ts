export const TESTID_ATTRS = ['data-testid', 'data-test-id', 'data-test', 'data-qa'] as const;

export const SENSITIVE_TESTID_PATTERN =
	/(^|[-_\s])(api[-_\s]?key|apikey|admin[-_\s]?key|access[-_\s]?token|auth[-_\s]?token|session[-_\s]?token|secret|credential|password|key)([-_\s]|$)/i;

export const SENSITIVE_ARIA_LABEL_PATTERN =
	/(api[-_\s]?key|secret[-_\s]?key|access[-_\s]?token|auth[-_\s]?token|client[-_\s]?secret|password|credential)/i;

export const ARIA_PASSWORD_LABEL_PATTERN =
	/(password|passcode|secret|api[-_\s]?key|token|credential)/i;

export const PASSWORD_AUTOCOMPLETE_PATTERN =
	/(current-password|new-password|one-time-code|api-key|token|credential)/i;

export const COPY_BUTTON_PATTERN =
	/(^|\b)(copy|copier|copiar|copia|copiato|kopieren|コピー(?:する)?|复制|複製|복사)(\b|$)/i;

export const REVEAL_BUTTON_PATTERN =
	/(reveal|show|unhide|view).*(api\s*key|key|secret|token|password|credential)/i;

export const REVEAL_PHRASE_PATTERNS = [
	/you won't (?:see|be shown|be able to see|be able to retrieve|be able to access).*again/i,
	/(?:save|copy|store|keep|note|notiere).*(?:key|schlüssel|secret|token|password|credential|backup code|safe)/i,
	/(?:only|one) time.*(?:see|shown|show)/i,
	/(?:shown|show).*only once/i,
	/only show it once/i,
	/treat this as a password/i,
	/we won't show it to you again/i,
	/you cannot see this password again/i,
] as const;

export function getTestId(el: Element): string {
	for (const attr of TESTID_ATTRS) {
		const value = el.getAttribute(attr);
		if (value) return value;
	}
	return '';
}

export function elementLabel(el: Element, doc: Document): string {
	const aria = el.getAttribute('aria-label')?.trim();
	if (aria) return aria;
	const labelledBy = el.getAttribute('aria-labelledby');
	if (!labelledBy) return '';
	return labelledBy
		.split(/\s+/)
		.map((id) => doc.getElementById(id)?.textContent?.trim() ?? '')
		.filter(Boolean)
		.join(' ');
}

export function elementText(el: Element): string {
	const parts: string[] = [];
	for (const node of Array.from(el.childNodes)) {
		if (node.nodeType === node.TEXT_NODE) {
			const text = node.textContent?.trim();
			if (text) parts.push(text);
		} else if (node instanceof el.ownerDocument.defaultView!.Element) {
			const text = elementText(node);
			if (text) parts.push(text);
		}
	}
	return parts.join(' ').trim().replace(/\s+/g, ' ');
}

export function isSensitiveInput(el: Element): el is HTMLInputElement | HTMLTextAreaElement {
	if (!(el instanceof el.ownerDocument.defaultView!.HTMLInputElement)) return false;
	const type = (el.getAttribute('type') ?? '').toLowerCase();
	const aria = el.getAttribute('aria-label') ?? '';
	const autocomplete = el.getAttribute('autocomplete') ?? '';
	const testId = getTestId(el);
	const readOnly = el.hasAttribute('readonly') || el.hasAttribute('disabled');
	const noSpell = el.getAttribute('spellcheck') === 'false';
	const value = el.getAttribute('value') ?? '';
	return (
		type === 'password' ||
		ARIA_PASSWORD_LABEL_PATTERN.test(aria) ||
		PASSWORD_AUTOCOMPLETE_PATTERN.test(autocomplete) ||
		(!!testId && SENSITIVE_TESTID_PATTERN.test(testId)) ||
		(readOnly && noSpell && value.length >= 20)
	);
}

export function hasButtonMatching(scope: Element, pattern: RegExp): boolean {
	for (const button of Array.from(scope.querySelectorAll('button, [role="button"]'))) {
		const label = button.getAttribute('aria-label')?.trim() ?? elementText(button);
		if (label && pattern.test(label)) return true;
	}
	return false;
}

export function shannonEntropy(value: string): number {
	if (!value) return 0;
	const counts = new Map<string, number>();
	for (const char of value) counts.set(char, (counts.get(char) ?? 0) + 1);
	let entropy = 0;
	for (const count of counts.values()) {
		const p = count / value.length;
		entropy -= p * Math.log2(p);
	}
	return entropy;
}

export function highEntropyCandidates(text: string): string[] {
	const candidates = text.match(/[A-Za-z0-9_/+=-]{20,}/g) ?? [];
	return candidates.filter((candidate) => shannonEntropy(candidate) >= 4.5);
}
