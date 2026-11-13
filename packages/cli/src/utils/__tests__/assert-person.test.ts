import { ForbiddenError } from '@n8n/errors';
import { Person, ServiceAccount } from '@n8n/db';

import { assertPerson, PERSON_ONLY_MESSAGE } from '@/utils/assert-person';

describe('assertPerson', () => {
	it('accepts a person', () => {
		expect(() => assertPerson(new Person())).not.toThrow();
	});

	it('rejects a service account with one message', () => {
		const check = () => assertPerson(new ServiceAccount());

		expect(check).toThrow(ForbiddenError);
		expect(check).toThrow(PERSON_ONLY_MESSAGE);
	});
});
