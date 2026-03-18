import { By } from 'selenium-webdriver';

/**
 * Translate a Playwright-style selector string to a WebDriver `By` locator.
 *
 * Supported prefixes:
 * - `css=`          → By.css (also the default)
 * - `xpath=`        → By.xpath
 * - `text=`         → XPath text search
 * - `role=`         → XPath role attribute search
 * - `id=`           → By.id
 * - No prefix       → treated as CSS selector
 */
export function toWebDriverLocator(selector: string): By {
	if (selector.startsWith('xpath=')) {
		return By.xpath(selector.slice(6));
	}

	if (selector.startsWith('text=')) {
		const text = selector.slice(5);
		// Exact text match via XPath normalize-space
		return By.xpath(`//*[normalize-space(.)="${escapeXPathString(text)}"]`);
	}

	if (selector.startsWith('role=')) {
		return roleToXPath(selector.slice(5));
	}

	if (selector.startsWith('css=')) {
		return By.css(selector.slice(4));
	}

	if (selector.startsWith('id=')) {
		return By.id(selector.slice(3));
	}

	// Default: treat as CSS selector
	return By.css(selector);
}

/**
 * Map a Playwright key name (e.g. "Enter", "Control+A", "Shift+Tab") to
 * the WebDriver Key constant(s) needed by the Actions API.
 *
 * Returns an array of key strings. For combos like "Control+A", modifiers
 * are returned as separate entries: [Key.CONTROL, 'a'].
 */
export function mapPlaywrightKeyToWebDriver(keys: string): string[] {
	// Dynamic import avoids referencing Key at module load time
	// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/consistent-type-imports
	const { Key } = require('selenium-webdriver') as typeof import('selenium-webdriver');

	const parts = keys.split('+');
	return parts.map((part) => {
		const mapped = PLAYWRIGHT_KEY_MAP[part];
		if (mapped) return (Key as Record<string, string>)[mapped] ?? part;
		// Single char keys just pass through
		return part.length === 1 ? part : part;
	});
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Convert a Playwright `role=` selector into an XPath locator.
 * Handles `role=button[name="Submit"]` syntax.
 */
function roleToXPath(roleSelector: string): By {
	const nameMatch = roleSelector.match(/^(\w+)\[name="(.+)"\]$/);
	if (nameMatch) {
		const [, role, name] = nameMatch;
		return By.xpath(
			`//*[@role="${role}" and (normalize-space(.)="${escapeXPathString(name)}" or @aria-label="${escapeXPathString(name)}")]`,
		);
	}

	// Simple role match
	return By.xpath(`//*[@role="${escapeXPathString(roleSelector)}"]`);
}

/** Escape a string for use in XPath string literals. */
function escapeXPathString(str: string): string {
	if (!str.includes("'")) return str;
	if (!str.includes('"')) return str;
	// If it has both quote types, use concat()
	return str.replace(/"/g, '&quot;');
}

/** Map from Playwright key names to selenium-webdriver Key constant names. */
/* eslint-disable @typescript-eslint/naming-convention -- keys match Playwright key name spec */
const PLAYWRIGHT_KEY_MAP: Record<string, string> = {
	Enter: 'ENTER',
	Return: 'RETURN',
	Tab: 'TAB',
	Escape: 'ESCAPE',
	Backspace: 'BACK_SPACE',
	Delete: 'DELETE',
	Space: 'SPACE',
	ArrowUp: 'ARROW_UP',
	ArrowDown: 'ARROW_DOWN',
	ArrowLeft: 'ARROW_LEFT',
	ArrowRight: 'ARROW_RIGHT',
	Home: 'HOME',
	End: 'END',
	PageUp: 'PAGE_UP',
	PageDown: 'PAGE_DOWN',
	Insert: 'INSERT',
	Control: 'CONTROL',
	Shift: 'SHIFT',
	Alt: 'ALT',
	Meta: 'META',
	F1: 'F1',
	F2: 'F2',
	F3: 'F3',
	F4: 'F4',
	F5: 'F5',
	F6: 'F6',
	F7: 'F7',
	F8: 'F8',
	F9: 'F9',
	F10: 'F10',
	F11: 'F11',
	F12: 'F12',
};
/* eslint-enable @typescript-eslint/naming-convention */
