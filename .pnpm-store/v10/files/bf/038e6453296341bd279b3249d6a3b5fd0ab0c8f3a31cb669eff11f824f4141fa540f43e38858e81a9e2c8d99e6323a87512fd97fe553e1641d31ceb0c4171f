"use strict";

const path = require("path");
const postcssSafeParser = require("postcss-safe-parser");
const { cssSyntax, cssSafeSyntax } = require("./syntaxes");
const { loadModule, isModuleNotFoundError } = require("../shared/load-module");

const defaultRules = [
	{
		test: /^sass$/i,
		lang: "sass",
	},
	{
		test: /^scss$/i,
		lang: "scss",
	},
	{
		test: /^less$/i,
		lang: "less",
	},
	{
		test: /^s(?:ugar)?ss$/i,
		lang: "sugarss",
	},
	{
		test: /^styl(?:us)?$/i,
		lang: "stylus",
	},
	{
		test: /^postcss$/i,
		lang: "css",
	},
];
const defaultSyntaxes = {
	sass: "postcss-sass",
	scss: "postcss-scss",
	less: "postcss-less",
	sugarss: "sugarss",
	stylus: "postcss-styl",
};

module.exports = function buildSyntaxResolver(config) {
	const { rules = [], ...syntaxes } = config || {};
	const allRules = [...rules, ...defaultRules];

	const definedLangs = new Set([
		"css",
		...rules.map((rule) => rule.lang),
		...Object.keys(syntaxes),
	]);

	return function resolve(baseLang, baseOptions) {
		let lang = baseLang || "css";
		const options = baseOptions || {};

		const cwd = process.cwd();
		const placeholderFilePath = path.join(cwd, `__placeholder__.${lang}`);

		for (const rule of allRules) {
			const regex = new RegExp(rule.test);
			if (regex.test(lang) || regex.test(placeholderFilePath)) {
				lang = rule.lang;
				break;
			}
		}
		lang = lang.toLowerCase();
		const syntax = syntaxes[lang] || defaultSyntaxes[lang];
		if (syntax) {
			if (typeof syntax === "string") {
				const syntaxModule = loadFromString(syntax, options);
				if (syntaxModule) {
					return syntaxModule;
				}
				if (definedLangs.has(lang)) {
					throw new Error(
						`Cannot resolve module "${syntax}". It's likely that the module isn't installed correctly. Try reinstalling by running the \`npm install ${syntax}@latest --save-dev\``,
					);
				}
			}
			if (syntax === postcssSafeParser) {
				return cssSafeSyntax;
			}
			if (typeof syntax.parse === "function") {
				return syntax;
			}
		}

		if (!definedLangs.has(lang)) {
			return null;
		}

		return options.defaultSyntax || cssSyntax;
	};
};

const standardModuleResolvers = {
	// eslint-disable-next-line n/no-missing-require -- ignore
	"postcss-sass": () => require("postcss-sass"),
	// eslint-disable-next-line n/no-unpublished-require -- ignore
	"postcss-scss": () => require("postcss-scss"),
	// eslint-disable-next-line n/no-unpublished-require -- ignore
	"postcss-less": () => require("postcss-less"),
	// eslint-disable-next-line n/no-unpublished-require -- ignore
	sugarss: () => require("sugarss"),
	// eslint-disable-next-line n/no-unpublished-require -- ignore
	"postcss-styl": () => require("postcss-styl"),
};

function loadFromString(syntax, options) {
	if (syntax === "postcss") {
		return options.defaultSyntax || cssSyntax;
	}
	if (syntax === "postcss-safe-parser") {
		return cssSafeSyntax;
	}

	const loadedModule = loadModule(syntax);
	if (loadedModule) {
		return loadedModule;
	}

	/* istanbul ignore if */
	if (standardModuleResolvers[syntax]) {
		try {
			return standardModuleResolvers[syntax]();
		} catch (error) {
			if (!isModuleNotFoundError(error)) {
				throw error;
			}
			// ignore
		}
	}

	return null;
}
