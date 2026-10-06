import { readFileSync } from 'node:fs';
import { ESLintUtils } from '@typescript-eslint/utils';
import { NodeTypes, parse } from '@vue/compiler-dom';
import type {
	AttributeNode,
	DirectiveNode,
	ElementNode,
	RootNode,
	SourceLocation,
	TemplateChildNode,
} from '@vue/compiler-dom';

const TOOLTIP_NAMES = new Set(['N8nTooltip', 'n8n-tooltip']);
const DROPDOWN_NAMES = new Set(['N8nDropdownMenu', 'n8n-dropdown-menu']);

const isElement = (node: TemplateChildNode | RootNode['children'][number]): node is ElementNode =>
	node.type === NodeTypes.ELEMENT;

const isTeleportedAttribute = (prop: AttributeNode | DirectiveNode) => {
	if (prop.type === NodeTypes.ATTRIBUTE) return prop.name === 'teleported';

	return (
		prop.name === 'bind' &&
		prop.arg?.type === NodeTypes.SIMPLE_EXPRESSION &&
		prop.arg.content === 'teleported'
	);
};

const guaranteesTeleportation = (prop: AttributeNode | DirectiveNode) => {
	if (prop.type === NodeTypes.ATTRIBUTE) {
		return prop.value === undefined || prop.value.content === '' || prop.value.content === 'true';
	}

	return prop.exp?.type === NodeTypes.SIMPLE_EXPRESSION && prop.exp.content.trim() === 'true';
};

const parseSfc = (source: string) =>
	// The other Vue rules report template syntax errors, so this rule ignores them.
	parse(source, { parseMode: 'sfc', onError: () => {} });

/**
 * Returns the location of each `teleported` attribute that lets an
 * `N8nTooltip` inside an `N8nDropdownMenu` render inline.
 */
const findUnteleportedTooltips = (root: RootNode): SourceLocation[] => {
	const found: SourceLocation[] = [];

	const visit = (node: ElementNode, insideDropdown: boolean) => {
		if (insideDropdown && TOOLTIP_NAMES.has(node.tag)) {
			const prop = node.props.find(isTeleportedAttribute);
			if (prop && !guaranteesTeleportation(prop)) found.push(prop.loc);
		}

		const childInsideDropdown = insideDropdown || DROPDOWN_NAMES.has(node.tag);
		for (const child of node.children) {
			if (isElement(child)) visit(child, childInsideDropdown);
		}
	};

	const template = root.children.find(
		(node): node is ElementNode => isElement(node) && node.tag === 'template',
	);
	for (const child of template?.children ?? []) {
		if (isElement(child)) visit(child, false);
	}

	return found;
};

/** Exported for tests. */
export const findUnteleportedTooltipsInSource = (source: string) =>
	findUnteleportedTooltips(parseSfc(source));

/**
 * Oxlint runs a rule once for each script block of an SFC, and gives it only
 * the script text. The rule reads the SFC itself and reports from the first
 * script block, so it reports each problem once.
 */
const isFirstScriptBlock = (root: RootNode, scriptText: string) => {
	const firstScript = root.children.find(
		(node): node is ElementNode => isElement(node) && node.tag === 'script',
	);
	return firstScript?.innerLoc?.source.trim() === scriptText.trim();
};

export const RequireTeleportedTooltipInDropdownRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description: 'Require tooltips inside dropdown menus to be teleported to avoid clipping',
		},
		messages: {
			requireTeleported:
				'N8nTooltip inside N8nDropdownMenu must be teleported to avoid being clipped by the menu. (at <template>:{{line}}:{{column}})',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		if (!context.filename.endsWith('.vue')) return {};

		return {
			Program(program) {
				const root = parseSfc(readFileSync(context.physicalFilename, 'utf8'));
				if (!isFirstScriptBlock(root, context.sourceCode.text)) return;

				// Oxlint rejects a location outside the script block, so the
				// message carries the template position.
				for (const { start } of findUnteleportedTooltips(root)) {
					context.report({
						node: program,
						messageId: 'requireTeleported',
						data: { line: start.line, column: start.column },
					});
				}
			},
		};
	},
});
