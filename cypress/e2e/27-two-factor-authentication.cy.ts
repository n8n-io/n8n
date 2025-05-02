import generateOTPToken from 'cypress-otp';

import { MainSidebar } from './../pages/sidebar/main-sidebar';
import { INSTANCE_OWNER, INSTANCE_ADMIN, BACKEND_BASE_URL } from '../constants';
import { SigninPage } from '../pages';
import { MfaLoginPage } from '../pages/mfa-login';
import { successToast } from '../pages/notifications';
import { PersonalSettingsPage } from '../pages/settings-personal';

const MFA_SECRET = 'KVKFKRCPNZQUYMLXOVYDSQKJKZDTSRLD';

const RECOVERY_CODE = 'd04ea17f-e8b2-4afa-a9aa-57a2c735b30e';

const user = {
	email: INSTANCE_OWNER.email,
	password: INSTANCE_OWNER.password,
	firstName: 'User',
	lastName: 'A',
	mfaEnabled: false,
	mfaSecret: MFA_SECRET,
	mfaRecoveryCodes: [RECOVERY_CODE],
};

const admin = {
	email: INSTANCE_ADMIN.email,
	password: INSTANCE_ADMIN.password,
	firstName: 'Admin',
	lastName: 'B',
	mfaEnabled: false,
	mfaSecret: MFA_SECRET,
	mfaRecoveryCodes: [RECOVERY_CODE],
};

const mfaLoginPage = new MfaLoginPage();
const signinPage = new SigninPage();
const personalSettingsPage = new PersonalSettingsPage();
const mainSidebar = new MainSidebar();

describe('Two-factor authentication', { disableAutoLogin: true }, () => {
	beforeEach(() => {
		cy.request('POST', `${BACKEND_BASE_URL}/rest/e2e/reset`, {
			owner: user,
			members: [],
			admin,
		});
		cy.on('uncaught:exception', (error) => {
			expect(error.message).to.include('Not logged in');
			return false;
		});
		cy.intercept('GET', '/rest/mfa/qr').as('getMfaQrCode');
	});

	it('Should be able to login with MFA code', () => {
		const { email, password } = user;
		signinPage.actions.loginWithEmailAndPassword(email, password);
		personalSettingsPage.actions.enableMfa();
		mainSidebar.actions.signout();
		const mfaCode = generateOTPToken(user.mfaSecret);
		mfaLoginPage.actions.loginWithMfaCode(email, password, mfaCode);
		mainSidebar.actions.signout();
	});

	it('Should be able to login with MFA recovery code', () => {
		const { email, password } = user;
		signinPage.actions.loginWithEmailAndPassword(email, password);
		personalSettingsPage.actions.enableMfa();
		mainSidebar.actions.signout();
		mfaLoginPage.actions.loginWithMfaRecoveryCode(email, password, user.mfaRecoveryCodes[0]);
		mainSidebar.actions.signout();
	});

	it('Should be able to disable MFA in account with MFA code', () => {
		const { email, password } = user;
		signinPage.actions.loginWithEmailAndPassword(email, password);
		personalSettingsPage.actions.enableMfa();
		mainSidebar.actions.signout();
		const mfaCode = generateOTPToken(user.mfaSecret);
		mfaLoginPage.actions.loginWithMfaCode(email, password, mfaCode);
		const disableToken = generateOTPToken(user.mfaSecret);
		personalSettingsPage.actions.disableMfa(disableToken);
		personalSettingsPage.getters.enableMfaButton().should('exist');
		mainSidebar.actions.signout();
	});

	it('Should prompt for MFA code when email changes', () => {
		const { email, password } = user;
		signinPage.actions.loginWithEmailAndPassword(email, password);
		personalSettingsPage.actions.enableMfa();
		personalSettingsPage.actions.updateEmail('newemail@test.com');
		const mfaCode = generateOTPToken(user.mfaSecret);
		personalSettingsPage.getters.mfaCodeOrMfaRecoveryCodeInput().type(mfaCode);
		personalSettingsPage.getters.mfaSaveButton().click();
		successToast().should('exist');
		mainSidebar.actions.signout();
	});

	it('Should prompt for MFA recovery code when email changes', () => {
		const { email, password } = user;
		signinPage.actions.loginWithEmailAndPassword(email, password);
		personalSettingsPage.actions.enableMfa();
		personalSettingsPage.actions.updateEmail('newemail@test.com');
		personalSettingsPage.getters.mfaCodeOrMfaRecoveryCodeInput().type(RECOVERY_CODE);
		personalSettingsPage.getters.mfaSaveButton().click();
		successToast().should('exist');
		mainSidebar.actions.signout();
	});

	it('Should not prompt for MFA code or recovery code when first name or last name changes', () => {
		const { email, password } = user;
		signinPage.actions.loginWithEmailAndPassword(email, password);
		personalSettingsPage.actions.enableMfa();
		personalSettingsPage.actions.updateFirstAndLastName('newFirstName', 'newLastName');
		successToast().should('exist');
		mainSidebar.actions.signout();
	});

	it('Should be able to disable MFA in account with recovery code', () => {
		const { email, password } = user;
		signinPage.actions.loginWithEmailAndPassword(email, password);
		personalSettingsPage.actions.enableMfa();
		mainSidebar.actions.signout();
		const mfaCode = generateOTPToken(user.mfaSecret);
		mfaLoginPage.actions.loginWithMfaCode(email, password, mfaCode);
		personalSettingsPage.actions.disableMfa(user.mfaRecoveryCodes[0]);
		personalSettingsPage.getters.enableMfaButton().should('exist');
		mainSidebar.actions.signout();
	});
});
