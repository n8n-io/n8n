<script lang="ts">
import sanitizeHtml, { defaults, type IOptions as SanitizeOptions } from 'sanitize-html';

// Security: Enhanced sanitization options to prevent XSS attacks
const sanitizeOptions: SanitizeOptions = {
	allowVulnerableTags: false,
	enforceHtmlBoundary: false,
	disallowedTagsMode: 'discard',
	// Security: Only allow safe HTML tags
	allowedTags: [
		// Basic text formatting
		'b',
		'i',
		'em',
		'strong',
		'u',
		's',
		'del',
		'ins',
		// Headings
		'h1',
		'h2',
		'h3',
		'h4',
		'h5',
		'h6',
		// Lists
		'ul',
		'ol',
		'li',
		'dl',
		'dt',
		'dd',
		// Links and media
		'a',
		'img',
		'video',
		'audio',
		'source',
		// Tables
		'table',
		'thead',
		'tbody',
		'tfoot',
		'tr',
		'td',
		'th',
		'caption',
		'colgroup',
		'col',
		// Code and preformatted text
		'code',
		'pre',
		'kbd',
		'samp',
		'var',
		// Block elements
		'div',
		'p',
		'blockquote',
		'hr',
		'br',
		// Inline elements
		'span',
		'small',
		'sub',
		'sup',
		'mark',
		'time',
		'cite',
		'q',
		'abbr',
		'acronym',
		// Forms (readonly)
		'form',
		'input',
		'textarea',
		'select',
		'option',
		'optgroup',
		'label',
		'fieldset',
		'legend',
		// Semantic elements
		'article',
		'section',
		'nav',
		'aside',
		'header',
		'footer',
		'main',
		'figure',
		'figcaption',
		// Data elements
		'details',
		'summary',
		'data',
		'meter',
		'progress',
	],
	// Security: Only allow safe attributes
	allowedAttributes: {
		// Global attributes
		'*': ['class', 'id', 'title', 'lang', 'dir'],
		// Link attributes
		a: ['href', 'target', 'rel', 'download', 'hreflang', 'type'],
		// Image attributes
		img: ['src', 'alt', 'width', 'height', 'loading', 'decoding'],
		// Video attributes
		video: ['src', 'width', 'height', 'controls', 'autoplay', 'loop', 'muted', 'poster', 'preload'],
		// Audio attributes
		audio: ['src', 'controls', 'autoplay', 'loop', 'muted', 'preload'],
		// Source attributes
		source: ['src', 'type', 'media', 'sizes'],
		// Form attributes (readonly)
		input: ['type', 'name', 'value', 'readonly', 'disabled', 'placeholder', 'size', 'maxlength'],
		textarea: ['name', 'readonly', 'disabled', 'placeholder', 'rows', 'cols'],
		select: ['name', 'readonly', 'disabled', 'size', 'multiple'],
		option: ['value', 'selected', 'disabled'],
		optgroup: ['label', 'disabled'],
		label: ['for'],
		fieldset: ['disabled'],
		// Table attributes
		table: ['width', 'border', 'cellpadding', 'cellspacing'],
		td: ['colspan', 'rowspan', 'width', 'height'],
		th: ['colspan', 'rowspan', 'width', 'height', 'scope'],
		// Time attributes
		time: ['datetime'],
		// Data attributes
		meter: ['value', 'min', 'max', 'low', 'high', 'optimum'],
		progress: ['value', 'max'],
		// Details attributes
		details: ['open'],
	},
	// Security: Only allow safe URL schemes
	allowedSchemes: ['https', 'http', 'mailto', 'tel', 'data'],
	// Security: Allow protocol-relative URLs only for specific tags
	allowedSchemesByTag: {
		img: ['https', 'http', 'data'],
		source: ['https', 'http', 'data'],
		video: ['https', 'http', 'data'],
		audio: ['https', 'http', 'data'],
	},
	// Security: Disallow protocol-relative URLs
	allowProtocolRelative: false,
	// Security: Transform potentially dangerous tags
	transformTags: {
		// Remove script tags completely
		script: '',
		// Remove style tags completely
		style: '',
		// Remove head tags completely
		head: '',
		// Remove body tags completely
		body: '',
		// Remove html tags completely
		html: '',
		// Remove title tags completely
		title: '',
		// Remove meta tags completely
		meta: '',
		// Remove link tags completely
		link: '',
		// Remove base tags completely
		base: '',
		// Remove iframe tags completely (potential XSS vector)
		iframe: '',
		// Remove object tags completely (potential XSS vector)
		object: '',
		// Remove embed tags completely (potential XSS vector)
		embed: '',
		// Remove applet tags completely (potential XSS vector)
		applet: '',
		// Remove form action and method attributes (prevent CSRF)
		form: (tagName, attribs) => {
			delete attribs.action;
			delete attribs.method;
			delete attribs.enctype;
			return { tagName, attribs };
		},
		// Remove onclick and other event handlers
		'*': (tagName, attribs) => {
			// Remove all event handler attributes
			const eventHandlers = [
				'onclick',
				'onload',
				'onerror',
				'onmouseover',
				'onmouseout',
				'onfocus',
				'onblur',
				'onchange',
				'onsubmit',
				'onreset',
				'onkeydown',
				'onkeyup',
				'onkeypress',
				'onmousedown',
				'onmouseup',
				'ondblclick',
				'oncontextmenu',
				'onwheel',
				'onscroll',
				'onresize',
				'onabort',
				'onbeforeunload',
				'onerror',
				'onhashchange',
				'onmessage',
				'onoffline',
				'ononline',
				'onpagehide',
				'onpageshow',
				'onpopstate',
				'onstorage',
				'onunload',
				'onbeforeprint',
				'onafterprint',
			];
			eventHandlers.forEach((handler) => delete attribs[handler]);

			// Remove javascript: URLs from href and src attributes
			if (attribs.href && attribs.href.toLowerCase().startsWith('javascript:')) {
				delete attribs.href;
			}
			if (attribs.src && attribs.src.toLowerCase().startsWith('javascript:')) {
				delete attribs.src;
			}

			// Remove data: URLs that might contain JavaScript
			if (attribs.href && attribs.href.toLowerCase().startsWith('data:text/html')) {
				delete attribs.href;
			}
			if (attribs.src && attribs.src.toLowerCase().startsWith('data:text/html')) {
				delete attribs.src;
			}

			return { tagName, attribs };
		},
	},
	// Security: Additional text filter to remove any remaining JavaScript
	textFilter: (text) => {
		// Remove any remaining JavaScript code patterns
		return text
			.replace(/javascript:/gi, '')
			.replace(/vbscript:/gi, '')
			.replace(/data:text\/html/gi, '')
			.replace(/on\w+\s*=/gi, '')
			.replace(/<script[^>]*>.*?<\/script>/gis, '')
			.replace(/<iframe[^>]*>.*?<\/iframe>/gis, '');
	},
};

export default {
	name: 'RunDataHtml',
	props: {
		inputHtml: {
			type: String,
			required: true,
		},
	},
	computed: {
		sanitizedHtml() {
			// Security: Additional validation before sanitization
			if (!this.inputHtml || typeof this.inputHtml !== 'string') {
				return '';
			}

			// Security: Check for obvious XSS attempts before sanitization
			const dangerousPatterns = [
				/<script[^>]*>/i,
				/javascript:/i,
				/vbscript:/i,
				/on\w+\s*=/i,
				/data:text\/html/i,
			];

			for (const pattern of dangerousPatterns) {
				if (pattern.test(this.inputHtml)) {
					console.warn('Potentially dangerous HTML content detected and will be sanitized');
					break;
				}
			}

			return sanitizeHtml(this.inputHtml, sanitizeOptions);
		},
	},
};
</script>

<template>
	<iframe
		class="__html-display"
		:srcdoc="sanitizedHtml"
		sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
		referrerpolicy="no-referrer"
	/>
</template>

<style lang="scss">
.__html-display {
	width: 100%;
	height: 100%;
	border: none;
}
</style>
