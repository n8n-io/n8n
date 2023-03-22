// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })
import 'cypress-real-events';
import { WorkflowsPage, SigninPage, SignupPage, SettingsUsersPage, WorkflowPage } from '../pages';
import { N8N_AUTH_COOKIE } from '../constants';
import { MessageBox } from '../pages/modals/message-box';

Cypress.Commands.add('getByTestId', (selector, ...args) => {
	return cy.get(`[data-test-id="${selector}"]`, ...args);
});

Cypress.Commands.add('createFixtureWorkflow', (fixtureKey, workflowName) => {
	const workflowPage = new WorkflowPage();

	// We need to force the click because the input is hidden
	workflowPage.getters
		.workflowImportInput()
		.selectFile(`cypress/fixtures/${fixtureKey}`, { force: true });

	cy.waitForLoad(false);
	workflowPage.actions.setWorkflowName(workflowName);

	workflowPage.getters.saveButton().should('contain', 'Saved');
});

Cypress.Commands.add(
	'findChildByTestId',
	{ prevSubject: true },
	(subject: Cypress.Chainable<JQuery<HTMLElement>>, childTestId) => {
		return subject.find(`[data-test-id="${childTestId}"]`);
	},
);

Cypress.Commands.add('waitForLoad', (waitForIntercepts = true) => {
	// These aliases are set-up before each test in cypress/support/e2e.ts
	// we can't set them up here because at this point it would be too late
	// and the requests would already have been made
	if(waitForIntercepts) {
		cy.wait(['@loadSettings', '@loadLogin'])
	}
	cy.getByTestId('node-view-loader', { timeout: 20000 }).should('not.exist');
	cy.get('.el-loading-mask', { timeout: 20000 }).should('not.exist');
});

Cypress.Commands.add('signin', ({ email, password }) => {
	const signinPage = new SigninPage();
	const workflowsPage = new WorkflowsPage();

	cy.session(
		[email, password],
		() => {
			cy.visit(signinPage.url);

			signinPage.getters.form().within(() => {
				signinPage.getters.email().type(email);
				signinPage.getters.password().type(password);
				signinPage.getters.submit().click();
			});

			// we should be redirected to /workflows
			cy.url().should('include', workflowsPage.url);
		},
		{
			validate() {
				cy.getCookie(N8N_AUTH_COOKIE).should('exist');
			},
		},
	);
});

Cypress.Commands.add('signout', () => {
	cy.visit('/signout');
	cy.waitForLoad();
	cy.url().should('include', '/signin');
	cy.getCookie(N8N_AUTH_COOKIE).should('not.exist');
});

Cypress.Commands.add('signup', ({ firstName, lastName, password, url }) => {
	const signupPage = new SignupPage();

	cy.visit(url);

	signupPage.getters.form().within(() => {
		cy.url().then((url) => {
			signupPage.getters.firstName().type(firstName);
			signupPage.getters.lastName().type(lastName);
			signupPage.getters.password().type(password);
			signupPage.getters.submit().click();
		});
	});
});

Cypress.Commands.add('setup', ({ email, firstName, lastName, password }) => {
	const signupPage = new SignupPage();

	cy.visit(signupPage.url);

	signupPage.getters.form().within(() => {
		cy.url().then((url) => {
			if (url.includes(signupPage.url)) {
				signupPage.getters.email().type(email);
				signupPage.getters.firstName().type(firstName);
				signupPage.getters.lastName().type(lastName);
				signupPage.getters.password().type(password);
				signupPage.getters.submit().click();
			} else {
				cy.log('User already signed up');
			}
		});
	});
});

Cypress.Commands.add('interceptREST', (method, url) => {
	cy.intercept(method, `http://localhost:5678/rest${url}`);
});

Cypress.Commands.add('inviteUsers', ({ instanceOwner, users }) => {
	const settingsUsersPage = new SettingsUsersPage();

	cy.signin(instanceOwner);

	users.forEach((user) => {
		cy.signin(instanceOwner);
		cy.visit(settingsUsersPage.url);

		cy.interceptREST('POST', '/users').as('inviteUser');

		settingsUsersPage.getters.inviteButton().click();
		settingsUsersPage.getters.inviteUsersModal().within((modal) => {
			settingsUsersPage.getters.inviteUsersModalEmailsInput().type(user.email).type('{enter}');
		});

		cy.wait('@inviteUser').then((interception) => {
			const inviteLink = interception.response!.body.data[0].user.inviteAcceptUrl;
			cy.log(JSON.stringify(interception.response!.body.data[0].user));
			cy.log(inviteLink);
			cy.signout();
			cy.signup({ ...user, url: inviteLink });
		});
	});
});

Cypress.Commands.add('skipSetup', () => {
	const signupPage = new SignupPage();
	const workflowPage = new WorkflowPage();
	const Confirmation = new MessageBox();

	cy.visit(signupPage.url);

	signupPage.getters.form().within(() => {
		cy.url().then((url) => {
			if (url.endsWith(signupPage.url)) {
				signupPage.getters.skip().click();

				Confirmation.getters.header().should('contain.text', 'Skip owner account setup?');
				Confirmation.actions.confirm();

				// we should be redirected to empty canvas
				cy.intercept('GET', '/rest/workflows/new').as('loading');
				cy.url().should('include', workflowPage.url);
				cy.wait('@loading');
			} else {
				cy.log('User already signed up');
			}
		});
	});
});

Cypress.Commands.add('resetAll', () => {
	cy.task('reset');
	Cypress.session.clearAllSavedSessions();
});

Cypress.Commands.add('setupOwner', (payload) => {
	cy.task('setup-owner', payload);
});

Cypress.Commands.add('enableFeature', (feature) => {
	cy.task('enable-feature', feature);
});

Cypress.Commands.add('grantBrowserPermissions', (...permissions: string[]) => {
	if (Cypress.isBrowser('chrome')) {
		cy.wrap(
			Cypress.automation('remote:debugger:protocol', {
				command: 'Browser.grantPermissions',
				params: {
					permissions,
					origin: window.location.origin,
				},
			}),
		);
	}
});

Cypress.Commands.add('readClipboard', () =>
	cy.window().then((win) => win.navigator.clipboard.readText()),
);

Cypress.Commands.add('paste', { prevSubject: true }, (selector, pastePayload) => {
	// https://developer.mozilla.org/en-US/docs/Web/API/Element/paste_event
	cy.wrap(selector).then(($destination) => {
		const pasteEvent = Object.assign(new Event('paste', { bubbles: true, cancelable: true }), {
			clipboardData: {
				getData: () => pastePayload,
			},
		});
		$destination[0].dispatchEvent(pasteEvent);
	});
});

Cypress.Commands.add('drag', (selector, pos) => {
	const [xDiff, yDiff] = pos;
	const element = cy.get(selector);
	element.should('exist');

	const originalLocation = Cypress.$(selector)[0].getBoundingClientRect();

	element.trigger('mousedown');
	element.trigger('mousemove', {
		which: 1,
		pageX: originalLocation.right + xDiff,
		pageY: originalLocation.top + yDiff,
		force: true,
	});
	element.trigger('mouseup', { force: true });
});

Cypress.Commands.add('draganddrop', (draggableSelector, droppableSelector) => {
	if (draggableSelector) {
		cy.get(draggableSelector).should('exist');
	}
	cy.get(droppableSelector).should('exist');

	cy.get(droppableSelector)
		.first()
		.then(([$el]) => {
			const coords = $el.getBoundingClientRect();

			const pageX = coords.left + coords.width / 2;
			const pageY = coords.top + coords.height / 2;

			if (draggableSelector) {
				// We can't use realMouseDown here because it hangs headless run
				cy.get(draggableSelector).trigger('mousedown');
			}
			// We don't chain these commands to make sure cy.get is re-trying correctly
			cy.get(droppableSelector).realMouseMove(pageX, pageY);
			cy.get(droppableSelector).realHover();
			cy.get(droppableSelector).realMouseUp();
			if (draggableSelector) {
				cy.get(draggableSelector).realMouseUp();
			}
		});
});
