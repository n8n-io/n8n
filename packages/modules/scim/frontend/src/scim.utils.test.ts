import { formatDate, formatPersonName, formatTimeAgo, roleLabelKey } from './scim.utils';

describe('scim.utils', () => {
	describe('formatTimeAgo', () => {
		const now = new Date('2026-10-19T12:00:00Z').getTime();

		it.each([
			['2026-10-19T11:59:40Z', 'now'],
			['2026-10-19T11:57:00Z', '3 minutes ago'],
			['2026-10-19T09:00:00Z', '3 hours ago'],
			['2026-10-18T12:00:00Z', 'yesterday'],
			['2026-10-05T12:00:00Z', '2 weeks ago'],
			['2026-06-19T12:00:00Z', '4 months ago'],
		])('formats %s as "%s"', (iso, expected) => {
			expect(formatTimeAgo(iso, now, 'en')).toBe(expected);
		});
	});

	describe('formatDate', () => {
		it('formats a medium date', () => {
			expect(formatDate('2026-06-12T10:00:00Z', 'en')).toBe('Jun 12, 2026');
		});
	});

	describe('formatPersonName', () => {
		it('joins the first and last name', () => {
			expect(formatPersonName({ firstName: 'Ada', lastName: 'Lovelace' })).toBe('Ada Lovelace');
		});

		it('falls back to the email when both names are empty', () => {
			expect(formatPersonName({ firstName: null, lastName: null, email: 'ada@example.com' })).toBe(
				'ada@example.com',
			);
		});

		it('falls back to the given text when nothing is known', () => {
			expect(formatPersonName({ firstName: null, lastName: '' }, 'Someone')).toBe('Someone');
		});
	});

	describe('roleLabelKey', () => {
		it('maps the global roles to their labels', () => {
			expect(roleLabelKey('global:owner')).toBe('auth.roles.owner');
			expect(roleLabelKey('global:admin')).toBe('auth.roles.admin');
			expect(roleLabelKey('global:member')).toBe('auth.roles.member');
		});

		it('returns null for a custom role', () => {
			expect(roleLabelKey('global:custom-auditor')).toBeNull();
		});
	});
});
