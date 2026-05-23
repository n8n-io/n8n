import {
	COPY_BUTTON_PATTERN,
	REVEAL_BUTTON_PATTERN,
	REVEAL_PHRASE_PATTERNS,
	SENSITIVE_ARIA_LABEL_PATTERN,
	SENSITIVE_TESTID_PATTERN,
	shannonEntropy,
} from './dom-matchers';

describe('shannonEntropy', () => {
	it('returns 0 for empty and repeated strings', () => {
		expect(shannonEntropy('')).toBe(0);
		expect(shannonEntropy('aaaaaa')).toBe(0);
	});

	it('returns log2(n) for n unique equally distributed characters', () => {
		expect(shannonEntropy('ab')).toBeCloseTo(1, 5);
		expect(shannonEntropy('abcd')).toBeCloseTo(2, 5);
	});

	it('rates opaque secret-shaped values above the threshold used by candidates', () => {
		expect(shannonEntropy('notreal-IMzLaCKsU6ZxAbt2qFc9XYdRpQ7vNtBmKL')).toBeGreaterThanOrEqual(
			4.5,
		);
	});

	it('rates repetitive URL-like blobs below the threshold', () => {
		expect(shannonEntropy('aaaaaaaaaaaaaaaaaaaaaa')).toBeLessThan(4.5);
	});
});

describe('COPY_BUTTON_PATTERN', () => {
	it.each([
		'Copy',
		'Copy key',
		'Copy to clipboard',
		'Click to copy',
		'Schlüssel kopieren',
		'Kopieren',
		'Copier la clé',
		'Copiar',
		'Copia',
		'Copiato',
		'コピー',
		'コピーする',
		'复制',
		'複製',
		'복사',
	])('matches copy-button label %p', (label) => {
		expect(COPY_BUTTON_PATTERN.test(label)).toBe(true);
	});

	it.each(['Cancel', 'Save', 'Close', 'Schließen', 'Annuler', 'Cancelar', 'Submit'])(
		'does not match unrelated label %p',
		(label) => {
			expect(COPY_BUTTON_PATTERN.test(label)).toBe(false);
		},
	);
});

describe('REVEAL_BUTTON_PATTERN', () => {
	it.each([
		'Reveal key',
		'Reveal API key',
		'Reveal secret',
		'Show secret',
		'Show API key',
		'Unhide token',
		'View password',
		'Show access token',
	])('matches reveal-button label %p', (label) => {
		expect(REVEAL_BUTTON_PATTERN.test(label)).toBe(true);
	});

	it.each(['Show details', 'Reveal answer', 'Show more', 'Reveal', 'Show', 'View', 'Hide'])(
		'does not match generic show/reveal label %p',
		(label) => {
			expect(REVEAL_BUTTON_PATTERN.test(label)).toBe(false);
		},
	);
});

describe('SENSITIVE_ARIA_LABEL_PATTERN', () => {
	it.each([
		'API key',
		'Secret key',
		'Live secret key',
		'Access token',
		'Auth token',
		'Client secret',
		'User password',
		'Account credential',
	])('matches sensitive aria-label %p', (label) => {
		expect(SENSITIVE_ARIA_LABEL_PATTERN.test(label)).toBe(true);
	});

	it.each(['Email address', 'Username', 'First name', 'Search', 'Date picker', 'Account number'])(
		'does not match neutral aria-label %p',
		(label) => {
			expect(SENSITIVE_ARIA_LABEL_PATTERN.test(label)).toBe(false);
		},
	);
});

describe('SENSITIVE_TESTID_PATTERN', () => {
	it.each([
		'admin-key',
		'api-key',
		'apikey-display',
		'access-token',
		'auth_token',
		'secret-value',
		'user-password',
		'credential-input',
		'session-token',
		'KEY',
	])('matches sensitive test-id %p', (id) => {
		expect(SENSITIVE_TESTID_PATTERN.test(id)).toBe(true);
	});

	it.each(['submit-button', 'cancel-action', 'user-name', 'profile-avatar', 'monkey-button'])(
		'does not match neutral test-id %p',
		(id) => {
			expect(SENSITIVE_TESTID_PATTERN.test(id)).toBe(false);
		},
	);
});

describe('REVEAL_PHRASE_PATTERNS', () => {
	const matchesAny = (phrase: string) =>
		REVEAL_PHRASE_PATTERNS.some((pattern) => pattern.test(phrase));

	it.each([
		"You won't see it again.",
		"You won't be able to retrieve this key again.",
		'You cannot see this password again.',
		"We won't show it to you again.",
		'Save your key',
		'Copy this secret',
		'Make sure you copy this token.',
		'Notiere den Schlüssel unten.',
		'We only show it once.',
		'Treat this as a password.',
		'Keep it secret.',
	])('matches reveal phrase %p', (phrase) => {
		expect(matchesAny(phrase)).toBe(true);
	});

	it.each([
		'Save your work',
		'See you again later',
		'Backup your data',
		'Welcome to the dashboard',
		'You will receive a confirmation email',
		'Show details',
	])('does not match neutral phrase %p', (phrase) => {
		expect(matchesAny(phrase)).toBe(false);
	});
});
