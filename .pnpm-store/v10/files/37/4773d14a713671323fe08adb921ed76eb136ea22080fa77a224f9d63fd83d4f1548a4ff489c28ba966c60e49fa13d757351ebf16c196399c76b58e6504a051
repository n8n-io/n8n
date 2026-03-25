/// <reference types="cypress" />

describe('vue observe visibility', () => {
	it('detects visibility when scrolling', () => {
		cy.visit('/')
		cy.get('[id="is-visible"]').should('not.be.checked')
		cy.get('.test').scrollIntoView()
		cy.get('[id="is-visible"]').should('be.checked')
		cy.get('.info').scrollIntoView()
		cy.get('[id="is-visible"]').should('not.be.checked')
	})

	it('detects visibility when toggling the element', () => {
		cy.visit('/')
		cy.get('.test').scrollIntoView()
		cy.get('[id="is-visible"]').should('be.checked')
		cy.get('.toggle').click()
		cy.get('.test').should('not.be.visible')
		cy.get('[id="is-visible"]').should('not.be.checked')
		cy.get('.toggle').click()
		cy.get('.test').should('be.visible')
		cy.get('[id="is-visible"]').should('be.checked')
	})

	it('can be disabled', () => {
		cy.visit('/')
		cy.get('[id="disabled"]').click().should('be.checked')
		cy.get('.test').scrollIntoView()
		cy.get('[id="is-visible"]').should('not.be.checked')
	})
})
