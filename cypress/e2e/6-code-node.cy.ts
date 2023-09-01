import { WorkflowPage as WorkflowPageClass } from '../pages/workflow';
import { NDV } from '../pages/ndv';

const WorkflowPage = new WorkflowPageClass();
const ndv = new NDV();

describe('Code node', () => {
	describe('Code editor', () => {
		beforeEach(() => {
			WorkflowPage.actions.visit();
			WorkflowPage.actions.addInitialNodeToCanvas('Manual');
			WorkflowPage.actions.addNodeToCanvas('Code', true, true);
		});

		it('should show correct placeholders switching modes', () => {
			cy.contains('// Loop over input items and add a new field').should('be.visible');

			ndv.getters.parameterInput('mode').click();
			ndv.actions.selectOptionInParameterDropdown('mode', 'Run Once for Each Item');

			cy.contains("// Add a new field called 'myNewField'").should('be.visible');

			ndv.getters.parameterInput('mode').click();
			ndv.actions.selectOptionInParameterDropdown('mode', 'Run Once for All Items');
			cy.contains('// Loop over input items and add a new field').should('be.visible');
		});

		it('should execute the placeholder successfully in both modes', () => {
			ndv.actions.execute();

			WorkflowPage.getters.successToast().contains('Node executed successfully');
			ndv.getters.parameterInput('mode').click();
			ndv.actions.selectOptionInParameterDropdown('mode', 'Run Once for Each Item');

			ndv.actions.execute();

			WorkflowPage.getters.successToast().contains('Node executed successfully');
		});
	});

	describe('Ask AI', () => {
		it('tab should display based on experiment', () => {
			WorkflowPage.actions.visit();
			cy.window().then((win) => {
				win.featureFlags.override('011_ask_AI', 'control');
				WorkflowPage.actions.addInitialNodeToCanvas('Manual');
				WorkflowPage.actions.addNodeToCanvas('Code');
				WorkflowPage.actions.openNode('Code');

				cy.getByTestId('code-node-tab-ai').should('not.exist');

				ndv.actions.close();
				win.featureFlags.override('011_ask_AI', undefined);
				WorkflowPage.actions.openNode('Code');
				cy.getByTestId('code-node-tab-ai').should('not.exist');
			});
		});

		describe('Enabled', () => {
			beforeEach(() => {
				WorkflowPage.actions.visit();
				cy.window().then((win) => {
					win.featureFlags.override('011_ask_AI', 'gpt3');
					WorkflowPage.actions.addInitialNodeToCanvas('Manual');
					WorkflowPage.actions.addNodeToCanvas('Code', true, true);
				});
			});

			it('tab should exist if experiment selected and be selectable', () => {
				cy.getByTestId('code-node-tab-ai').should('exist');
				cy.get('#tab-ask-ai').click();
				cy.contains('Hey AI, generate JavaScript').should('exist');
			});

			it('generate code button should have correct state & tooltips', () => {
				cy.getByTestId('code-node-tab-ai').should('exist');
				cy.get('#tab-ask-ai').click();

				cy.getByTestId('ask-ai-cta').should('be.disabled');
				cy.getByTestId('ask-ai-cta').realHover();
				cy.getByTestId('ask-ai-cta-tooltip-no-input-data').should('exist');
				ndv.actions.executePrevious();
				cy.getByTestId('ask-ai-cta').realHover();
				cy.getByTestId('ask-ai-cta-tooltip-no-prompt').should('exist');
				cy.getByTestId('ask-ai-prompt-input')
					// Type random 14 character string
					.type([...Array(14)].map(() => ((Math.random() * 36) | 0).toString(36)).join(''));

				cy.getByTestId('ask-ai-cta').realHover();
				cy.getByTestId('ask-ai-cta-tooltip-prompt-too-short').should('exist');

				cy.getByTestId('ask-ai-prompt-input')
					.clear()
					// Type random 15 character string
					.type([...Array(15)].map(() => ((Math.random() * 36) | 0).toString(36)).join(''));
				cy.getByTestId('ask-ai-cta').should('be.enabled');

				cy.getByTestId('ask-ai-prompt-counter').should('contain.text', '15 / 600');
			});

			it('should send correct schema and replace code', () => {
				const prompt = [...Array(20)].map(() => ((Math.random() * 36) | 0).toString(36)).join('');
				cy.get('#tab-ask-ai').click();
				ndv.actions.executePrevious();

				cy.getByTestId('ask-ai-prompt-input').type(prompt);

				cy.intercept('POST', '/rest/ask-ai', {
					statusCode: 200,
					body: {
						data: {
							code: 'console.log("Hello World")',
						},
					},
				}).as('ask-ai');

				cy.getByTestId('ask-ai-cta').click();
				const askAiReq = cy.wait('@ask-ai');

				askAiReq
					.its('request.body')
					.should('have.keys', ['question', 'model', 'context', 'n8nVersion']);

				askAiReq.its('context').should('have.keys', ['schema', 'ndvSessionId', 'sessionId']);

				cy.contains('Code generation completed').should('be.visible');
				cy.getByTestId('code-node-tab-code').should('contain.text', 'console.log("Hello World")');
				cy.get('#tab-code').should('have.class', 'is-active');
			});

			it('should show error based on status code', () => {
				const prompt = [...Array(20)].map(() => ((Math.random() * 36) | 0).toString(36)).join('');
				cy.get('#tab-ask-ai').click();
				ndv.actions.executePrevious();

				cy.getByTestId('ask-ai-prompt-input').type(prompt);

				const handledCodes = [
					{ code: 400, message: 'Code generation failed due to an unknown reason' },
					{ code: 413, message: 'Your workflow data is too large for AI to process' },
					{ code: 429, message: "We've hit our rate limit with our AI partner" },
					{ code: 500, message: 'Code generation failed due to an unknown reason' },
				];

				handledCodes.forEach(({ code, message }) => {
					cy.intercept('POST', '/rest/ask-ai', {
						statusCode: code,
						status: code,
					}).as('ask-ai');

					cy.getByTestId('ask-ai-cta').click();
					cy.contains(message).should('be.visible');
				});
			});
		});
	});
});
