export default {
	preset: "ts-jest",
	testEnvironment: "node",
	restoreMocks: true,
	clearMocks: true,
	collectCoverageFrom: [
		"lib/**/*.ts",
	],
	coverageProvider: "v8",
	coverageDirectory: "coverage",
	coverageThreshold: {
		global: {
			branches: 100,
			functions: 100,
			lines: 100,
			statements: 100,
		},
	},
	testRegex: /\.test\.tsx?/.source,
	transform: {
		[/\.test\.tsx?/.source]: [
			"ts-jest", {
				diagnostics: false,
			},
		],
	},
	moduleFileExtensions: ["js", "json", "jsx", "d.ts", "ts", "tsx", "node"],
};
