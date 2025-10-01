import { ESLintUtils } from '@typescript-eslint/utils';
import {
	isCredentialTypeClass,
	findClassProperty,
	findObjectProperty,
	getStringLiteralValue,
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
	// Check if it's a camelCase slug that can contain slashes
	// Pattern: starts with lowercase letter, followed by letters/numbers, can contain slashes
	// Each segment after slash should also follow camelCase pattern
	const slugPattern = /^[a-z][a-zA-Z0-9]*(?:\/[a-z][a-zA-Z0-9]*)*$/;
	return slugPattern.test(value);
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
		formats.push('a camelCase slug (can contain slashes)');
	}

	if (formats.length === 0) {
		return 'a valid format (none configured)';
	}

	if (formats.length === 1) {
		return formats[0]!;
	}

	return formats.slice(0, -1).join(', ') + ' or ' + formats[formats.length - 1];
}

export const CredentialDocumentationUrlRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description: 'Ensure credential documentationUrl is either a valid URL or a camelCase slug',
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
						description: 'Whether to allow camelCase slugs with slashes',
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
