import { DEFAULT_USER_EMAIL, DEFAULT_USER_PASSWORD } from '../constants';
import { randFirstName, randLastName } from '@ngneat/falso';

const email = DEFAULT_USER_EMAIL;
const password = DEFAULT_USER_PASSWORD;
const firstName = randFirstName();
const lastName = randLastName();

describe('Authentication', () => {
	beforeEach(() => {
		cy.resetAll();
	});

	it('should setup owner', () => {
		cy.setup({ email, firstName, lastName, password });
	});

	it('should sign user in', () => {
		cy.setupOwner({ email, password, firstName, lastName });
		cy.on('uncaught:exception', (err, runnable) => {
			expect(err.message).to.include('Not logged in');

			return false;
		});

		cy.signin({ email, password });
	});
});
