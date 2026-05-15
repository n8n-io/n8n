import { JSDOM, VirtualConsole } from 'jsdom';

import type { SecretHit } from '../redaction/redact';
import { findRegexSecretHits } from '../redaction/redact';
import type { HtmlProbeNode, HtmlProbeResult } from '../types';
import {
	COPY_BUTTON_PATTERN,
	elementLabel,
	elementText,
	hasButtonMatching,
	highEntropyCandidates,
	isSensitiveInput,
	REVEAL_BUTTON_PATTERN,
	REVEAL_PHRASE_PATTERNS,
	SENSITIVE_ARIA_LABEL_PATTERN,
	SENSITIVE_TESTID_PATTERN,
	getTestId,
} from './dom-matchers';

export type SensitivitySource = 'regex' | 'dom-structure' | 'entropy';

interface SensitivityHit extends SecretHit {
	source: SensitivitySource;
}

export interface SensitivityOk {
	ok: true;
	sensitive: boolean;
	hits: SecretHit[];
	sources: SensitivitySource[];
}

export interface SensitivityErr {
	ok: false;
	error: string;
}

export type SensitivityResult = SensitivityOk | SensitivityErr;

function addHit(hits: Map<string, SensitivityHit>, hit: SensitivityHit): void {
	if (!hit.value) return;
	// Deduplicate by replacement target. The same secret can appear in text,
	// snapshot, and iframe/shadow copies during one probe.
	hits.set(`${hit.type}:${hit.value}:${hit.ref ?? ''}`, hit);
}

function analyzeDocument(html: string, hits: Map<string, SensitivityHit>): void {
	const virtualConsole = new VirtualConsole();
	const dom = new JSDOM(html, { virtualConsole });
	const { document } = dom.window;

	const bodyText = document.documentElement.textContent ?? '';
	for (const hit of findRegexSecretHits(bodyText)) addHit(hits, { ...hit, source: 'regex' });

	// Password-shaped inputs expose their values as attributes in the collected
	// HTML. These do not need entropy to be considered sensitive.
	for (const input of Array.from(document.querySelectorAll('input'))) {
		if (!isSensitiveInput(input)) continue;
		const value = input.getAttribute('value') ?? '';
		if (value) addHit(hits, { type: 'password', value, source: 'dom-structure' });
	}

	// Reveal dialogs are the high-risk flow: newly created credentials are often
	// rendered once with copy affordances and explanatory text.
	for (const dialog of Array.from(document.querySelectorAll('[role="dialog"], dialog[open]'))) {
		const text = elementText(dialog);
		if (!text) continue;
		const hasRevealPhrase = REVEAL_PHRASE_PATTERNS.some((pattern) => pattern.test(text));
		const hasCopyButton = hasButtonMatching(dialog, COPY_BUTTON_PATTERN);
		if (!hasRevealPhrase && !hasCopyButton) continue;
		for (const value of highEntropyCandidates(text)) {
			addHit(hits, {
				type: 'secret',
				value,
				source: hasRevealPhrase ? 'entropy' : 'dom-structure',
			});
		}
	}

	// Product UIs frequently label secret containers with test IDs even when the
	// visible copy is locale-specific or absent.
	for (const el of Array.from(
		document.querySelectorAll('[data-testid], [data-test-id], [data-test], [data-qa]'),
	)) {
		const testId = getTestId(el);
		if (!testId || !SENSITIVE_TESTID_PATTERN.test(testId)) continue;
		if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') continue;
		for (const value of highEntropyCandidates(elementText(el))) {
			addHit(hits, { type: 'secret', value, source: 'entropy' });
		}
	}

	// aria-label/labelledby captures Stripe-style inline secret displays where
	// the sensitive context lives in accessibility metadata.
	for (const el of Array.from(document.querySelectorAll('[aria-label], [aria-labelledby]'))) {
		if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') continue;
		if (!SENSITIVE_ARIA_LABEL_PATTERN.test(elementLabel(el, document))) continue;
		for (const value of highEntropyCandidates(elementText(el))) {
			addHit(hits, { type: 'secret', value, source: 'entropy' });
		}
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
		for (const value of highEntropyCandidates(elementText(container))) {
			addHit(hits, { type: 'secret', value, source: 'entropy' });
		}
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
		for (const value of highEntropyCandidates(elementText(code))) {
			addHit(hits, { type: 'secret', value, source: 'entropy' });
		}
	}
}

function walkNode(node: HtmlProbeNode, hits: Map<string, SensitivityHit>): void {
	if (node.html) analyzeDocument(node.html, hits);
	for (const child of node.children) walkNode(child, hits);
}

export function analyzeHtmlSensitivity(probe: HtmlProbeResult): SensitivityResult {
	if (!probe.ok || !probe.root) return { ok: false, error: probe.error ?? 'HTML probe failed' };
	const hits = new Map<string, SensitivityHit>();
	walkNode(probe.root, hits);
	const values = [...hits.values()];
	return {
		ok: true,
		sensitive: values.length > 0,
		// Replacement callers only need type/value/ref. Keep source as analyzer
		// telemetry so the shared redaction contract stays small.
		hits: values.map(({ source: _source, ...hit }) => hit),
		sources: [...new Set(values.map((hit) => hit.source))],
	};
}
