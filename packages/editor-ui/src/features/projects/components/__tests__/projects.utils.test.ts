import { splitName } from '@/features/projects/projects.utils';

describe('splitName', () => {
	test.each([
		[
			'First Last <email@domain.com>',
			{
				firstName: 'First',
				lastName: 'Last',
				email: 'email@domain.com',
			},
		],
		[
			'<email@domain.com>',
			{
				firstName: undefined,
				lastName: undefined,
				email: 'email@domain.com',
			},
		],
		[
			' <email@domain.com>',
			{
				firstName: '',
				lastName: '',
				email: 'email@domain.com',
			},
		],
		[
			'My project',
			{
				firstName: 'My',
				lastName: 'project',
			},
		],
		[
			'MyProject',
			{
				firstName: 'MyProject',
			},
		],
	])('should split a name in the format "First Last <email@domain.com>"', (input, result) => {
		expect(splitName(input)).toEqual(result);
	});
});
