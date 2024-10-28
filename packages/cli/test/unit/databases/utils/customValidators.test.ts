import { NoXss } from '@db/utils/customValidators';
import { validate } from 'class-validator';

describe('customValidators', () => {
	describe('NoXss', () => {
		class Person {
			@NoXss()
			name: string;
		}
		const person = new Person();

		const invalidNames = ['http://google.com', '<script src/>', 'www.domain.tld'];

		const validNames = [
			'Johann Strauß',
			'Вагиф Сәмәдоғлу',
			'René Magritte',
			'সুকুমার রায়',
			'མགོན་པོ་རྡོ་རྗེ།',
			'عبدالحليم حافظ',
		];

		describe('Block XSS', () => {
			for (const name of invalidNames) {
				test(name, async () => {
					person.name = name;
					const validationErrors = await validate(person);
					expect(validationErrors[0].property).toEqual('name');
					expect(validationErrors[0].constraints).toEqual({ NoXss: 'Malicious name' });
				});
			}
		});

		describe('Allow Valid names', () => {
			for (const name of validNames) {
				test(name, async () => {
					person.name = name;
					expect(await validate(person)).toBeEmptyArray();
				});
			}
		});
	});
});
