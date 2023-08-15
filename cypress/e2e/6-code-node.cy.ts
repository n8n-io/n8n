import { WorkflowPage as WorkflowPageClass } from '../pages/workflow';
import { NDV } from '../pages/ndv';

const WorkflowPage = new WorkflowPageClass();
const ndv = new NDV();

describe('Code node', () => {
	beforeEach(() => {
		WorkflowPage.actions.visit();
	});

	it('should execute the placeholder in all-items mode successfully', () => {
		WorkflowPage.actions.addInitialNodeToCanvas('Manual');
		WorkflowPage.actions.addNodeToCanvas('Code');
		WorkflowPage.actions.openNode('Code');

		ndv.actions.execute();

		WorkflowPage.getters.successToast().contains('Node executed successfully');
	});

	it('should execute the placeholder in each-item mode successfully', () => {
		WorkflowPage.actions.addInitialNodeToCanvas('Manual');
		WorkflowPage.actions.addNodeToCanvas('Code');
		WorkflowPage.actions.openNode('Code');
		ndv.getters.parameterInput('mode').click();
		ndv.actions.selectOptionInParameterDropdown('mode', 'Run Once for Each Item');

		ndv.actions.execute();

		WorkflowPage.getters.successToast().contains('Node executed successfully');
	});

	it('should execute the placeholder in each-item mode successfully', () => {
		WorkflowPage.actions.addInitialNodeToCanvas('Manual');
		WorkflowPage.actions.addNodeToCanvas('Code');
		WorkflowPage.actions.openNode('Code');
		ndv.getters.parameterInput('mode').click();
		ndv.actions.selectOptionInParameterDropdown('mode', 'Run Once for Each Item');

		ndv.actions.execute();

		WorkflowPage.getters.successToast().contains('Node executed successfully');
	});

	describe('Ask AI', () => {
		it('tab should not exist if control or no feature flag', () => {
			cy.window().then((win) => {
				// cy.clearAllLocalStorage();
				win.featureFlags.override('011_ask_AI', 'control');
				WorkflowPage.actions.addInitialNodeToCanvas('Manual');
				WorkflowPage.actions.addNodeToCanvas('Code');
				WorkflowPage.actions.openNode('Code');

				cy.getByTestId('code-node-tab-ai').should('not.exist');

				ndv.actions.close();
				win.featureFlags.override('011_ask_AI', undefined);
				WorkflowPage.actions.openNode('Code');
				cy.getByTestId('code-node-tab-ai').should('not.exist');
			})
		})

		describe('Enabled', () => {
			beforeEach(() => {
				cy.window().then((win) => {
					win.featureFlags.override('011_ask_AI', 'gpt3');
					WorkflowPage.actions.addInitialNodeToCanvas('Manual');
					WorkflowPage.actions.addNodeToCanvas('Code');
					WorkflowPage.actions.openNode('Code');
				})
			})

			it('tab should exist if model selected and be selectable', () => {
					cy.getByTestId('code-node-tab-ai').should('exist');
					cy.get('#tab-ask-ai').click();
					cy.contains('Hey AI, generate JavaScript').should('exist');
			})

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
					.type([...Array(14)].map(() => (Math.random() * 36 | 0).toString(36)).join(''))

				cy.getByTestId('ask-ai-cta').realHover();
				cy.getByTestId('ask-ai-cta-tooltip-prompt-too-short').should('exist');

				cy.getByTestId('ask-ai-prompt-input')
					.clear()
					// Type random 15 character string
					.type([...Array(15)].map(() => (Math.random() * 36 | 0).toString(36)).join(''))
				cy.getByTestId('ask-ai-cta').should('be.enabled');

				cy.getByTestId('ask-ai-prompt-counter').should('contain.text', '15 / 600');
			})

			it('should send correct schema and replace code', () => {
				const prompt = [...Array(20)].map(() => (Math.random() * 36 | 0).toString(36)).join('');
				cy.get('#tab-ask-ai').click();
				ndv.actions.executePrevious();

				cy.getByTestId('ask-ai-prompt-input').type(prompt)

				cy.intercept('POST', '/rest/ask-ai', {
					statusCode: 200,
					body: {
						data: {
							code: 'console.log("Hello World")',
							usage: {
								prompt_tokens: 15,
								completion_tokens: 15,
								total_tokens: 30
							}
						},
					}
				}).as('ask-ai');
				cy.getByTestId('ask-ai-cta').click();
				cy.wait('@ask-ai')
					.its('request.body')
					.should('deep.include', {
						question: prompt,
						model: "gpt-3.5-turbo-16k",
						context: { schema: [] }
					});

				cy.contains('Code generation completed').should('be.visible')
				cy.getByTestId('code-node-tab-code').should('contain.text', 'console.log("Hello World")');
				cy.get('#tab-code').should('have.class', 'is-active');
			})

			it('should show error based on status code', () => {
					const prompt = [...Array(20)].map(() => (Math.random() * 36 | 0).toString(36)).join('');
					cy.get('#tab-ask-ai').click();
					ndv.actions.executePrevious();

					cy.getByTestId('ask-ai-prompt-input').type(prompt)

					const handledCodes = [
						{ code: 400, message: 'Code generation failed due to an unknown reason' },
						{ code: 413, message: 'Your workflow data is too large for AI to process' },
						{ code: 429, message: 'We\'ve hit our rate limit with our AI partner' },
						{ code: 500, message: 'Code generation failed due to an unknown reason' },
					]

					handledCodes.forEach(({ code, message }) => {
						cy.intercept('POST', '/rest/ask-ai', {
							statusCode: code,
							status: code,
						}).as('ask-ai');

						cy.getByTestId('ask-ai-cta').click();
						cy.contains(message).should('be.visible')
					})
			})
		})
	});
});
