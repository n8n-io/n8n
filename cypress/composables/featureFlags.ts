export const overrideFeatureFlag = (name: string, value: boolean | string) => {
	cy.window().then((win) => {
		// If feature flags hasn't been initialized yet, we store the override
		// in local storage and it gets loaded when the feature flags are
		// initialized.
		win.localStorage.setItem('N8N_EXPERIMENT_OVERRIDES', JSON.stringify({ [name]: value }));

		if (win.featureFlags) {
			win.featureFlags.override(name, value);
		}
	});
};
