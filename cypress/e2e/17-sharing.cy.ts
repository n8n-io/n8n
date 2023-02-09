import { DEFAULT_USER_EMAIL, DEFAULT_USER_PASSWORD } from '../constants';

/**
 * User A - Instance owner
 * User B - User, owns C1, W1, W2
 * User C - User, owns C2
 *
 * W1 - Workflow owned by User B, shared with User C
 * W2 - Workflow owned by User B
 *
 * C1 - Credential owned by User B
 * C2 - Credential owned by User C, shared with User A and User B
 */

const instanceOwner = {
	email: `${DEFAULT_USER_EMAIL}A`,
	password: DEFAULT_USER_PASSWORD,
	firstName: 'User',
	lastName: 'A',
};

const users = [
	{
		email: `${DEFAULT_USER_EMAIL}B`,
		password: DEFAULT_USER_PASSWORD,
		firstName: 'User',
		lastName: 'B',
	},
	{
		email: `${DEFAULT_USER_EMAIL}C`,
		password: DEFAULT_USER_PASSWORD,
		firstName: 'User',
		lastName: 'C',
	},
];

describe('Sharing', () => {
	before(() => {
		cy.resetAll();
		cy.setupOwner(instanceOwner);
	});

	beforeEach(() => {
		cy.on('uncaught:exception', (err, runnable) => {
			expect(err.message).to.include('Not logged in');
			return false;
		});
	});

	it(`should invite User A and UserB to instance`, () => {
		cy.inviteUsers({ instanceOwner, users });
	});
});
