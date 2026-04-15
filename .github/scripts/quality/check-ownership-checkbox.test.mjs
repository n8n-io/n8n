import { describe, it, before, mock } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Run with:
 * node --test --experimental-test-module-mocks .github/scripts/quality/check-ownership-checkbox.test.mjs
 */

mock.module('../github-helpers.mjs', {
	namedExports: {
		initGithub: () => {},
		getEventFromGithubEventPath: () => {},
	},
});

let isOwnershipCheckboxChecked;
before(async () => {
	({ isOwnershipCheckboxChecked } = await import('./check-ownership-checkbox.mjs'));
});

describe('isOwnershipCheckboxChecked', () => {
	it('returns true for a checked checkbox with exact text', () => {
		const body =
			'- [x] I have seen this code, I have run this code, and I take responsibility for this code.';
		assert.ok(isOwnershipCheckboxChecked(body));
	});

	it('returns true for uppercase [X]', () => {
		const body =
			'- [X] I have seen this code, I have run this code, and I take responsibility for this code.';
		assert.ok(isOwnershipCheckboxChecked(body));
	});

	it('returns false for an unchecked checkbox [ ]', () => {
		const body =
			'- [ ] I have seen this code, I have run this code, and I take responsibility for this code.';
		assert.equal(isOwnershipCheckboxChecked(body), false);
	});

	it('returns false when the checkbox is absent', () => {
		const body = '## Summary\n\nThis PR does some things.\n';
		assert.equal(isOwnershipCheckboxChecked(body), false);
	});

	it('returns false for null body', () => {
		assert.equal(isOwnershipCheckboxChecked(null), false);
	});

	it('returns false for undefined body', () => {
		assert.equal(isOwnershipCheckboxChecked(undefined), false);
	});

	it('returns false for empty body', () => {
		assert.equal(isOwnershipCheckboxChecked(''), false);
	});

	it('returns true when checkbox appears among other content', () => {
		const body = [
			'## Summary',
			'',
			'Some description here.',
			'',
			'## Checklist',
			'- [x] Tests included',
			'- [x] I have seen this code, I have run this code, and I take responsibility for this code.',
			'- [ ] Docs updated',
		].join('\n');
		assert.ok(isOwnershipCheckboxChecked(body));
	});

	it('returns false when only other checkboxes are checked', () => {
		const body = [
			'- [x] Tests included',
			'- [x] Docs updated',
			'- [ ] I have seen this code, I have run this code, and I take responsibility for this code.',
		].join('\n');
		assert.equal(isOwnershipCheckboxChecked(body), false);
	});

	it('is case-insensitive for the checkbox marker', () => {
		const lower =
			'- [x] i have seen this code, i have run this code, and i take responsibility for this code.';
		assert.ok(isOwnershipCheckboxChecked(lower));
	});
});
