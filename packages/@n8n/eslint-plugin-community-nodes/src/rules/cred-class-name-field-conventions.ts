import {
	createRule,
	findClassProperty,
	getStringLiteralValue,
	isCredentialTypeClass,
	isFileType,
} from '../utils/index.js';

function lowercaseFirstChar(name: string): string {
	return name.charAt(0).toLowerCase() + name.slice(1);
}

function addApiSuffix(name: string): string {
	if (name.endsWith('Api')) return name;
	if (name.endsWith('Ap')) return `${name}i`;
	if (name.endsWith('A')) return `${name}pi`;
	return `${name}Api`;
}

export const CredClassNameFieldConventionsRule = createRule({
	name: 'cred-class-name-field-conventions',
	meta: {
		type: 'problem',
		docs: {
			description: 'Credential `name` field must end with `Api` and start with a lowercase letter',
		},
		messages: {
			missingSuffix: "Credential `name` field '{{value}}' must end with 'Api'",
			uppercaseFirstChar: "Credential `name` field '{{value}}' must start with a lowercase letter",
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

				const nameProperty = findClassProperty(node, 'name');
				if (!nameProperty?.value) {
					return;
				}

				const nameValue = getStringLiteralValue(nameProperty.value);
				if (nameValue === null) {
					return;
				}

				const startsLowercase = !/^[A-Z]/.test(nameValue);
				const endsWithApi = nameValue.endsWith('Api');
				if (startsLowercase && endsWithApi) {
					return;
				}

				// Compute the fully-corrected value once so each fix yields the
				// same result in a single pass, regardless of which one applies.
				const fixedValue = addApiSuffix(lowercaseFirstChar(nameValue));
				const valueNode = nameProperty.value;
				const replacement = `'${fixedValue}'`;

				if (!startsLowercase) {
					context.report({
						node: valueNode,
						messageId: 'uppercaseFirstChar',
						data: { value: nameValue },
						fix: (fixer) => fixer.replaceText(valueNode, replacement),
					});
				}

				if (!endsWithApi) {
					context.report({
						node: valueNode,
						messageId: 'missingSuffix',
						data: { value: nameValue },
						fix: (fixer) => fixer.replaceText(valueNode, replacement),
					});
				}
			},
		};
	},
});
