<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue';
import type { Component } from 'vue';

interface TextNode {
	type: 'text';
	content: string;
}

interface ElementNode {
	type: 'element';
	tag: string;
	attributes: Record<string, string>;
	children: ParsedNode[];
}

interface ComponentNode {
	type: 'component';
	tag: string;
	props: Record<string, unknown>;
}

interface RenderHtmlNode {
	type: 'renderHtml';
	tag: string;
	props?: Record<string, unknown>;
	html: string;
}

type ParsedNode = TextNode | ElementNode | ComponentNode | RenderHtmlNode;

// Configuration for different tag types
const TAG_CONFIG = {
	// Tags that should be rendered as components
	COMPONENT_TAGS: new Set(['pre']),

	// Tags that should be rendered as HTML with special props
	RENDER_HTML_WITH_PROPS: new Set(['code']),

	// Tags that should be rendered as pure HTML
	RENDER_HTML_TAGS: new Set(['mjx-container', 'table']),

	// Tags that need special security attributes
	SECURITY_TAGS: new Set(['a']),

	// Tags that should be processed as regular elements (recursive)
	ELEMENT_TAGS: new Set([
		'strong',
		'em',
		's',
		'b',
		'i',
		'u',
		'span',
		'div',
		'p',
		'h1',
		'h2',
		'h3',
		'h4',
		'h5',
		'h6',
		'ul',
		'ol',
		'li',
		'blockquote',
		'img',
		'hr',
	]),
} as const;

// Whitelist of allowed attributes for security
const ALLOWED_ATTRIBUTES = new Set([
	'class',
	'id',
	'href',
	'target',
	'rel',
	'src',
	'alt',
	'title',
	'width',
	'height',
	'style',
	'role',
	'aria-label',
	'aria-describedby',
	'data-*', // Allow data attributes (will be checked with prefix)
]);

// Security attributes for specific tags
const SECURITY_ATTRIBUTES = {
	a: {
		target: '_blank',
		rel: 'noopener',
	},
} as const;

// Component mapping
const COMPONENT_MAP: Record<string, Component> = {
	highlight: defineAsyncComponent(async () => import('./Highlight.vue')),
};

// Resolve component name
const resolveComponent = (name: string): Component | string => {
	return COMPONENT_MAP[name] ?? name;
};

const props = defineProps<{
	html?: string;
	node?: ParsedNode[];
}>();

/**
 * Check if an attribute is allowed
 * @param attrName - Attribute name to check
 * @returns Whether the attribute is allowed
 */
function isAllowedAttribute(attrName: string): boolean {
	// Block all event handlers (onclick, onload, etc.)
	if (attrName.toLowerCase().startsWith('on')) {
		return false;
	}

	// Allow data-* attributes
	if (attrName.startsWith('data-')) {
		return true;
	}

	// Check against whitelist
	return ALLOWED_ATTRIBUTES.has(attrName.toLowerCase());
}

/**
 * Sanitize attributes by filtering out potentially dangerous ones
 * @param attributes - Raw attributes from DOM element
 * @returns Sanitized attributes
 */
function sanitizeAttributes(attributes: Record<string, string>): Record<string, string> {
	const sanitized: Record<string, string> = {};

	for (const [name, value] of Object.entries(attributes)) {
		if (isAllowedAttribute(name)) {
			// Additional validation for specific attributes
			if (name.toLowerCase() === 'href') {
				// Block javascript: and data: URLs for security
				if (
					value.trim().toLowerCase().startsWith('javascript:') ||
					value.trim().toLowerCase().startsWith('data:')
				) {
					continue;
				}
			}
			sanitized[name] = value;
		}
	}

	return sanitized;
}

/**
 * Parse attributes from DOM element
 * @param element - DOM element to parse attributes from
 * @returns Record of attribute name-value pairs
 */
function parseAttributes(element: Element): Record<string, string> {
	const attributes: Record<string, string> = {};
	Array.from(element.attributes).forEach((attr) => {
		attributes[attr.name] = attr.value;
	});
	return attributes;
}

/**
 * Add security attributes to element attributes
 * @param tagName - Tag name to check for security attributes
 * @param attributes - Existing attributes
 * @returns Attributes with security attributes added
 */
function addSecurityAttributes(
	tagName: string,
	attributes: Record<string, string>,
): Record<string, string> {
	const securityAttrs = SECURITY_ATTRIBUTES[tagName as keyof typeof SECURITY_ATTRIBUTES];
	if (securityAttrs) {
		return { ...attributes, ...securityAttrs };
	}
	return attributes;
}

/**
 * Create a component node for special tags like 'pre'
 * @param element - DOM element
 * @param tagName - Tag name
 * @returns ComponentNode or null
 */
function createComponentNode(element: Element, tagName: string): ComponentNode | null {
	if (tagName === 'pre') {
		const codeElement = element.querySelector(':scope > code');
		const className = codeElement?.className ?? '';
		const lang = className.split('-')[1];
		return {
			type: 'component',
			tag: 'highlight',
			props: {
				data: codeElement?.textContent ?? '',
				language: lang,
			},
		};
	}
	return null;
}

/**
 * Create a render HTML node
 * @param element - DOM element
 * @param tagName - Tag name
 * @param props - Additional props to add
 * @returns RenderHtmlNode
 */
function createRenderHtmlNode(
	element: Element,
	tagName: string,
	props?: Record<string, unknown>,
): RenderHtmlNode {
	return {
		type: 'renderHtml',
		tag: tagName,
		props,
		html: element.innerHTML,
	};
}

/**
 * Create an element node with recursive child parsing
 * @param element - DOM element
 * @param tagName - Tag name
 * @param attributes - Element attributes
 * @returns ElementNode
 */
function createElementNode(
	element: Element,
	tagName: string,
	attributes: Record<string, string>,
): ElementNode {
	const elementNode: ElementNode = {
		type: 'element',
		tag: tagName,
		attributes,
		children: [],
	};

	// Parse child nodes recursively
	element.childNodes.forEach((childNode) => {
		const child = parseNode(childNode);
		if (child) {
			elementNode.children.push(child);
		}
	});

	return elementNode;
}

/**
 * Check if a tag is in any of the allowed tag sets
 * @param tagName - Tag name to check
 * @returns Whether the tag is allowed
 */
function isAllowedTag(tagName: string): boolean {
	return (
		TAG_CONFIG.COMPONENT_TAGS.has(tagName) ||
		TAG_CONFIG.RENDER_HTML_WITH_PROPS.has(tagName) ||
		TAG_CONFIG.RENDER_HTML_TAGS.has(tagName) ||
		TAG_CONFIG.SECURITY_TAGS.has(tagName) ||
		TAG_CONFIG.ELEMENT_TAGS.has(tagName)
	);
}

/**
 * Parse a single DOM node
 * @param node - DOM node to parse
 * @returns ParsedNode or null
 */
function parseNode(node: Node): ParsedNode | null {
	// Handle text nodes
	if (node.nodeType === Node.TEXT_NODE) {
		const content = node.nodeValue?.trim();
		return content ? { type: 'text', content } : null;
	}

	// Handle element nodes
	if (node.nodeType === Node.ELEMENT_NODE) {
		const element = node as Element;
		const tagName = element.tagName?.toLowerCase() ?? 'p';

		// Security check: Only allow whitelisted tags
		if (!isAllowedTag(tagName)) {
			console.warn(`Blocked potentially unsafe tag: ${tagName}`);
			return null;
		}

		// Check if it's a component tag
		if (TAG_CONFIG.COMPONENT_TAGS.has(tagName)) {
			return createComponentNode(element, tagName);
		}

		// Check if it's a render HTML tag with props
		if (TAG_CONFIG.RENDER_HTML_WITH_PROPS.has(tagName)) {
			const props = tagName === 'code' ? { class: 'code' } : undefined;
			return createRenderHtmlNode(element, tagName, props);
		}

		// Check if it's a pure render HTML tag
		if (TAG_CONFIG.RENDER_HTML_TAGS.has(tagName)) {
			return createRenderHtmlNode(element, tagName);
		}

		// Handle security tags (like 'a')
		if (TAG_CONFIG.SECURITY_TAGS.has(tagName)) {
			const attributes = parseAttributes(element);
			const sanitizedAttributes = sanitizeAttributes(attributes);
			const secureAttributes = addSecurityAttributes(tagName, sanitizedAttributes);
			return createElementNode(element, tagName, secureAttributes);
		}

		// Handle regular element tags
		if (TAG_CONFIG.ELEMENT_TAGS.has(tagName)) {
			const attributes = parseAttributes(element);
			const sanitizedAttributes = sanitizeAttributes(attributes);
			return createElementNode(element, tagName, sanitizedAttributes);
		}
	}

	// Ignore other node types and unsafe tags
	return null;
}

/**
 * Parse HTML string into structured nodes
 * @param html - HTML string to parse
 * @returns Array of parsed nodes
 */
function parseHTML(html: string): ParsedNode[] {
	try {
		const parser = new DOMParser();
		const doc = parser.parseFromString(html, 'text/html');
		const body = doc.body;

		// Parse all child nodes and filter out null values
		return Array.from(body.childNodes)
			.map(parseNode)
			.filter((node): node is ParsedNode => node !== null);
	} catch (error) {
		console.warn('Failed to parse HTML:', error);
		return [];
	}
}

// Parse content with memoization
const parsedBlocks = computed((): ParsedNode[] => {
	if (props.node && props.node.length > 0) return props.node;
	return parseHTML(props.html ?? '');
});
</script>

<template>
	<!-- eslint-disable-next-line vue/no-multiple-template-root -->
	<template v-for="(node, index) in parsedBlocks" :key="index">
		<template v-if="node.type === 'text'">
			{{ node.content }}
		</template>
		<component
			:is="resolveComponent(node.tag)"
			v-else-if="node.type === 'element'"
			v-bind="node.attributes"
		>
			<!-- Recursively render child nodes -->
			<template v-if="node.children && node.children.length">
				<HtmlParse :node="node.children" />
			</template>
		</component>
		<component
			:is="resolveComponent(node.tag)"
			v-else-if="node.type === 'component'"
			v-bind="node.props"
		/>
		<template v-else-if="node.type === 'renderHtml'">
			<mjx-container v-if="node.tag === 'mjx-container'" v-bind="node.props">
				<!-- eslint-disable-next-line vue/no-v-html -->
				<div v-html="node.html" />
			</mjx-container>
			<!-- eslint-disable-next-line vue/no-v-html -->
			<table v-else-if="node.tag === 'table'" v-bind="node.props" v-html="node.html" />
			<code v-else-if="node.tag === 'code'" v-bind="node.props" v-text="node.html" />
		</template>
	</template>
</template>
