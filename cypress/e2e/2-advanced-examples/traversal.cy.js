/// <reference types="cypress" />

context('Traversal', () => {
  beforeEach(() => {
    cy.visit('https://example.cypress.io/commands/traversal')
  })

  it('.children() - get child DOM elements', () => {
    // https://on.cypress.io/children
    cy.get('.traversal-breadcrumb')
      .children('.active')
      .should('contain', 'Data')
  })

  it('.closest() - get closest ancestor DOM element', () => {
    // https://on.cypress.io/closest
    cy.get('.traversal-badge')
      .closest('ul')
      .should('have.class', 'list-group')
  })

  it('.eq() - get a DOM element at a specific index', () => {
    // https://on.cypress.io/eq
    cy.get('.traversal-list>li')
      .eq(1).should('contain', 'siamese')
  })

  it('.filter() - get DOM elements that match the selector', () => {
    // https://on.cypress.io/filter
    cy.get('.traversal-nav>li')
      .filter('.active').should('contain', 'About')
  })

  it('.find() - get descendant DOM elements of the selector', () => {
    // https://on.cypress.io/find
    cy.get('.traversal-pagination')
      .find('li').find('a')
      .should('have.length', 7)
  })

  it('.first() - get first DOM element', () => {
    // https://on.cypress.io/first
    cy.get('.traversal-table td')
      .first().should('contain', '1')
  })

  it('.last() - get last DOM element', () => {
    // https://on.cypress.io/last
    cy.get('.traversal-buttons .btn')
      .last().should('contain', 'Submit')
  })

  it('.next() - get next sibling DOM element', () => {
    // https://on.cypress.io/next
    cy.get('.traversal-ul')
      .contains('apples').next().should('contain', 'oranges')
  })

  it('.nextAll() - get all next sibling DOM elements', () => {
    // https://on.cypress.io/nextall
    cy.get('.traversal-next-all')
      .contains('oranges')
      .nextAll().should('have.length', 3)
  })

  it('.nextUntil() - get next sibling DOM elements until next el', () => {
    // https://on.cypress.io/nextuntil
    cy.get('#veggies')
      .nextUntil('#nuts').should('have.length', 3)
  })

  it('.not() - remove DOM elements from set of DOM elements', () => {
    // https://on.cypress.io/not
    cy.get('.traversal-disabled .btn')
      .not('[disabled]').should('not.contain', 'Disabled')
  })

  it('.parent() - get parent DOM element from DOM elements', () => {
    // https://on.cypress.io/parent
    cy.get('.traversal-mark')
      .parent().should('contain', 'Morbi leo risus')
  })

  it('.parents() - get parent DOM elements from DOM elements', () => {
    // https://on.cypress.io/parents
    cy.get('.traversal-cite')
      .parents().should('match', 'blockquote')
  })

  it('.parentsUntil() - get parent DOM elements from DOM elements until el', () => {
    // https://on.cypress.io/parentsuntil
    cy.get('.clothes-nav')
      .find('.active')
      .parentsUntil('.clothes-nav')
      .should('have.length', 2)
  })

  it('.prev() - get previous sibling DOM element', () => {
    // https://on.cypress.io/prev
    cy.get('.birds').find('.active')
      .prev().should('contain', 'Lorikeets')
  })

  it('.prevAll() - get all previous sibling DOM elements', () => {
    // https://on.cypress.io/prevall
    cy.get('.fruits-list').find('.third')
      .prevAll().should('have.length', 2)
  })

  it('.prevUntil() - get all previous sibling DOM elements until el', () => {
    // https://on.cypress.io/prevuntil
    cy.get('.foods-list').find('#nuts')
      .prevUntil('#veggies').should('have.length', 3)
  })

  it('.siblings() - get all sibling DOM elements', () => {
    // https://on.cypress.io/siblings
    cy.get('.traversal-pills .active')
      .siblings().should('have.length', 2)
  })
})
