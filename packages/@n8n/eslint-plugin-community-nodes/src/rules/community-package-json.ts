import { AST_NODE_TYPES, type TSESTree } from '@typescript-eslint/utils';

import { createRule, findJsonProperty } from '../utils/index.js';

const DEFAULT_REPO_PATTERN = /github\.com\/<\.\.\.>/;

function getJsonStringValue(obj: TSESTree.ObjectExpression, name: string): string | null {
	const prop = findJsonProperty(obj, name);
	if (!prop || prop.value.type !== AST_NODE_TYPES.Literal) return null;
	return typeof prop.value.value === 'string' ? prop.value.value : null;
}

export const CommunityPackageJsonRule = createRule({
	name: 'community-package-json',
	meta: {
		type: 'problem',
		docs: {
			description: 'Validate required fields in community node package.json files',
		},
		messages: {
			missingAuthor: 'package.json must have an `author` key',
			missingAuthorName: 'package.json `author` must have a `name` field',
			defaultAuthorName: 'package.json `author.name` must be changed from the default empty value',
			missingDescription: 'package.json must have a `description` key',
			defaultDescription: 'package.json `description` must not be empty',
			missingVersion: 'package.json must have a `version` key',
			missingLicense: 'package.json must have a `license` key',
			nonMitLicense: 'package.json `license` must be "MIT"',
			missingN8nKey: 'package.json must have an `n8n` key',
			missingApiVersion: 'package.json `n8n.n8nNodesApiVersion` must be present',
			nonNumberApiVersion: 'package.json `n8n.n8nNodesApiVersion` must be a number',
			missingNodes: 'package.json `n8n.nodes` must be present',
			emptyNodes: 'package.json `n8n.nodes` must contain at least one node file path',
			defaultRepositoryUrl: 'package.json `repository.url` must be updated from the default value',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		if (!context.filename.endsWith('package.json')) {
			return {};
		}

		return {
			ObjectExpression(node: TSESTree.ObjectExpression) {
				// Only lint the root-level object (not nested objects like `n8n`, `author`, `repository`)
				if (node.parent?.type === AST_NODE_TYPES.Property) {
					return;
				}

				// version
				if (!findJsonProperty(node, 'version')) {
					context.report({ node, messageId: 'missingVersion' });
				}

				// description
				const descProp = findJsonProperty(node, 'description');
				if (!descProp) {
					context.report({ node, messageId: 'missingDescription' });
				} else if (getJsonStringValue(node, 'description') === '') {
					context.report({ node: descProp, messageId: 'defaultDescription' });
				}

				// license
				const licenseProp = findJsonProperty(node, 'license');
				if (!licenseProp) {
					context.report({ node, messageId: 'missingLicense' });
				} else {
					const licenseValue = getJsonStringValue(node, 'license');
					if (licenseValue !== null && licenseValue !== 'MIT') {
						context.report({ node: licenseProp, messageId: 'nonMitLicense' });
					}
				}

				// author
				const authorProp = findJsonProperty(node, 'author');
				if (!authorProp) {
					context.report({ node, messageId: 'missingAuthor' });
				} else if (authorProp.value.type === AST_NODE_TYPES.ObjectExpression) {
					const authorObj = authorProp.value;
					const authorNameProp = findJsonProperty(authorObj, 'name');
					if (!authorNameProp) {
						context.report({ node: authorProp, messageId: 'missingAuthorName' });
					} else if (getJsonStringValue(authorObj, 'name') === '') {
						context.report({ node: authorNameProp, messageId: 'defaultAuthorName' });
					}
				}

				// repository URL still default
				const repoProp = findJsonProperty(node, 'repository');
				if (repoProp?.value.type === AST_NODE_TYPES.ObjectExpression) {
					const urlValue = getJsonStringValue(repoProp.value, 'url');
					if (urlValue !== null && DEFAULT_REPO_PATTERN.test(urlValue)) {
						context.report({ node: repoProp, messageId: 'defaultRepositoryUrl' });
					}
				}

				// n8n key
				const n8nProp = findJsonProperty(node, 'n8n');
				if (!n8nProp) {
					context.report({ node, messageId: 'missingN8nKey' });
					return;
				}

				if (n8nProp.value.type !== AST_NODE_TYPES.ObjectExpression) return;
				const n8nObj = n8nProp.value;

				// n8n.n8nNodesApiVersion
				const apiVersionProp = findJsonProperty(n8nObj, 'n8nNodesApiVersion');
				if (!apiVersionProp) {
					context.report({ node: n8nProp, messageId: 'missingApiVersion' });
				} else if (
					apiVersionProp.value.type !== AST_NODE_TYPES.Literal ||
					typeof apiVersionProp.value.value !== 'number'
				) {
					context.report({ node: apiVersionProp, messageId: 'nonNumberApiVersion' });
				}

				// n8n.nodes
				const nodesProp = findJsonProperty(n8nObj, 'nodes');
				if (!nodesProp) {
					context.report({ node: n8nProp, messageId: 'missingNodes' });
				} else if (
					nodesProp.value.type === AST_NODE_TYPES.ArrayExpression &&
					nodesProp.value.elements.length === 0
				) {
					context.report({ node: nodesProp, messageId: 'emptyNodes' });
				}
			},
		};
	},
});
