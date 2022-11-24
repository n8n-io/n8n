describe('Authentication', () => {
	it('should skip owner setup', () => {
		cy.skipSetup();
	});

	// it('should sign user in', () => {
	// 	cy.on('uncaught:exception', (err, runnable) => {
	// 		expect(err.message).to.include('Not logged in');

	// 		return false;
	// 	})

	// 	cy.signin(username, password);
	// });
});
