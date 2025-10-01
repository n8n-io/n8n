import {
	isCredentialTypeClass,
	findClassProperty,
	getStringLiteralValue,
	createRule,
} from '../utils/index.js';

type RuleOptions = {
	/** Whether to allow valid URLs (default: true) */
	allowUrls?: boolean;
	/** Whether to allow camelCase slugs with slashes (default: false) */
	allowSlugs?: boolean;
};

const DEFAULT_OPTIONS: RuleOptions = {
	allowUrls: true,
	allowSlugs: false,
};

function isValidUrl(value: string): boolean {
	try {
		new URL(value);
		return true;
	} catch {
		return false;
	}
}

function isValidSlug(value: string): boolean {
	const segments = value.split('/');

	const camelCasePattern = /^[a-z][a-zA-Z0-9]*$/;
	const kebabCasePattern = /^[a-z][a-z0-9-]*$/;

	return (
		segments.every((segment) => camelCasePattern.test(segment)) ||
		segments.every((segment) => kebabCasePattern.test(segment))
	);
}

function validateDocumentationUrl(value: string, options: RuleOptions): boolean {
	if (options.allowUrls && isValidUrl(value)) {
		return true;
	}

	if (options.allowSlugs && isValidSlug(value)) {
		return true;
	}

	return false;
}

function getExpectedFormatsMessage(options: RuleOptions): string {
	const formats: string[] = [];

	if (options.allowUrls) {
		formats.push('a valid URL');
	}

	if (options.allowSlugs) {
		formats.push('a camelCase or kebab-case slug (can contain slashes)');
	}

	if (formats.length === 0) {
		return 'a valid format (none configured)';
	}

	if (formats.length === 1) {
		return formats[0]!;
	}

	return formats.slice(0, -1).join(', ') + ' or ' + formats[formats.length - 1];
}

export const CredentialDocumentationUrlRule = createRule({
	name: 'credential-documentation-url',
	meta: {
		type: 'problem',
		docs: {
			description:
				'Enforce valid credential documentationUrl format (URL or camelCase/kebab-case slug)',
		},
		messages: {
			invalidDocumentationUrl: "documentationUrl '{{ value }}' must be {{ expectedFormats }}",
		},
		fixable: undefined,
		schema: [
			{
				type: 'object',
				properties: {
					allowUrls: {
						type: 'boolean',
						description: 'Whether to allow valid URLs',
					},
					allowSlugs: {
						type: 'boolean',
						description: 'Whether to allow camelCase or kebab-case slugs with slashes',
					},
				},
				additionalProperties: false,
			},
		],
	},
	defaultOptions: [DEFAULT_OPTIONS],
	create(context, [options = {}]) {
		const mergedOptions: RuleOptions = { ...DEFAULT_OPTIONS, ...options };

		return {
			ClassDeclaration(node) {
				if (!isCredentialTypeClass(node)) {
					return;
				}

				const documentationUrlProperty = findClassProperty(node, 'documentationUrl');
				if (!documentationUrlProperty?.value) {
					return;
				}

				const documentationUrl = getStringLiteralValue(documentationUrlProperty.value);
				if (!documentationUrl) {
					return;
				}

				if (!validateDocumentationUrl(documentationUrl, mergedOptions)) {
					const expectedFormats = getExpectedFormatsMessage(mergedOptions);

					context.report({
						node: documentationUrlProperty.value,
						messageId: 'invalidDocumentationUrl',
						data: {
							value: documentationUrl,
							expectedFormats,
						},
					});
				}
			},
		};
	},
});
