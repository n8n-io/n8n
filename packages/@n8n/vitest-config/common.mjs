export const coverage = {
	enabled: false,
	all: false,
	provider: 'v8',
	reporter: ['text-summary', 'lcov', 'html-spa'],
};

export const enableCoverage = (vitestConfig) => {
	if (process.env.COVERAGE_ENABLED === 'true') {
		const { coverage } = vitestConfig.test;
		coverage.enabled = true;
		if (process.env.CI === 'true') {
			coverage.all = true;
			coverage.reporter = ['cobertura'];
		}
	}
};
