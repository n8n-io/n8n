import { WorkflowPage as WorkflowPageClass } from '../pages/workflow';

const workflowPage = new WorkflowPageClass();

describe('Canvas Actions', () => {
	beforeEach(() => {
		cy.resetAll();
		cy.skipSetup();
		workflowPage.actions.visit();
		cy.waitForLoad();

		cy.window()
		// @ts-ignore
		.then(win => win.onBeforeUnload && win.removeEventListener('beforeunload', win.onBeforeUnload))
	});

	it('adds sticky to canvas with default text and position', () => {
		workflowPage.getters.addStickyButton().should('not.be.visible');

		addDefaultSticky()
		workflowPage.getters.stickies().eq(0)
			.should('have.text', 'I’m a note\nDouble click to edit me. Guide\n')
			.find('a').contains('Guide').should('have.attr', 'href');
	});

	it('drags sticky around to top left corner', () => {
		// used to caliberate move sticky function
		addDefaultSticky();
		moveSticky({top: 0, left: 0});
	});

	it('drags sticky around and position/size are saved correctly', () => {
		addDefaultSticky();
		moveSticky({top: 500, left: 500});

		workflowPage.actions.saveWorkflowUsingKeyboardShortcut();

		cy.reload();
		cy.waitForLoad();

		stickyShouldBePositionedCorrectly({top: 500, left: 500});
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
		addDefaultSticky();

		moveSticky({top: 200, left: 200});

		dragRightEdge({left: 200, top: 200, height: 160, width: 240}, 100);
		dragRightEdge({left: 200, top: 200, height: 160, width: 240}, -50);
	});

	it('expands/shrinks sticky from the left edge', () => {
		addDefaultSticky();

		moveSticky({left: 600, top: 200});
		cy.drag('[data-test-id="sticky"] [data-dir="left"]', [100, 100]);
		workflowPage.getters.stickies()
			.should(($el) => {
				expect($el).to.have.css('top', '140px');
				expect($el).to.have.css('left', '510px');
				expect($el).to.have.css('height', '160px');
				expect($el).to.have.css('width', '150px');
			});

		cy.drag('[data-test-id="sticky"] [data-dir="left"]', [-50, -50]);
		workflowPage.getters.stickies()
			.should(($el) => {
				expect($el).to.have.css('top', '140px');
				expect($el).to.have.css('left', '466px');
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

	it('expands/shrinks sticky from the bottom right edge', () => {
		workflowPage.actions.addSticky();
		cy.drag('[data-test-id="sticky"]', [-100, -100]); // move away from canvas button
		workflowPage.getters.stickies()
			.should(($el) => {
				expect($el).to.have.css('top', '160px');
				expect($el).to.have.css('left', '420px');
				expect($el).to.have.css('height', '160px');
				expect($el).to.have.css('width', '240px');
			});

		cy.drag('[data-test-id="sticky"] [data-dir="bottomRight"]', [100, 100]);
		workflowPage.getters.stickies()
			.should(($el) => {
				expect($el).to.have.css('top', '160px');
				expect($el).to.have.css('left', '420px');
				expect($el).to.have.css('height', '254px');
				expect($el).to.have.css('width', '346px');
			});

		cy.drag('[data-test-id="sticky"] [data-dir="bottomRight"]', [-50, -50]);
		workflowPage.getters.stickies()
			.should(($el) => {
				expect($el).to.have.css('top', '160px');
				expect($el).to.have.css('left', '420px');
				expect($el).to.have.css('height', '198px');
				expect($el).to.have.css('width', '302px');
			});
	});

	it('expands/shrinks sticky from the top right edge', () => {
		addDefaultSticky();

		cy.drag('[data-test-id="sticky"] [data-dir="topRight"]', [100, 100]);
		workflowPage.getters.stickies()
			.should(($el) => {
				expect($el).to.have.css('top', '420px');
				expect($el).to.have.css('left', '400px');
				expect($el).to.have.css('height', '80px');
				expect($el).to.have.css('width', '346px');
			});

		cy.drag('[data-test-id="sticky"] [data-dir="topRight"]', [-50, -50]);
		workflowPage.getters.stickies()
			.should(($el) => {
				expect($el).to.have.css('top', '364px');
				expect($el).to.have.css('left', '400px');
				expect($el).to.have.css('height', '136px');
				expect($el).to.have.css('width', '302px');
			});
	});

	it('expands/shrinks sticky from the top left edge, and reach min height/width', () => {
		addDefaultSticky();

		cy.drag('[data-test-id="sticky"] [data-dir="topLeft"]', [100, 100]);
		workflowPage.getters.stickies()
			.should(($el) => {
			expect($el).to.have.css('top', '420px');
			expect($el).to.have.css('left', '490px');
			expect($el).to.have.css('height', '80px');
			expect($el).to.have.css('width', '150px');
		});

		cy.drag('[data-test-id="sticky"] [data-dir="topLeft"]', [-150, -150]);
		workflowPage.getters.stickies()
			.should(($el) => {
				expect($el).to.have.css('top', '264px');
				expect($el).to.have.css('left', '346px');
				expect($el).to.have.css('height', '236px');
				expect($el).to.have.css('width', '294px');
			});
	});
});

type Position = {
	top: number;
	left: number;
};

type BoundingBox = {
	height: number;
	width: number;
	top: number;
	left: number;
}

function dragRightEdge(curr: BoundingBox, move: number) {
	workflowPage.getters.stickies().first().then(($el) => {
		const {left, top, height, width} = curr;
		cy.drag(`[data-test-id="sticky"] [data-dir="right"]`, [left + width + move, 0], {abs: true});
		stickyShouldBePositionedCorrectly({top, left});
		stickyShouldHaveCorrectSize([height, width * 1.5 + move]);
	});
}

function shouldHaveOneSticky() {
	workflowPage.getters.stickies().should('have.length', 1);
}

function shouldBeInDefaultLocation() {
	workflowPage.getters.stickies().eq(0).should(($el) => {
		expect($el).to.have.css('height', '160px');
		expect($el).to.have.css('width', '240px');
	})
}

function shouldHaveDefaultSize() {
	workflowPage.getters.stickies().should(($el) => {
		expect($el).to.have.css('height', '160px');
		expect($el).to.have.css('width', '240px');
	})
}

function addDefaultSticky() {
	workflowPage.actions.addSticky();
	shouldHaveOneSticky();
	shouldHaveDefaultSize();
	shouldBeInDefaultLocation();
}

function stickyShouldBePositionedCorrectly(position: Position) {
	const yOffset = -60;
	const xOffset = -180;
	workflowPage.getters.stickies()
		.should(($el) => {
			expect($el).to.have.css('top', `${yOffset + position.top}px`);
			expect($el).to.have.css('left', `${xOffset + position.left}px`);
		});
}

function stickyShouldHaveCorrectSize(size: [number, number]) {
	const yOffset = 0;
	const xOffset = 0;
	workflowPage.getters.stickies()
		.should(($el) => {
			expect($el).to.have.css('height', `${yOffset + size[0]}px`);
			expect($el).to.have.css('width', `${xOffset + size[1]}px`);
		});
}

function moveSticky(target: Position) {
	cy.drag('[data-test-id="sticky"]', [target.left, target.top], {abs: true});
	stickyShouldBePositionedCorrectly(target);
}
