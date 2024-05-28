import { splitName } from '@/features/projects/projects.utils';

describe('splitName', () => {
	it('should return name as firstName if it is only one word', () => {
		const name = 'Projectname';
		const result = splitName(name);
		expect(result).toEqual({ firstName: name });
	});

	it('should return name as is when it does not contain email', () => {
		const name = 'First Last';
		const result = splitName(name);
		expect(result).toEqual({ firstName: 'First', lastName: 'Last' });
	});

	it('should return firstName, lastName and email when name is in the proper format', () => {
		const name = 'First Last <email@domain.com>';
		const result = splitName(name);
		expect(result).toEqual({ firstName: 'First', lastName: 'Last', email: 'email@domain.com' });
	});
});
