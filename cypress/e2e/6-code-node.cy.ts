import { nanoid } from 'nanoid';

import { NDV } from '../pages/ndv';
import { successToast } from '../pages/notifications';
import { WorkflowPage as WorkflowPageClass } from '../pages/workflow';

const WorkflowPage = new WorkflowPageClass();
const ndv = new NDV();

const getParameter = () => ndv.getters.parameterInput('jsCode').should('be.visible');
const getEditor = () => getParameter().find('.cm-content').should('exist');

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

			successToast().contains('Node executed successfully');
			ndv.getters.parameterInput('mode').click();
			ndv.actions.selectOptionInParameterDropdown('mode', 'Run Once for Each Item');

			ndv.actions.execute();

			successToast().contains('Node executed successfully');
		});

		it('should allow switching between sibling code nodes', () => {
			// Setup
			getEditor().type('{selectall}').paste("console.log('code node 1')");
			ndv.actions.close();
			WorkflowPage.actions.addNodeToCanvas('Code', true, true);
			getEditor().type('{selectall}').paste("console.log('code node 2')");
			ndv.actions.close();

			WorkflowPage.actions.openNode('Code');
			ndv.actions.clickFloatingNode('Code1');
			getEditor().should('have.text', "console.log('code node 2')");

			ndv.actions.clickFloatingNode('Code');
			getEditor().should('have.text', "console.log('code node 1')");
		});

		it('should show lint errors in `runOnceForAllItems` mode', () => {
			getEditor()
				.type('{selectall}')
				.paste(`$input.itemMatching()
$input.item
$('When clicking ‘Execute workflow’').item
$input.first(1)

for (const item of $input.all()) {
  item.foo
}

return
`);
			getParameter().get('.cm-lintRange-error').should('have.length', 6);
			getParameter().contains('itemMatching').realHover();
			cy.get('.cm-tooltip-lint').should(
				'have.text',
				'`.itemMatching()` expects an item index to be passed in as its argument.',
			);
		});

		it('should show lint errors in `runOnceForEachItem` mode', () => {
			ndv.getters.parameterInput('mode').click();
			ndv.actions.selectOptionInParameterDropdown('mode', 'Run Once for Each Item');
			getEditor()
				.type('{selectall}')
				.paste(`$input.itemMatching()
$input.all()
$input.first()
$input.item()

return []
`);

			getParameter().get('.cm-lintRange-error').should('have.length', 5);
			getParameter().contains('all').realHover();
			cy.get('.cm-tooltip-lint').should(
				'have.text',
				"Method `$input.all()` is only available in the 'Run Once for All Items' mode.",
			);
		});
	});

	describe('Ask AI', () => {
		describe('Enabled', () => {
			beforeEach(() => {
				cy.enableFeature('askAi');
				WorkflowPage.actions.visit();

				cy.window().then(() => {
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
					.type(nanoid(14));

				cy.getByTestId('ask-ai-cta').realHover();
				cy.getByTestId('ask-ai-cta-tooltip-prompt-too-short').should('exist');

				cy.getByTestId('ask-ai-prompt-input')
					.clear()
					// Type random 15 character string
					.type(nanoid(15));
				cy.getByTestId('ask-ai-cta').should('be.enabled');

				cy.getByTestId('ask-ai-prompt-counter').should('contain.text', '15 / 600');
			});

			it('should send correct schema and replace code', () => {
				const prompt = nanoid(20);
				cy.get('#tab-ask-ai').click();
				ndv.actions.executePrevious();

				cy.getByTestId('ask-ai-prompt-input').type(prompt);

				cy.intercept('POST', '/rest/ai/ask-ai', {
					statusCode: 200,
					body: {
						data: {
							code: 'console.log("Hello World")',
						},
					},
				}).as('ask-ai');

				cy.getByTestId('ask-ai-cta').click();
				const askAiReq = cy.wait('@ask-ai');

				askAiReq.its('request.body').should('have.keys', ['question', 'context', 'forNode']);
				askAiReq
					.its('context')
					.should('have.keys', ['schema', 'ndvPushRef', 'pushRef', 'inputSchema']);

				cy.contains('Code generation completed').should('be.visible');
				cy.getByTestId('code-node-tab-code').should('contain.text', 'console.log("Hello World")');
				cy.get('#tab-code').should('have.class', 'is-active');
			});

			const handledCodes = [
				{ code: 400, message: 'Code generation failed due to an unknown reason' },
				{ code: 413, message: 'Your workflow data is too large for AI to process' },
				{ code: 429, message: "We've hit our rate limit with our AI partner" },
				{
					code: 500,
					message:
						'Code generation failed with error: Request failed with status code 500. Try again in a few minutes',
				},
			];

			handledCodes.forEach(({ code, message }) => {
				it(`should show error based on status code ${code}`, () => {
					const prompt = nanoid(20);
					cy.get('#tab-ask-ai').click();
					ndv.actions.executePrevious();

					cy.getByTestId('ask-ai-prompt-input').type(prompt);

					cy.intercept('POST', '/rest/ai/ask-ai', {
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
