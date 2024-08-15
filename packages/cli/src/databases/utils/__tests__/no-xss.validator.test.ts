import { NoXss } from '../no-xss.validator';
import { validate } from 'class-validator';

describe('NoXss', () => {
	class Entity {
		@NoXss()
		name = '';

		@NoXss()
		timestamp = '';

		@NoXss()
		version = '';
	}

	const entity = new Entity();

	describe('Scripts and URLs', () => {
		const MALICIOUS_STRINGS = ['http://google.com', '<script src/>', 'www.domain.tld'];

		for (const str of MALICIOUS_STRINGS) {
			test(`should block ${str}`, async () => {
				entity.name = str;
				const [error] = await validate(entity);
				expect(error.property).toEqual('name');
				expect(error.constraints).toEqual({ NoXss: 'Potentially malicious string' });
			});
		}
	});

	describe('Names', () => {
		const VALID_NAMES = [
			'Johann Strauß',
			'Вагиф Сәмәдоғлу',
			'René Magritte',
			'সুকুমার রায়',
			'མགོན་པོ་རྡོ་རྗེ།',
			'عبدالحليم حافظ',
		];

		for (const name of VALID_NAMES) {
			test(`should allow ${name}`, async () => {
				entity.name = name;
				expect(await validate(entity)).toBeEmptyArray();
			});
		}
	});

	describe('ISO-8601 timestamps', () => {
		const VALID_TIMESTAMPS = ['2022-01-01T00:00:00.000Z', '2022-01-01T00:00:00.000+02:00'];

		for (const timestamp of VALID_TIMESTAMPS) {
			test(`should allow ${timestamp}`, async () => {
				entity.timestamp = timestamp;
				await expect(validate(entity)).resolves.toBeEmptyArray();
			});
		}
	});

	describe('Semver versions', () => {
		const VALID_VERSIONS = ['1.0.0', '1.0.0-alpha.1'];

		for (const version of VALID_VERSIONS) {
			test(`should allow ${version}`, async () => {
				entity.version = version;
				await expect(validate(entity)).resolves.toBeEmptyArray();
			});
		}
	});
});
