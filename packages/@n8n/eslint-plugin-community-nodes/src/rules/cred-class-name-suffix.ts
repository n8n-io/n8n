import { isCredentialTypeClass, isFileType, createRule } from '../utils/index.js';

function addApiSuffix(name: string): string {
	if (name.endsWith('Ap')) return `${name}i`;
	if (name.endsWith('A')) return `${name}pi`;
	return `${name}Api`;
}

export const CredClassNameSuffixRule = createRule({
	name: 'cred-class-name-suffix',
	meta: {
		type: 'problem',
		docs: {
			description: 'Credential class names must be suffixed with `Api`',
		},
		messages: {
			missingSuffix: "Credential class name '{{name}}' must end with 'Api'",
		},
		fixable: 'code',
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		if (!isFileType(context.filename, '.credentials.ts')) {
			return {};
		}

		return {
			ClassDeclaration(node) {
				if (!isCredentialTypeClass(node)) {
					return;
				}

				const classNameNode = node.id;
				if (!classNameNode) {
					return;
				}

				const className = classNameNode.name;
				if (className.endsWith('Api')) {
					return;
				}

				const fixedName = addApiSuffix(className);

				context.report({
					node: classNameNode,
					messageId: 'missingSuffix',
					data: { name: className },
					fix(fixer) {
						return fixer.replaceText(classNameNode, fixedName);
					},
				});
			},
		};
	},
});
