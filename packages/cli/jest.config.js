module.exports = {
	verbose: true,
	transform: {
		"^.+\\.tsx?$": "ts-jest"
	},
	testURL: "http://localhost/",
	testRegex: "(/__tests__/.*|(\\.|/)(test|spec))\\.(jsx?|tsx?)$",
	testPathIgnorePatterns: [
		"/dist/",
		"/node_modules/"
	],
	moduleFileExtensions: [
		"ts",
		"tsx",
		"js",
		"json"
	],
	globals: {
		"ts-jest": {
			isolatedModules: true
		}
	},
}
