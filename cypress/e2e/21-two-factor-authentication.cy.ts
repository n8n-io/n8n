import { MainSidebar } from './../pages/sidebar/main-sidebar';
import { DEFAULT_USER_EMAIL, DEFAULT_USER_PASSWORD } from '../constants';
import {
	SigninPage,
} from '../pages';
import { PersonalSettingsPage } from '../pages/settings-personal';
import { MfaLoginPage } from '../pages/mfa-login';

const MFA_SECRET = 'KVKFKRCPNZQUYMLXOVYDSQKJKZDTSRLD';

const RECOVERY_CODE = 'd04ea17f-e8b2-4afa-a9aa-57a2c735b30e';

const user = {
	email: `${DEFAULT_USER_EMAIL}A`,
	password: DEFAULT_USER_PASSWORD,
	firstName: 'User',
	lastName: 'A',
	mfaEnabled: false,
	mfaSecret: MFA_SECRET,
	mfaRecoveryCodes: [RECOVERY_CODE],
};

const mfaLoginPage = new MfaLoginPage();
const signinPage = new SigninPage();
const personalSettingsPage = new PersonalSettingsPage();
const mainSidebar = new MainSidebar();

describe('Two-factor authentication', () => {
	before(() => {
		cy.resetAll();
		cy.setupOwner(user);
	});

	beforeEach(() => {
		Cypress.session.clearAllSavedSessions();
		cy.on('uncaught:exception', (err, runnable) => {
			expect(err.message).to.include('Not logged in');
			return false;
		});
	});

	it('Should be able to enable MFA in account', () => {
		const { email, password } = user;
		signinPage.actions.loginWithEmailAndPassword(email, password);
		personalSettingsPage.actions.enableMfa();
		mainSidebar.actions.signout();
	});

	it('Should be able to login with MFA token', () => {
		const { email, password } = user;
		cy.generateToken(user.mfaSecret).then((token) => {
			mfaLoginPage.actions.loginWithMfaToken(email, password, token);
			mainSidebar.actions.signout();
		});
	});

	it('Should be able to login with recovery code', () => {
		const { email, password } = user;
		mfaLoginPage.actions.loginWithRecoveryCode(email, password, user.mfaRecoveryCodes[0]);
		mainSidebar.actions.signout();
	});

	it('Should be able to disable MFA in account', () => {
		const { email, password } = user;
		cy.generateToken(user.mfaSecret).then((token) => {
			mfaLoginPage.actions.loginWithMfaToken(email, password, token);
			personalSettingsPage.actions.disableMfa();
			mainSidebar.actions.signout();
		});
	});
});
