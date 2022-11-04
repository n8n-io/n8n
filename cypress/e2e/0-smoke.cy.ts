import {DEFAULT_USER_EMAIL, DEFAULT_USER_PASSWORD} from "../constants";
import {randFirstName, randLastName} from "@ngneat/falso";

const username = DEFAULT_USER_EMAIL;
const password = DEFAULT_USER_PASSWORD;
const firstName = randFirstName();
const lastName = randLastName();

describe('Sign up', () => {
	it('should sign user up', () => {
		cy.signup(username, firstName, lastName, password);
	});
});

describe('Sign in', () => {
	it('should sign user in', () => {
		cy.signin(username, password);
	});
});
