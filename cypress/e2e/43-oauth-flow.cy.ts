import { getCredentialSaveButton } from '../composables/modals/credential-modal';
import { CredentialsPage, CredentialsModal } from '../pages';

const credentialsPage = new CredentialsPage();
const credentialsModal = new CredentialsModal();

describe('Credentials', () => {
	it('create and connect with Google OAuth2', () => {
		// Open credentials page
		cy.visit(credentialsPage.url, {
			onBeforeLoad(win) {
				cy.stub(win, 'open').as('windowOpen');
			},
		});

		// Add a new Google OAuth2 credential
		credentialsPage.getters.emptyListCreateCredentialButton().click();
		credentialsModal.getters.newCredentialTypeOption('Google OAuth2 API').click();
		credentialsModal.getters.newCredentialTypeButton().click();

		// Fill in the key/secret and save
		credentialsModal.actions.fillField('clientId', 'test-key');
		credentialsModal.actions.fillField('clientSecret', 'test-secret');
		credentialsModal.actions.save();

		// Connect to Google
		credentialsModal.getters.oauthConnectButton().click();
		cy.get('@windowOpen').should(
			'have.been.calledOnceWith',
			Cypress.sinon.match(
				'https://accounts.google.com/o/oauth2/v2/auth?access_type=offline&prompt=consent&client_id=test-key&redirect_uri=http%3A%2F%2Flocalhost%3A5678%2Frest%2Foauth2-credential%2Fcallback&response_type=code',
			),
			'OAuth Authorization',
			'scrollbars=no,resizable=yes,status=no,titlebar=noe,location=no,toolbar=no,menubar=no,width=500,height=700',
		);

		// Emulate successful save using BroadcastChannel
		cy.window().then(() => {
			const channel = new BroadcastChannel('oauth-callback');
			channel.postMessage('success');
		});

		// Check that the credential was saved and connected successfully
		getCredentialSaveButton().should('contain.text', 'Saved');
		credentialsModal.getters.oauthConnectSuccessBanner().should('be.visible');
	});
});
