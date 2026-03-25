[![npm version](https://img.shields.io/npm/v/@eslint/js.svg)](https://www.npmjs.com/package/@eslint/js)

# ESLint JavaScript Plugin

[Website](https://eslint.org) | [Configure ESLint](https://eslint.org/docs/latest/use/configure) | [Rules](https://eslint.org/docs/rules/) | [Contributing](https://eslint.org/docs/latest/contribute) | [Twitter](https://twitter.com/geteslint) | [Chatroom](https://eslint.org/chat)

The beginnings of separating out JavaScript-specific functionality from ESLint.

Right now, this plugin contains two configurations:

- `recommended` - enables the rules recommended by the ESLint team (the replacement for `"eslint:recommended"`)
- `all` - enables all ESLint rules (the replacement for `"eslint:all"`)

## Installation

```shell
npm install @eslint/js -D
```

## Usage

Use in your `eslint.config.js` file anytime you want to extend one of the configs:

```js
import { defineConfig } from "eslint/config";
import js from "@eslint/js";

export default defineConfig([
	// apply recommended rules to JS files
	{
		name: "your-project/recommended-rules",
		files: ["**/*.js"],
		plugins: {
			js,
		},
		extends: ["js/recommended"],
	},

	// apply recommended rules to JS files with an override
	{
		name: "your-project/recommended-rules-with-override",
		files: ["**/*.js"],
		plugins: {
			js,
		},
		extends: ["js/recommended"],
		rules: {
			"no-unused-vars": "warn",
		},
	},

	// apply all rules to JS files
	{
		name: "your-project/all-rules",
		files: ["**/*.js"],
		plugins: {
			js,
		},
		extends: ["js/all"],
		rules: {
			"no-unused-vars": "warn",
		},
	},
]);
```

## License

MIT
