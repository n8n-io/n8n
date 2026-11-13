import { Person, ServiceAccount, ServiceAccountDetails } from '@n8n/db';

import { renderAuthor } from '../repositories/agent-history.repository';

const personWith = (firstName: string | null, lastName: string | null): Person =>
	Object.assign(new Person(), { firstName, lastName });

describe('renderAuthor', () => {
	it('joins firstName and lastName with a space', () => {
		expect(renderAuthor(personWith('Eugene', 'Molodkin'))).toBe('Eugene Molodkin');
	});

	it('returns firstName alone when lastName is null', () => {
		expect(renderAuthor(personWith('Solo', null))).toBe('Solo');
	});

	it('returns lastName alone when firstName is null', () => {
		expect(renderAuthor(personWith(null, 'Onlylast'))).toBe('Onlylast');
	});

	it('falls back to "Unknown" when both parts are missing', () => {
		expect(renderAuthor(personWith(null, null))).toBe('Unknown');
	});

	it('falls back to "Unknown" when both parts are empty strings', () => {
		expect(renderAuthor(personWith('', ''))).toBe('Unknown');
	});

	it('trims whitespace-only parts to "Unknown"', () => {
		expect(renderAuthor(personWith('   ', null))).toBe('Unknown');
	});

	it('renders a service account as its name', () => {
		const serviceAccount = Object.assign(new ServiceAccount(), {
			id: 'sa-1',
			details: Object.assign(new ServiceAccountDetails(), { name: 'Deploy bot' }),
		});
		expect(renderAuthor(serviceAccount)).toBe('Deploy bot');
	});
});
