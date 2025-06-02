import { validate } from 'class-validator';

import { NoUrl } from '../no-url.validator';

describe('NoUrl', () => {
	class Entity {
		@NoUrl()
		name = '';
	}

	const entity = new Entity();

	describe('URLs', () => {
		const URLS = ['http://google.com', 'www.domain.tld', 'n8n.io'];

		for (const str of URLS) {
			test(`should block ${str}`, async () => {
				entity.name = str;
				const errors = await validate(entity);
				expect(errors).toHaveLength(1);
				const [error] = errors;
				expect(error.property).toEqual('name');
				expect(error.constraints).toEqual({ NoUrl: 'Potentially malicious string' });
			});
		}
	});
});
