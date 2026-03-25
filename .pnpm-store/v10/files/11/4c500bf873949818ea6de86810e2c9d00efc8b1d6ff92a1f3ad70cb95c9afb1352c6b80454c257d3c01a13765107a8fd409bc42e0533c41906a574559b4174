"use strict";

const htmlparser = require("htmlparser2");
const buildSyntaxResolver = require("../syntax/build-syntax-resolver");
const buildTemplateSyntax = require("../template/syntax");
const JsxLikeTokenizer = require("./jsx-like-tokenizer");
const AstroTokenizer = require("./astro-tokenizer");
const { cssSafeSyntax } = require("../syntax/syntaxes");

function iterateCode(source, { onStyleTag, onStyleAttribute, svelte, astro }) {
	const openTag = {};
	let disable, ignore, style;

	const parser = new htmlparser.Parser(
		{
			oncomment: (data) => {
				ignore = false;
				const match = /(?:^|\s+)postcss-(\w+)(?:\s+|$)/i.exec(data);
				if (!match) {
					return;
				}
				const directive = match[1].toLowerCase();
				if (directive === "enable") {
					disable = false;
				} else if (directive === "disable") {
					disable = true;
				} else if (directive === "ignore") {
					ignore = true;
				}
			},
			onopentag(name, attribute) {
				openTag[name] = true;

				const currIgnore = ignore;
				ignore = false;
				if (currIgnore) {
					// ignore
					return;
				}
				// Test if current tag is a valid <style> tag.
				if (!/^style$/i.test(name)) {
					return;
				}

				style = {
					inXsls: openTag["xsl:stylesheet"],
					inXslt: openTag["xsl:template"],
					inHtml: openTag.html,
					tagName: name,
					attribute,
					startIndex: parser.endIndex + 1,
				};
			},

			onclosetag(name) {
				openTag[name] = false;
				ignore = false;
				if (disable || !style || name !== style.tagName) {
					return;
				}

				let content = source.slice(style.startIndex, parser.startIndex);

				const firstNewLine = /^[\t ]*\r?\n/.exec(content);
				if (firstNewLine) {
					const offset = firstNewLine[0].length;
					style.startIndex += offset;
					content = content.slice(offset);
				}
				style.content = content.replace(/[\t ]*$/, "");

				onStyleTag(style);
				style = null;
			},

			onattribute(name, content) {
				if (disable || ignore || name !== "style") {
					return;
				}
				const endIndex = parser.endIndex;
				const startIndex = endIndex - content.length;
				if (
					source[startIndex - 1] !== source[endIndex] ||
					!/\S/.test(source[endIndex])
				) {
					return;
				}
				onStyleAttribute({
					content,
					startIndex,
					inline: true,
					inTemplate: openTag.template,
				});
			},
		},
		{
			Tokenizer: svelte ? JsxLikeTokenizer : astro ? AstroTokenizer : undefined,
		},
	);

	parser.parseComplete(source);
}

function getSubString(str, regexp) {
	const subStr = str && regexp.exec(str);
	if (subStr) {
		return subStr[1].toLowerCase();
	}
	return undefined;
}

function getLang(attribute) {
	return (
		getSubString(attribute.type, /^\w+\/(?:x-)?(\w+)$/i) ||
		getSubString(attribute.lang, /^(\w+)(?:\?.+)?$/) ||
		"css"
	);
}

function extractStyles(source, opts) {
	const styles = [];

	const resolveSyntax = buildSyntaxResolver(opts.config);

	const standard =
		opts.from &&
		/\.(?:\w*html?|xht|xslt?|jsp|aspx?|ejs|php\d*|twig|liquid|m(?:ark)?d(?:ow)?n|mk?d)$/i.test(
			opts.from,
		);
	const svelte = opts.from && /\.svelte$/i.test(opts.from);
	const astro = opts.from && /\.astro$/i.test(opts.from);

	function onStyleTag(style) {
		if (
			!(style.inHtml || style.inXsls || style.inXslt || standard) &&
			(style.attribute.src || style.attribute.href) &&
			!style.content.trim()
		) {
			return;
		}
		style.lang = getLang(style.attribute);
		style.syntax = resolveSyntax(style.lang);

		if (style.syntax) styles.push(style);
	}

	function onStyleAttribute(style) {
		if (/\{[\s\S]*?\}/.test(style.content)) {
			style.syntax = buildTemplateSyntax(
				resolveSyntax("css", {
					defaultSyntax: svelte ? cssSafeSyntax : undefined,
				}),
			);
			style.lang = "custom-template";
		} else {
			style.syntax = resolveSyntax();
			style.lang = "css";
		}
		styles.push(style);
	}

	iterateCode(source, {
		onStyleTag,
		onStyleAttribute,
		svelte,
		astro,
	});

	return styles;
}

module.exports = extractStyles;
