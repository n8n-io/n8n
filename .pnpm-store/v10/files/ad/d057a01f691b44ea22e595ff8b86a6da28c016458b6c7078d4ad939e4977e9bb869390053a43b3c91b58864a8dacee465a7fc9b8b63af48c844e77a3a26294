import globals from "globals";
import eslintJs from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
	eslintJs.configs.recommended,
	...tseslint.configs.recommended,
	{
		languageOptions: {
			globals: {
				...globals.node,
				...globals.jest,
				document: "readonly",
			},
		},
		rules: {
			quotes: ["error", "double"],
			semi: ["error", "always"],
			"no-warning-comments": "warn",
			"comma-dangle": ["error", "always-multiline"],
			indent: ["error", "tab", { SwitchCase: 1 }],
			"no-tabs": "off",
			"no-var": "error",
			"prefer-const": "error",
			"object-shorthand": "error",
			"no-restricted-globals": [
				"error",
				{
					name: "fit",
					message: "Do not commit focused tests.",
				},
				{
					name: "fdescribe",
					message: "Do not commit focused tests.",
				},
			],
			"@typescript-eslint/ban-ts-comment": "warn",
			"@typescript-eslint/no-var-requires": "warn",
		},
	},
	{
		ignores: [
			"dist/",
			"coverage/",
			"**/npm-debug.log",
		],
	},
];
