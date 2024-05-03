import { META_KEY } from '../constants';
import { WorkflowPage as WorkflowPageClass } from '../pages/workflow';
import { getPopper } from '../utils';
import { Interception } from 'cypress/types/net-stubbing';

const workflowPage = new WorkflowPageClass();

function checkStickiesStyle(
	top: number,
	left: number,
	height: number,
	width: number,
	zIndex?: number,
) {
	workflowPage.getters.stickies().should(($el) => {
		expect($el).to.have.css('top', `${top}px`);
		expect($el).to.have.css('left', `${left}px`);
		expect($el).to.have.css('height', `${height}px`);
		expect($el).to.have.css('width', `${width}px`);
		if (zIndex) {
			expect($el).to.have.css('z-index', `${zIndex}`);
		}
	});
}

describe('Canvas Actions', () => {
	beforeEach(() => {
		workflowPage.actions.visit();
	});

	it('adds sticky to canvas with default text and position', () => {
		workflowPage.getters.addStickyButton().should('not.be.visible');

		addDefaultSticky();
		workflowPage.actions.deselectAll();
		workflowPage.actions.addStickyFromContextMenu();
		workflowPage.actions.hitAddStickyShortcut();

		workflowPage.getters.stickies().should('have.length', 3);

		// Should not add a sticky for ctrl+shift+s
		cy.get('body')
			.type(META_KEY, { delay: 500, release: false })
			.type('{shift}', { release: false })
			.type('s');

		workflowPage.getters.stickies().should('have.length', 3);
		workflowPage.getters
			.stickies()
			.eq(0)
			.should('have.text', 'I’m a note\nDouble click to edit me. Guide\n')
			.find('a')
			.contains('Guide')
			.should('have.attr', 'href');
	});

	it('drags sticky around to top left corner', () => {
		// used to caliberate move sticky function
		addDefaultSticky();
		moveSticky({ top: 0, left: 0 });
	});

	it('drags sticky around and position/size are saved correctly', () => {
		addDefaultSticky();
		moveSticky({ top: 500, left: 500 });

		workflowPage.actions.saveWorkflowOnButtonClick();
		cy.wait('@createWorkflow');

		cy.reload();
		cy.waitForLoad();

		stickyShouldBePositionedCorrectly({ top: 500, left: 500 });
	});

	it('deletes sticky', () => {
		workflowPage.actions.addSticky();
		workflowPage.getters.stickies().should('have.length', 1);

		workflowPage.actions.deleteSticky();

		workflowPage.getters.stickies().should('have.length', 0);
	});

	it('change sticky color', () => {
		workflowPage.actions.addSticky();

		workflowPage.getters.stickies().should('have.length', 1);

		workflowPage.actions.toggleColorPalette();

		getPopper().should('be.visible');

		workflowPage.actions.pickColor(2);

		workflowPage.actions.toggleColorPalette();

		getPopper().should('not.be.visible');

		workflowPage.actions.saveWorkflowOnButtonClick();

		cy.wait('@createWorkflow').then((interception: Interception) => {
			const { request } = interception;
			const color = request.body?.nodes[0]?.parameters?.color;
			expect(color).to.equal(2);
		});

		workflowPage.getters.stickies().should('have.length', 1);
	});

	it('edits sticky and updates content as markdown', () => {
		workflowPage.actions.addSticky();

		workflowPage.getters
			.stickies()
			.should('have.text', 'I’m a note\nDouble click to edit me. Guide\n');

		workflowPage.getters.stickies().dblclick();
		workflowPage.actions.editSticky('# hello world \n ## text text');
		workflowPage.getters.stickies().find('h1').should('have.text', 'hello world');
		workflowPage.getters.stickies().find('h2').should('have.text', 'text text');
	});

	it('expands/shrinks sticky from the right edge', () => {
		addDefaultSticky();

		moveSticky({ top: 200, left: 200 });

		cy.drag('[data-test-id="sticky"] [data-dir="right"]', [100, 100]);
		checkStickiesStyle(100, 20, 160, 346);

		cy.drag('[data-test-id="sticky"] [data-dir="right"]', [-50, -50]);
		checkStickiesStyle(100, 20, 160, 302);
	});

	it('expands/shrinks sticky from the left edge', () => {
		addDefaultSticky();

		moveSticky({ left: 600, top: 200 });
		cy.drag('[data-test-id="sticky"] [data-dir="left"]', [100, 100]);
		checkStickiesStyle(100, 510, 160, 150);

		cy.drag('[data-test-id="sticky"] [data-dir="left"]', [-50, -50]);
		checkStickiesStyle(100, 466, 160, 194);
	});

	it('expands/shrinks sticky from the top edge', () => {
		workflowPage.actions.addSticky();
		cy.drag('[data-test-id="sticky"]', [100, 100]); // move away from canvas button
		checkStickiesStyle(300, 620, 160, 240);

		cy.drag('[data-test-id="sticky"] [data-dir="top"]', [100, 100]);
		checkStickiesStyle(380, 620, 80, 240);

		cy.drag('[data-test-id="sticky"] [data-dir="top"]', [-50, -50]);
		checkStickiesStyle(324, 620, 136, 240);
	});

	it('expands/shrinks sticky from the bottom edge', () => {
		workflowPage.actions.addSticky();
		cy.drag('[data-test-id="sticky"]', [100, 100]); // move away from canvas button
		checkStickiesStyle(300, 620, 160, 240);

		cy.drag('[data-test-id="sticky"] [data-dir="bottom"]', [100, 100]);
		checkStickiesStyle(300, 620, 254, 240);

		cy.drag('[data-test-id="sticky"] [data-dir="bottom"]', [-50, -50]);
		checkStickiesStyle(300, 620, 198, 240);
	});

	it('expands/shrinks sticky from the bottom right edge', () => {
		workflowPage.actions.addSticky();
		cy.drag('[data-test-id="sticky"]', [-100, -100]); // move away from canvas button
		checkStickiesStyle(100, 420, 160, 240);

		cy.drag('[data-test-id="sticky"] [data-dir="bottomRight"]', [100, 100]);
		checkStickiesStyle(100, 420, 254, 346);

		cy.drag('[data-test-id="sticky"] [data-dir="bottomRight"]', [-50, -50]);
		checkStickiesStyle(100, 420, 198, 302);
	});

	it('expands/shrinks sticky from the top right edge', () => {
		addDefaultSticky();

		cy.drag('[data-test-id="sticky"] [data-dir="topRight"]', [100, 100]);
		checkStickiesStyle(360, 400, 80, 346);

		cy.drag('[data-test-id="sticky"] [data-dir="topRight"]', [-50, -50]);
		checkStickiesStyle(304, 400, 136, 302);
	});

	it('expands/shrinks sticky from the top left edge, and reach min height/width', () => {
		addDefaultSticky();

		cy.drag('[data-test-id="sticky"] [data-dir="topLeft"]', [100, 100]);
		checkStickiesStyle(360, 490, 80, 150);

		cy.drag('[data-test-id="sticky"] [data-dir="topLeft"]', [-150, -150]);
		checkStickiesStyle(204, 346, 236, 294);
	});

	it('sets sticky behind node', () => {
		workflowPage.actions.addInitialNodeToCanvas('Manual Trigger');
		addDefaultSticky();

		cy.drag('[data-test-id="sticky"] [data-dir="topLeft"]', [-150, -150]);
		checkStickiesStyle(124, 256, 316, 384, -121);

		workflowPage.getters
			.canvasNodes()
			.eq(0)
			.should(($el) => {
				expect($el).to.have.css('z-index', 'auto');
			});

		workflowPage.actions.addSticky();
		workflowPage.getters
			.stickies()
			.eq(0)
			.should(($el) => {
				expect($el).to.have.css('z-index', '-121');
			});
		workflowPage.getters
			.stickies()
			.eq(1)
			.should(($el) => {
				expect($el).to.have.css('z-index', '-38');
			});

		cy.drag('[data-test-id="sticky"] [data-dir="topLeft"]', [-200, -200], { index: 1 });
		workflowPage.getters
			.stickies()
			.eq(0)
			.should(($el) => {
				expect($el).to.have.css('z-index', '-121');
			});

		workflowPage.getters
			.stickies()
			.eq(1)
			.should(($el) => {
				expect($el).to.have.css('z-index', '-158');
			});
	});

	it('Empty sticky should not error when activating workflow', () => {
		workflowPage.actions.addSticky();

		workflowPage.getters.stickies().should('have.length', 1);

		workflowPage.getters.stickies().dblclick();

		workflowPage.actions.clearSticky();

		workflowPage.actions.addNodeToCanvas('Schedule Trigger');

		workflowPage.actions.activateWorkflow();
	});
});

type Position = {
	top: number;
	left: number;
};

function shouldHaveOneSticky() {
	workflowPage.getters.stickies().should('have.length', 1);
}

function shouldBeInDefaultLocation() {
	workflowPage.getters
		.stickies()
		.eq(0)
		.should(($el) => {
			expect($el).to.have.css('height', '160px');
			expect($el).to.have.css('width', '240px');
		});
}

function shouldHaveDefaultSize() {
	workflowPage.getters.stickies().should(($el) => {
		expect($el).to.have.css('height', '160px');
		expect($el).to.have.css('width', '240px');
	});
}

function addDefaultSticky() {
	workflowPage.actions.addSticky();
	shouldHaveOneSticky();
	shouldHaveDefaultSize();
	shouldBeInDefaultLocation();
}

function stickyShouldBePositionedCorrectly(position: Position) {
	const yOffset = -100;
	const xOffset = -180;
	workflowPage.getters.stickies().should(($el) => {
		expect($el).to.have.css('top', `${yOffset + position.top}px`);
		expect($el).to.have.css('left', `${xOffset + position.left}px`);
	});
}

function stickyShouldHaveCorrectSize(size: [number, number]) {
	const yOffset = 0;
	const xOffset = 0;
	workflowPage.getters.stickies().should(($el) => {
		expect($el).to.have.css('height', `${yOffset + size[0]}px`);
		expect($el).to.have.css('width', `${xOffset + size[1]}px`);
	});
}

function moveSticky(target: Position) {
	cy.drag('[data-test-id="sticky"]', [target.left, target.top], { abs: true });
	stickyShouldBePositionedCorrectly(target);
}
