//#region package.json
var name = "@langchain/mcp-adapters";
var version = "1.1.3";
var description = "LangChain.js adapters for Model Context Protocol (MCP)";
var author = "LangChain";
var license = "MIT";
var type = "module";
var packageManager = "pnpm@10.14.0";
var repository = {
	"type": "git",
	"url": "git@github.com:langchain-ai/langchainjs.git"
};
var homepage = "https://github.com/langchain-ai/langchainjs/tree/main/libs/langchain-mcp-adapters/";
var bugs = { "url": "https://github.com/langchain-ai/langchainjs/issues" };
var scripts = {
	"build": "turbo build:compile build:examples --filter @langchain/core --output-logs new-only",
	"build:compile": "tsdown",
	"build:examples": "tsc -p ./examples/tsconfig.json",
	"clean": "rm -rf dist/ dist-cjs/ .turbo/",
	"format": "prettier --write \"src/**/*.ts\" \"examples/**/*.ts\"",
	"format:check": "prettier --check \"src\" \"examples/**/*.ts\"",
	"lint": "run-s lint:eslint lint:dpdm",
	"lint:dpdm": "dpdm --skip-dynamic-imports circular --exit-code circular:1 --no-warning --no-tree src/**/*.ts examples/**/*.ts",
	"lint:eslint": "eslint --cache src/ examples/",
	"lint:fix": "pnpm lint:eslint --fix && pnpm lint:dpdm",
	"test": "vitest run",
	"test:coverage": "vitest run --coverage",
	"test:watch": "vitest"
};
var keywords = [
	"langchain",
	"mcp",
	"model-context-protocol",
	"ai",
	"tools"
];
var dependencies = {
	"@modelcontextprotocol/sdk": "^1.26.0",
	"debug": "^4.4.3",
	"zod": "^3.25.76 || ^4"
};
var peerDependencies = {
	"@langchain/core": "^1.0.0",
	"@langchain/langgraph": "^1.0.0"
};
var peerDependenciesMeta = {
	"@langchain/core": { "optional": false },
	"@langchain/langgraph": { "optional": false }
};
var optionalDependencies = { "extended-eventsource": "^1.7.0" };
var devDependencies = {
	"@eslint/js": "^9.36.0",
	"@langchain/core": "workspace:^",
	"@langchain/eslint": "workspace:*",
	"@langchain/langgraph": "^1.0.0",
	"@langchain/openai": "workspace:*",
	"@langchain/tsconfig": "workspace:*",
	"@tsconfig/recommended": "^1.0.10",
	"@types/debug": "^4.1.12",
	"@types/express": "^5.0.6",
	"@types/node": "^22.18.8",
	"@vitest/coverage-v8": "^3.2.4",
	"dotenv": "^16.6.1",
	"dpdm": "^3.14.0",
	"eslint": "^9.36.0",
	"eventsource": "^4.1.0",
	"express": "^5.2.1",
	"langchain": "workspace:*",
	"npm-run-all2": "^8.0.4",
	"prettier": "^3.6.2",
	"ts-node": "^10.9.2",
	"typescript": "~5.8.3",
	"typescript-eslint": "^8.45.0",
	"vitest": "^3.2.4"
};
var engines = { "node": ">=20.10.0" };
var directories = { "example": "examples" };
var main = "./dist/index.cjs";
var types = "./dist/index.d.cts";
var exports = {
	".": {
		"input": "./src/index.ts",
		"require": {
			"types": "./dist/index.d.cts",
			"default": "./dist/index.cjs"
		},
		"import": {
			"types": "./dist/index.d.ts",
			"default": "./dist/index.js"
		}
	},
	"./package.json": "./package.json"
};
var files = [
	"dist/",
	"CHANGELOG.md",
	"README.md",
	"LICENSE"
];
var module = "./dist/index.js";
var package_default = {
	name,
	version,
	description,
	author,
	license,
	type,
	packageManager,
	repository,
	homepage,
	bugs,
	scripts,
	keywords,
	dependencies,
	peerDependencies,
	peerDependenciesMeta,
	optionalDependencies,
	devDependencies,
	engines,
	directories,
	main,
	types,
	exports,
	files,
	module
};

//#endregion
export { package_default as default };
//# sourceMappingURL=package.js.map