import { $ as warnDeprecation, f as createRule, g as import_ast_utils } from "../utils.js";
function createRules(options) {
	const globals = {
		...options?.before !== void 0 ? { before: options.before } : {},
		...options?.after !== void 0 ? { after: options.after } : {}
	};
	const override = options?.overrides ?? {};
	const colon = {
		before: false,
		after: true,
		...globals,
		...override?.colon
	};
	const arrow = typeof override.arrow === "string" ? override.arrow : {
		before: true,
		after: true,
		...globals,
		...override?.arrow
	};
	if (Object.hasOwn(override, "arrow") && override.arrow !== "ignore") warnDeprecation("options(\"overrides.arrow\")", "\"arrow-spacing\"", "type-annotation-spacing");
	return {
		colon,
		arrow,
		variable: {
			...colon,
			...override?.variable
		},
		property: {
			...colon,
			...override?.property
		},
		parameter: {
			...colon,
			...override?.parameter
		},
		returnType: {
			...colon,
			...override?.returnType
		}
	};
}
function getIdentifierRules(rules, node) {
	const scope = node?.parent;
	if ((0, import_ast_utils.isVariableDeclarator)(scope)) return rules.variable;
	else if ((0, import_ast_utils.isFunctionOrFunctionType)(scope)) return rules.parameter;
	return rules.colon;
}
function getRules(rules, node) {
	const scope = node?.parent?.parent;
	if ((0, import_ast_utils.isTSFunctionType)(scope) || (0, import_ast_utils.isTSConstructorType)(scope)) return rules.arrow;
	else if ((0, import_ast_utils.isIdentifier)(scope)) return getIdentifierRules(rules, scope);
	else if ((0, import_ast_utils.isClassOrTypeElement)(scope)) return rules.property;
	else if ((0, import_ast_utils.isFunction)(scope)) return rules.returnType;
	return rules.colon;
}
var type_annotation_spacing_default = createRule({
	name: "type-annotation-spacing",
	meta: {
		type: "layout",
		docs: { description: "Require consistent spacing around type annotations" },
		fixable: "whitespace",
		schema: [{
			$defs: { spacingConfig: {
				type: "object",
				properties: {
					before: { type: "boolean" },
					after: { type: "boolean" }
				},
				additionalProperties: false
			} },
			type: "object",
			properties: {
				before: { type: "boolean" },
				after: { type: "boolean" },
				overrides: {
					type: "object",
					properties: {
						colon: { $ref: "#/items/0/$defs/spacingConfig" },
						arrow: { oneOf: [{
							type: "string",
							enum: ["ignore"]
						}, { $ref: "#/items/0/$defs/spacingConfig" }] },
						variable: { $ref: "#/items/0/$defs/spacingConfig" },
						parameter: { $ref: "#/items/0/$defs/spacingConfig" },
						property: { $ref: "#/items/0/$defs/spacingConfig" },
						returnType: { $ref: "#/items/0/$defs/spacingConfig" }
					},
					additionalProperties: false
				}
			},
			additionalProperties: false
		}],
		defaultOptions: [{}],
		messages: {
			expectedSpaceAfter: "Expected a space after the '{{type}}'.",
			expectedSpaceBefore: "Expected a space before the '{{type}}'.",
			unexpectedSpaceAfter: "Unexpected space after the '{{type}}'.",
			unexpectedSpaceBefore: "Unexpected space before the '{{type}}'.",
			unexpectedSpaceBetween: "Unexpected space between the '{{previousToken}}' and the '{{type}}'."
		}
	},
	create(context, [options]) {
		const punctuators = [":", "=>"];
		const sourceCode = context.sourceCode;
		const ruleSet = createRules(options);
		function checkTypeAnnotationSpacing(typeAnnotation) {
			const punctuatorTokenEnd = sourceCode.getTokenBefore(typeAnnotation, import_ast_utils.isNotOpeningParenToken);
			let punctuatorTokenStart = punctuatorTokenEnd;
			let previousToken = sourceCode.getTokenBefore(punctuatorTokenEnd);
			let type = punctuatorTokenEnd.value;
			if (!punctuators.includes(type)) return;
			const config = getRules(ruleSet, typeAnnotation);
			if (config === "ignore") return;
			const { before, after } = config;
			if (type === ":" && previousToken.value === "?") {
				if (sourceCode.isSpaceBetween(previousToken, punctuatorTokenStart)) context.report({
					node: punctuatorTokenStart,
					messageId: "unexpectedSpaceBetween",
					data: {
						type,
						previousToken: previousToken.value
					},
					fix(fixer) {
						return fixer.removeRange([previousToken.range[1], punctuatorTokenStart.range[0]]);
					}
				});
				type = "?:";
				punctuatorTokenStart = previousToken;
				previousToken = sourceCode.getTokenBefore(previousToken);
				if (previousToken.value === "+" || previousToken.value === "-") {
					type = `${previousToken.value}?:`;
					punctuatorTokenStart = previousToken;
					previousToken = sourceCode.getTokenBefore(previousToken);
				}
			}
			const hasNextSpace = sourceCode.isSpaceBetween(punctuatorTokenEnd, typeAnnotation);
			if (after && !hasNextSpace) context.report({
				node: punctuatorTokenEnd,
				messageId: "expectedSpaceAfter",
				data: { type },
				fix(fixer) {
					return fixer.insertTextAfter(punctuatorTokenEnd, " ");
				}
			});
			else if (!after && hasNextSpace) context.report({
				node: punctuatorTokenEnd,
				messageId: "unexpectedSpaceAfter",
				data: { type },
				fix(fixer) {
					return fixer.removeRange([punctuatorTokenEnd.range[1], typeAnnotation.range[0]]);
				}
			});
			const hasPrevSpace = sourceCode.isSpaceBetween(previousToken, punctuatorTokenStart);
			if (before && !hasPrevSpace) context.report({
				node: punctuatorTokenStart,
				messageId: "expectedSpaceBefore",
				data: { type },
				fix(fixer) {
					return fixer.insertTextAfter(previousToken, " ");
				}
			});
			else if (!before && hasPrevSpace) context.report({
				node: punctuatorTokenStart,
				messageId: "unexpectedSpaceBefore",
				data: { type },
				fix(fixer) {
					return fixer.removeRange([previousToken.range[1], punctuatorTokenStart.range[0]]);
				}
			});
		}
		return {
			TSMappedType(node) {
				if (node.typeAnnotation) checkTypeAnnotationSpacing(node.typeAnnotation);
			},
			TSTypeAnnotation(node) {
				checkTypeAnnotationSpacing(node.typeAnnotation);
			}
		};
	}
});
export { type_annotation_spacing_default as t };
