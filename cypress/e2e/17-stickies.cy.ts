import { WorkflowPage as WorkflowPageClass } from '../pages/workflow';

const workflowPage = new WorkflowPageClass();

describe('Canvas Actions', () => {
	beforeEach(() => {
		cy.resetAll();
		cy.skipSetup();
		workflowPage.actions.visit();
		cy.waitForLoad();
	});

	it('adds sticky to canvas with default text and position', () => {
		workflowPage.getters.addStickyButton().should('not.be.visible');
		workflowPage.actions.addSticky();

		workflowPage.getters.stickies().should('have.length', 1)
			.and(($el) => {
				expect($el).to.have.css('top', '340px');
				expect($el).to.have.css('left', '400px');
				expect($el).to.have.css('height', '160px');
				expect($el).to.have.css('width', '240px');
			})
			.should('have.text', 'I’m a note\nDouble click to edit me. Guide\n')
			.find('a').contains('Guide').should('have.attr', 'href');
	});

	it('drags sticky around and position/size are saved correctly', () => {
		workflowPage.actions.addSticky();

		workflowPage.getters.stickies().should('have.length', 1)
			.should(($el) => {
				expect($el).to.have.css('top', '340px');
				expect($el).to.have.css('left', '400px');
				expect($el).to.have.css('height', '160px');
				expect($el).to.have.css('width', '240px');
			});

		cy.drag('[data-test-id="sticky"]', [100, 100]);
		workflowPage.getters.stickies()
			.should(($el) => {
				expect($el).to.have.css('top', '360px');
				expect($el).to.have.css('left', '620px');
				expect($el).to.have.css('height', '160px');
				expect($el).to.have.css('width', '240px');
			});

		workflowPage.actions.saveWorkflowUsingKeyboardShortcut();
		cy.waitForLoad();

		cy.reload();

		workflowPage.getters.stickies()
			.should(($el) => {
				expect($el).to.have.css('top', '360px');
				expect($el).to.have.css('left', '620px');
				expect($el).to.have.css('height', '160px');
				expect($el).to.have.css('width', '240px');
			});
	});

	it('deletes sticky', () => {
		workflowPage.actions.addSticky();
		workflowPage.getters.stickies().should('have.length', 1)

		workflowPage.actions.deleteSticky();

		workflowPage.getters.stickies().should('have.length', 0)
	});

	it('edits sticky and updates content as markdown', () => {
		workflowPage.actions.addSticky();

		workflowPage.getters.stickies()
			.should('have.text', 'I’m a note\nDouble click to edit me. Guide\n')

		workflowPage.getters.stickies().dblclick();
		workflowPage.actions.editSticky('# hello world \n ## text text');
		workflowPage.getters.stickies().find('h1').should('have.text', 'hello world');
		workflowPage.getters.stickies().find('h2').should('have.text', 'text text');

	});

	it('expands/shrinks sticky from the right edge', () => {
		workflowPage.actions.addSticky();
		workflowPage.getters.stickies()
			.should(($el) => {
				expect($el).to.have.css('top', '340px');
				expect($el).to.have.css('left', '400px');
				expect($el).to.have.css('height', '160px');
				expect($el).to.have.css('width', '240px');
			});

		cy.drag('[data-test-id="sticky"] [data-dir="right"]', [100, 100]);
		workflowPage.getters.stickies()
			.should(($el) => {
				expect($el).to.have.css('top', '340px');
				expect($el).to.have.css('left', '400px');
				expect($el).to.have.css('height', '160px');
				expect($el).to.have.css('width', '346px');
			});

		cy.drag('[data-test-id="sticky"] [data-dir="right"]', [-50, -50]);
		workflowPage.getters.stickies()
			.should(($el) => {
				expect($el).to.have.css('top', '340px');
				expect($el).to.have.css('left', '400px');
				expect($el).to.have.css('height', '160px');
				expect($el).to.have.css('width', '302px');
			});
	});

	it('expands/shrinks sticky from the left edge', () => {
		workflowPage.actions.addSticky();
		workflowPage.getters.stickies()
			.should(($el) => {
				expect($el).to.have.css('top', '340px');
				expect($el).to.have.css('left', '400px');
				expect($el).to.have.css('height', '160px');
				expect($el).to.have.css('width', '240px');
			});

		cy.drag('[data-test-id="sticky"] [data-dir="left"]', [100, 100]);
		workflowPage.getters.stickies()
			.should(($el) => {
				expect($el).to.have.css('top', '340px');
				expect($el).to.have.css('left', '490px');
				expect($el).to.have.css('height', '160px');
				expect($el).to.have.css('width', '150px');
			});

		cy.drag('[data-test-id="sticky"] [data-dir="left"]', [-50, -50]);
		workflowPage.getters.stickies()
			.should(($el) => {
				expect($el).to.have.css('top', '340px');
				expect($el).to.have.css('left', '446px');
				expect($el).to.have.css('height', '160px');
				expect($el).to.have.css('width', '194px');
			});
	});

	it('expands/shrinks sticky from the top edge', () => {
		workflowPage.actions.addSticky();
		cy.drag('[data-test-id="sticky"]', [100, 100]); // move away from canvas button
		workflowPage.getters.stickies()
			.should(($el) => {
				expect($el).to.have.css('top', '360px');
				expect($el).to.have.css('left', '620px');
				expect($el).to.have.css('height', '160px');
				expect($el).to.have.css('width', '240px');
			});

		cy.drag('[data-test-id="sticky"] [data-dir="top"]', [100, 100]);
		workflowPage.getters.stickies()
			.should(($el) => {
				expect($el).to.have.css('top', '440px');
				expect($el).to.have.css('left', '620px');
				expect($el).to.have.css('height', '80px');
				expect($el).to.have.css('width', '240px');
			});

		cy.drag('[data-test-id="sticky"] [data-dir="top"]', [-50, -50]);
		workflowPage.getters.stickies()
			.should(($el) => {
				expect($el).to.have.css('top', '384px');
				expect($el).to.have.css('left', '620px');
				expect($el).to.have.css('height', '136px');
				expect($el).to.have.css('width', '240px');
			});
	});

	it('expands/shrinks sticky from the bottom edge', () => {
		workflowPage.actions.addSticky();
		cy.drag('[data-test-id="sticky"]', [100, 100]); // move away from canvas button
		workflowPage.getters.stickies()
			.should(($el) => {
				expect($el).to.have.css('top', '360px');
				expect($el).to.have.css('left', '620px');
				expect($el).to.have.css('height', '160px');
				expect($el).to.have.css('width', '240px');
			});

		cy.drag('[data-test-id="sticky"] [data-dir="bottom"]', [100, 100]);
		workflowPage.getters.stickies()
			.should(($el) => {
				expect($el).to.have.css('top', '360px');
				expect($el).to.have.css('left', '620px');
				expect($el).to.have.css('height', '254px');
				expect($el).to.have.css('width', '240px');
			});

		cy.drag('[data-test-id="sticky"] [data-dir="bottom"]', [-50, -50]);
		workflowPage.getters.stickies()
			.should(($el) => {
				expect($el).to.have.css('top', '360px');
				expect($el).to.have.css('left', '620px');
				expect($el).to.have.css('height', '198px');
				expect($el).to.have.css('width', '240px');
			});
	});


	// it('is positioned behind nodes and above when editing', () => {

	// });

	// it('is positioned based on size', () => {

	// });

	// it('can select stickies using lasso tool', () => {

	// });

	// it('zooms to fit stickies', () => {

	// });

	// it('can undo position drag', () => {

	// });

		// it('always adds stickies in the middle of the canvas', () => {
		// workflowPage.getters.nodeView()
		// 	.should(($el) => {
		// 		expect($el).to.have.css('top', '-80px');
		// 		expect($el).to.have.css('left', '0px');
		// 	});

		// cy.window()
		// 	.trigger('keydown', { key: '{ctrl}', force: true})
		// 	.realMouseMove(100, 100)
		// 	.realMouseDown()
		// 	.realMouseMove(200, 200)
		// 	.realMouseUp()
		// 	.trigger('keyup', {key: '{ctrl}', force: true});

		// // cy.wait(1000);
		// workflowPage.getters.nodeView()
		// 	.should(($el) => {
		// 		expect($el).to.have.css('top', '-80px');
		// 		expect($el).to.have.css('left', '0px');
		// 	});

		// workflowPage.actions.addSticky();

		// workflowPage.getters.stickies().should('have.length', 1)
		// 	.and(($el) => {
		// 		expect($el).to.have.css('top', '340px');
		// 		expect($el).to.have.css('left', '400px');
		// 	});
	// });
});
