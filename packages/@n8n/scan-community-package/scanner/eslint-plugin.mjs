const restrictedGlobals = [
	"clearInterval",
	"clearTimeout",
	"global",
	"process",
	"setInterval",
	"setTimeout",
];

const allowedModules = [
	"n8n-workflow",
	"lodash",
	"moment",
	"p-limit",
	"luxon",
	"zod",
	"crypto",
	"node:crypto"
];

const isModuleAllowed = (modulePath) => {
	// Allow relative paths
	if (modulePath.startsWith("./") || modulePath.startsWith("../")) return true;

	// Extract module name from imports that might contain additional path
	const moduleName = modulePath.startsWith("@")
		? modulePath.split("/").slice(0, 2).join("/")
		: modulePath.split("/")[0];
	return allowedModules.includes(moduleName);
};

/** @type {import('@types/eslint').ESLint.Plugin} */
const plugin = {
	rules: {
		"no-restricted-globals": {
			create(context) {
				return {
					Identifier(node) {
						if (
							restrictedGlobals.includes(node.name) &&
							(!node.parent ||
								node.parent.type !== "MemberExpression" ||
								node.parent.object === node)
						) {
							context.report({
								node,
								message: `Use of restricted global '${node.name}' is not allowed`,
							});
						}
					},
				};
			},
		},

		"no-restricted-imports": {
			create(context) {
				return {
					ImportDeclaration(node) {
						const modulePath = node.source.value;
						if (!isModuleAllowed(modulePath)) {
							context.report({
								node,
								message: `Import of '${modulePath}' is not allowed.`,
							});
						}
					},

					CallExpression(node) {
						if (
							node.callee.name === "require" &&
							node.arguments.length > 0 &&
							node.arguments[0].type === "Literal"
						) {
							const modulePath = node.arguments[0].value;
							if (!isModuleAllowed(modulePath)) {
								context.report({
									node,
									message: `Require of '${modulePath}' is not allowed.`,
								});
							}
						}
					},
				};
			},
		},
	},
};

export default plugin;
