<script setup lang="ts">
import { computed } from 'vue';
import type { Component } from 'vue';
import Highlight from '../Highlight.vue';
import isEmpty from 'lodash/isEmpty';

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
	props: Record<string, any>;
}

interface RenderHtmlNode {
	type: 'renderHtml';
	tag: string;
	props?: Record<string, any>;
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
	RENDER_HTML_TAGS: new Set(['mjx-container', 'img', 'video', 'audio', 'table', 'hr']),

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
	]),
} as const;

// Security attributes for specific tags
const SECURITY_ATTRIBUTES = {
	a: {
		target: '_blank',
		rel: 'noopener',
	},
} as const;

// Component mapping
const COMPONENT_MAP: Record<string, Component> = {
	highlight: Highlight,
};

// Resolve component name
const resolveComponent = (name: string): Component | string => {
	return COMPONENT_MAP[name] || name;
};

const props = defineProps<{
	html?: string;
	node?: ParsedNode[];
}>();

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
		const className = codeElement?.className || '';
		const lang = className.split('-')[1];
		return {
			type: 'component',
			tag: 'highlight',
			props: {
				data: codeElement?.textContent || '',
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
	props?: Record<string, any>,
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
		const tagName = element.tagName?.toLowerCase() || 'p';

		// Check if it's a component tag
		if (TAG_CONFIG.COMPONENT_TAGS.has(tagName)) {
			return createComponentNode(element, tagName);
		}

		// Check if it's a render HTML tag with props
		if (TAG_CONFIG.RENDER_HTML_WITH_PROPS.has(tagName)) {
			const props = tagName === 'code' ? { class: 'e-code' } : undefined;
			return createRenderHtmlNode(element, tagName, props);
		}

		// Check if it's a pure render HTML tag
		if (TAG_CONFIG.RENDER_HTML_TAGS.has(tagName)) {
			return createRenderHtmlNode(element, tagName);
		}

		// Handle security tags (like 'a')
		if (TAG_CONFIG.SECURITY_TAGS.has(tagName)) {
			const attributes = parseAttributes(element);
			const secureAttributes = addSecurityAttributes(tagName, attributes);
			return createElementNode(element, tagName, secureAttributes);
		}

		// Handle regular element tags
		if (TAG_CONFIG.ELEMENT_TAGS.has(tagName)) {
			const attributes = parseAttributes(element);
			return createElementNode(element, tagName, attributes);
		}

		// Default: treat as regular element
		const attributes = parseAttributes(element);
		return createElementNode(element, tagName, attributes);
	}

	// Ignore other node types
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
	if (!isEmpty(props.node)) return props.node || [];
	return parseHTML(props.html || '');
});
</script>

<template>
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
		<component
			:is="resolveComponent(node.tag)"
			v-else-if="node.type === 'renderHtml'"
			v-bind="node.props"
			v-html="node.html"
		/>
	</template>
</template>
