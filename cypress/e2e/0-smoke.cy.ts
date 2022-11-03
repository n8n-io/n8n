import { randEmail, randPassword, randFirstName, randLastName } from '@ngneat/falso';

const username = randEmail();
const password = randPassword();
const firstName = randFirstName();
const lastName = randLastName();

before(() => {
	cy.task('db:reset');
});

describe('Create user', () => {
	it('should sign user up', () => {
		cy.signup(username, firstName, lastName, password);
	});
});

describe('Sign in User', () => {
	it('should sign user in', () => {
		cy.signin(username, password);
	});
});
