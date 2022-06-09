/// <reference types="cypress" />

context('Connectors', () => {
  beforeEach(() => {
    cy.visit('https://example.cypress.io/commands/connectors')
  })

  it('.each() - iterate over an array of elements', () => {
    // https://on.cypress.io/each
    cy.get('.connectors-each-ul>li')
      .each(($el, index, $list) => {
        console.log($el, index, $list)
      })
  })

  it('.its() - get properties on the current subject', () => {
    // https://on.cypress.io/its
    cy.get('.connectors-its-ul>li')
      // calls the 'length' property yielding that value
      .its('length')
      .should('be.gt', 2)
  })

  it('.invoke() - invoke a function on the current subject', () => {
    // our div is hidden in our script.js
    // $('.connectors-div').hide()

    // https://on.cypress.io/invoke
    cy.get('.connectors-div').should('be.hidden')
      // call the jquery method 'show' on the 'div.container'
      .invoke('show')
      .should('be.visible')
  })

  it('.spread() - spread an array as individual args to callback function', () => {
    // https://on.cypress.io/spread
    const arr = ['foo', 'bar', 'baz']

    cy.wrap(arr).spread((foo, bar, baz) => {
      expect(foo).to.eq('foo')
      expect(bar).to.eq('bar')
      expect(baz).to.eq('baz')
    })
  })

  describe('.then()', () => {
    it('invokes a callback function with the current subject', () => {
      // https://on.cypress.io/then
      cy.get('.connectors-list > li')
        .then(($lis) => {
          expect($lis, '3 items').to.have.length(3)
          expect($lis.eq(0), 'first item').to.contain('Walk the dog')
          expect($lis.eq(1), 'second item').to.contain('Feed the cat')
          expect($lis.eq(2), 'third item').to.contain('Write JavaScript')
        })
    })

    it('yields the returned value to the next command', () => {
      cy.wrap(1)
        .then((num) => {
          expect(num).to.equal(1)

          return 2
        })
        .then((num) => {
          expect(num).to.equal(2)
        })
    })

    it('yields the original subject without return', () => {
      cy.wrap(1)
        .then((num) => {
          expect(num).to.equal(1)
          // note that nothing is returned from this callback
        })
        .then((num) => {
          // this callback receives the original unchanged value 1
          expect(num).to.equal(1)
        })
    })

    it('yields the value yielded by the last Cypress command inside', () => {
      cy.wrap(1)
        .then((num) => {
          expect(num).to.equal(1)
          // note how we run a Cypress command
          // the result yielded by this Cypress command
          // will be passed to the second ".then"
          cy.wrap(2)
        })
        .then((num) => {
          // this callback receives the value yielded by "cy.wrap(2)"
          expect(num).to.equal(2)
        })
    })
  })
})
