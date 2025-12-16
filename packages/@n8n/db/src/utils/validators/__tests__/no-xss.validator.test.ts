import { validate } from 'class-validator';

import { NoXss } from '../no-xss.validator';

describe('NoXss', () => {
	class Entity {
		@NoXss()
		name = '';

		@NoXss()
		timestamp = '';

		@NoXss()
		version = '';

		@NoXss({ each: true })
		categories: string[] = [];
	}

	const entity = new Entity();

	describe('Scripts', () => {
		// eslint-disable-next-line n8n-local-rules/no-unneeded-backticks
		const XSS_STRINGS = ['<script src/>', "<script>alert('xss')</script>", `<a href="#">Jack</a>`];

		for (const str of XSS_STRINGS) {
			test(`should block ${str}`, async () => {
				entity.name = str;
				const errors = await validate(entity);
				expect(errors).toHaveLength(1);
				const [error] = errors;
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
				await expect(validate(entity)).resolves.toHaveLength(0);
			});
		}
	});

	describe('ISO-8601 timestamps', () => {
		const VALID_TIMESTAMPS = ['2022-01-01T00:00:00.000Z', '2022-01-01T00:00:00.000+02:00'];

		for (const timestamp of VALID_TIMESTAMPS) {
			test(`should allow ${timestamp}`, async () => {
				entity.timestamp = timestamp;
				await expect(validate(entity)).resolves.toHaveLength(0);
			});
		}
	});

	describe('Semver versions', () => {
		const VALID_VERSIONS = ['1.0.0', '1.0.0-alpha.1'];

		for (const version of VALID_VERSIONS) {
			test(`should allow ${version}`, async () => {
				entity.version = version;
				await expect(validate(entity)).resolves.toHaveLength(0);
			});
		}
	});

	describe('Miscellaneous strings', () => {
		const VALID_MISCELLANEOUS_STRINGS = ['CI/CD'];

		for (const str of VALID_MISCELLANEOUS_STRINGS) {
			test(`should allow ${str}`, async () => {
				entity.name = str;
				await expect(validate(entity)).resolves.toHaveLength(0);
			});
		}
	});

	describe('Array of strings', () => {
		const VALID_STRING_ARRAYS = [
			['cloud-infrastructure-orchestration', 'ci-cd', 'reporting'],
			['automationGoalDevops', 'cloudComputing', 'containerization'],
		];

		for (const arr of VALID_STRING_ARRAYS) {
			test(`should allow array: ${JSON.stringify(arr)}`, async () => {
				entity.categories = arr;
				await expect(validate(entity)).resolves.toHaveLength(0);
			});
		}

		const INVALID_STRING_ARRAYS = [
			['valid-string', '<script>alert("xss")</script>', 'another-valid-string'],
			['<img src="x" onerror="alert(\'XSS\')">', 'valid-string'],
		];

		for (const arr of INVALID_STRING_ARRAYS) {
			test(`should reject array containing invalid string: ${JSON.stringify(arr)}`, async () => {
				entity.categories = arr;
				const errors = await validate(entity);
				expect(errors).toHaveLength(1);
				const [error] = errors;
				expect(error.property).toEqual('categories');
				expect(error.constraints).toEqual({ NoXss: 'Potentially malicious string' });
			});
		}
	});
});
