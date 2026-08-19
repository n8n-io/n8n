import { JSDOM, VirtualConsole } from 'jsdom';

import {
	getAssociatedLabelText,
	COPY_BUTTON_PATTERN,
	elementLabel,
	elementText,
	hasButtonMatching,
	highEntropyCandidates,
	isSensitiveInput,
	getLabelTextByControlIdMap,
	REVEAL_BUTTON_PATTERN,
	REVEAL_PHRASE_PATTERNS,
	sensitiveInputValues,
	SENSITIVE_ARIA_LABEL_PATTERN,
	SENSITIVE_FIELD_LABEL_PATTERN,
	SENSITIVE_TESTID_PATTERN,
	getTestId,
} from './dom-matchers';
import type { SecretHit } from '../redaction/redact';
import { CONCATENATED_ONLY, collectHit, findRegexSecretHits } from '../redaction/redact';
import type { HtmlProbeNode, HtmlProbeResult } from '../types';

export interface SensitivityOk {
	ok: true;
	sensitive: boolean;
	hits: SecretHit[];
}

export interface SensitivityErr {
	ok: false;
	error: string;
}

export type SensitivityResult = SensitivityOk | SensitivityErr;

function analyzeDocument(html: string, hits: Map<string, SecretHit>): void {
	const virtualConsole = new VirtualConsole();
	const dom = new JSDOM(html, { virtualConsole });
	const { document } = dom.window;

	// Markup with no whitespace between tags runs sibling text together in
	// `textContent`, where a match can span text the model never sees as one
	// token — and then nothing replaces it. Such a match still marks the page
	// sensitive, but it cannot become a credential.
	const rendered = elementText(document.documentElement);
	for (const hit of findRegexSecretHits(rendered)) collectHit(hits, hit);
	for (const hit of findRegexSecretHits(document.documentElement.textContent ?? '')) {
		if (rendered.includes(hit.value)) continue; // the rendered pass has it, with a span we can trust
		hit.captureBlocked = CONCATENATED_ONLY;
		collectHit(hits, hit);
	}

	// Inputs/textareas that are password-shaped or whose label reads as a secret
	// expose their values in the collected HTML; no entropy needed to flag them.
	const labelsByControlIdMap = getLabelTextByControlIdMap(document);
	for (const field of Array.from(document.querySelectorAll('input, textarea'))) {
		const sensitive =
			isSensitiveInput(field) ||
			SENSITIVE_FIELD_LABEL_PATTERN.test(
				getAssociatedLabelText(field, document, labelsByControlIdMap),
			);
		if (!sensitive) continue;
		for (const value of sensitiveInputValues(field)) {
			collectHit(hits, { type: 'password', value });
		}
	}

	// Reveal dialogs are the high-risk flow: newly created credentials are often
	// rendered once with copy affordances and explanatory text.
	for (const dialog of Array.from(document.querySelectorAll('[role="dialog"], dialog[open]'))) {
		const text = elementText(dialog);
		if (!text) continue;
		const hasRevealPhrase = REVEAL_PHRASE_PATTERNS.some((pattern) => pattern.test(text));
		const hasCopyButton = hasButtonMatching(dialog, COPY_BUTTON_PATTERN);
		if (!hasRevealPhrase && !hasCopyButton) continue;
		for (const hit of highEntropyCandidates(text)) collectHit(hits, hit);
	}

	// Product UIs frequently label secret containers with test IDs even when the
	// visible copy is locale-specific or absent.
	for (const el of Array.from(
		document.querySelectorAll('[data-testid], [data-test-id], [data-test], [data-qa]'),
	)) {
		const testId = getTestId(el);
		if (!testId || !SENSITIVE_TESTID_PATTERN.test(testId)) continue;
		if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') continue;
		for (const hit of highEntropyCandidates(elementText(el))) collectHit(hits, hit);
	}

	// aria-label/labelledby captures Stripe-style inline secret displays where
	// the sensitive context lives in accessibility metadata.
	for (const el of Array.from(document.querySelectorAll('[aria-label], [aria-labelledby]'))) {
		if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') continue;
		if (!SENSITIVE_ARIA_LABEL_PATTERN.test(elementLabel(el, document))) continue;
		for (const hit of highEntropyCandidates(elementText(el))) collectHit(hits, hit);
	}

	// Non-dialog pages need both copy and reveal signals before we treat a
	// container as sensitive; this avoids redacting generic "Copy URL" widgets.
	for (const button of Array.from(document.querySelectorAll('button, [role="button"]'))) {
		const label = button.getAttribute('aria-label')?.trim() ?? elementText(button);
		if (!label || !COPY_BUTTON_PATTERN.test(label)) continue;
		let container = button.parentElement;
		while (container?.parentElement && !hasButtonMatching(container, REVEAL_BUTTON_PATTERN)) {
			if (['FORM', 'SECTION', 'ASIDE', 'ARTICLE', 'MAIN'].includes(container.tagName)) break;
			container = container.parentElement;
		}
		if (!container || container.matches('[role="dialog"], dialog[open]')) continue;
		if (!hasButtonMatching(container, REVEAL_BUTTON_PATTERN)) continue;
		for (const hit of highEntropyCandidates(elementText(container))) collectHit(hits, hit);
	}

	// Monospace tokens inside a nearby sensitive ancestor are common in API-key
	// screens. Limit the ancestor walk so documentation code blocks stay clean.
	for (const code of Array.from(document.querySelectorAll('code, pre, kbd'))) {
		let cur = code.parentElement;
		let depth = 0;
		let confident = false;
		while (cur && depth < 4 && !confident) {
			const testId = getTestId(cur);
			confident =
				(!!testId && SENSITIVE_TESTID_PATTERN.test(testId)) ||
				SENSITIVE_ARIA_LABEL_PATTERN.test(elementLabel(cur, document)) ||
				hasButtonMatching(cur, COPY_BUTTON_PATTERN);
			cur = cur.parentElement;
			depth++;
		}
		if (!confident) continue;
		for (const hit of highEntropyCandidates(elementText(code))) collectHit(hits, hit);
	}
}

function walkNode(node: HtmlProbeNode, hits: Map<string, SecretHit>): void {
	if (node.html) analyzeDocument(node.html, hits);
	for (const child of node.children) walkNode(child, hits);
}

export function analyzeHtmlSensitivity(probe: HtmlProbeResult): SensitivityResult {
	if (!probe.ok || !probe.root) return { ok: false, error: probe.error ?? 'HTML probe failed' };
	const hits = new Map<string, SecretHit>();
	walkNode(probe.root, hits);
	const values = [...hits.values()];
	return {
		ok: true,
		sensitive: values.length > 0,
		hits: values,
	};
}
