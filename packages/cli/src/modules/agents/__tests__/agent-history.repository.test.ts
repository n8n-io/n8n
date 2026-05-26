import type { User } from '@n8n/db';

import { renderAuthor } from '../repositories/agent-history.repository';

const userWith = (firstName: string | null, lastName: string | null): User =>
	({ firstName, lastName }) as User;

describe('renderAuthor', () => {
	it('joins firstName and lastName with a space', () => {
		expect(renderAuthor(userWith('Eugene', 'Molodkin'))).toBe('Eugene Molodkin');
	});

	it('returns firstName alone when lastName is null', () => {
		expect(renderAuthor(userWith('Solo', null))).toBe('Solo');
	});

	it('returns lastName alone when firstName is null', () => {
		expect(renderAuthor(userWith(null, 'Onlylast'))).toBe('Onlylast');
	});

	it('falls back to "Unknown" when both parts are missing', () => {
		expect(renderAuthor(userWith(null, null))).toBe('Unknown');
	});

	it('falls back to "Unknown" when both parts are empty strings', () => {
		expect(renderAuthor(userWith('', ''))).toBe('Unknown');
	});

	it('trims whitespace-only parts to "Unknown"', () => {
		expect(renderAuthor(userWith('   ', null))).toBe('Unknown');
	});
});
