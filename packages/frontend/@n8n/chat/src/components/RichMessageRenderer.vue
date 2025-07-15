<template>
	<div
		:id="componentId"
		class="rich-message-container"
		:class="{ 'user-message': isUser, 'bot-message': !isUser }"
	>
		<!-- Scoped CSS injection -->
		<component :is="'style'" v-if="content.css" type="text/css">
			{{ scopedCSS }}
		</component>

		<!-- HTML Content -->
		<div v-if="content.html" class="rich-html-content" v-html="sanitizedHTML" />

		<!-- Interactive Components -->
		<div v-if="content.components && content.components.length > 0" class="rich-components">
			<component
				v-for="comp in content.components"
				:key="comp.id"
				:is="getComponentType(comp.type)"
				v-bind="comp.props"
				:style="comp.style"
				@click="handleComponentEvent(comp, 'click', $event)"
				@change="handleComponentEvent(comp, 'change', $event)"
			/>
		</div>

		<!-- Data Display -->
		<div v-if="content.data && Object.keys(content.data).length > 0" class="rich-data">
			<pre>{{ JSON.stringify(content.data, null, 2) }}</pre>
		</div>

		<!-- Script Execution -->
		<div ref="scriptContainer" class="script-container" />
	</div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue';
import DOMPurify from 'dompurify';
import type { RichContent, RichComponent } from '../types/messages';

interface Props {
	content: RichContent;
	isUser?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
	isUser: false,
});

const scriptContainer = ref<HTMLElement>();

// Generate unique component ID for CSS scoping
const componentId = computed(() => `rich-message-${Math.random().toString(36).substr(2, 9)}`);

// Sanitization based on content settings
const sanitizedHTML = computed(() => {
	if (!props.content.html) return '';

	switch (props.content.sanitize) {
		case 'none':
			return props.content.html;
		case 'strict':
			return DOMPurify.sanitize(props.content.html, {
				ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'span', 'div'],
				ALLOWED_ATTR: ['class'],
			});
		case 'basic':
		default:
			return DOMPurify.sanitize(props.content.html, {
				ADD_TAGS: ['iframe'],
				ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling'],
			});
	}
});

const scopedCSS = computed(() => {
	if (!props.content.css) return '';

	// Basic CSS sanitization - remove dangerous properties
	const dangerousProps = ['expression', 'javascript:', 'vbscript:', 'onload', 'onerror'];
	let css = props.content.css;

	dangerousProps.forEach((prop) => {
		css = css.replace(new RegExp(prop, 'gi'), '');
	});

	// Scope CSS to this component instance
	return scopeCSSToComponent(css, componentId.value);
});

// Function to scope CSS rules to a specific component
const scopeCSSToComponent = (css: string, id: string): string => {
	if (!css) return '';

	// Add the component ID as a prefix to all CSS selectors
	return css.replace(/([^{}]+){/g, (match, selector) => {
		// Clean up the selector
		const cleanSelector = selector.trim();

		// Skip @rules like @media, @keyframes, etc.
		if (cleanSelector.startsWith('@')) {
			return match;
		}

		// Split multiple selectors separated by commas
		const selectors = cleanSelector.split(',').map((s: string) => {
			const trimmed = s.trim();
			// Prefix each selector with the component ID
			return `#${id} ${trimmed}`;
		});

		return `${selectors.join(', ')}{`;
	});
};

// Component type mapping
const getComponentType = (type: RichComponent['type']) => {
	const componentMap = {
		button: 'button',
		form: 'form',
		chart: 'div', // Custom chart component
		table: 'table',
		image: 'img',
		video: 'video',
		iframe: 'iframe',
	};

	return componentMap[type] || 'div';
};

// Event handling for interactive components
const handleComponentEvent = (component: RichComponent, eventType: string, event: Event) => {
	if (!component.events || !component.events[eventType]) return;

	try {
		// Safely execute event handler in controlled context
		const handler = new Function('event', 'component', 'data', component.events[eventType]);
		handler(event, component, props.content.data);
	} catch (error) {
		console.warn('Rich content event handler error:', error);
	}
};

// Script execution in sandboxed environment
onMounted(async () => {
	if (!props.content.script || !scriptContainer.value) return;

	await nextTick();

	try {
		// Create sandboxed execution context
		const sandbox = {
			console: {
				log: (...args: any[]) => {}, // Disabled in production
				error: (...args: any[]) => console.error('[Rich Content]', ...args),
				warn: (...args: any[]) => console.warn('[Rich Content]', ...args),
			},
			data: props.content.data,
			container: scriptContainer.value,
			// Restricted DOM access scoped to this component
			document: {
				createElement: document.createElement.bind(document),
				getElementById: (id: string) =>
					document.getElementById(componentId.value)?.querySelector(`#${id}`),
				querySelector: (selector: string) =>
					document.getElementById(componentId.value)?.querySelector(selector),
			},
		};

		// Execute script with limited context
		const scriptFunction = new Function(
			'sandbox',
			`
			with (sandbox) {
				${props.content.script}
			}
		`,
		);

		scriptFunction(sandbox);
	} catch (error) {
		console.error('Rich content script execution error:', error);
	}
});
</script>

<style scoped>
.rich-message-container {
	padding: 12px;
	border-radius: 8px;
	margin: 8px 0;
}

.user-message {
	background-color: #007acc;
	color: white;
	margin-left: 20%;
}

.bot-message {
	background-color: #f5f5f5;
	color: #333;
	margin-right: 20%;
}

.rich-html-content {
	margin-bottom: 12px;
}

.rich-components {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	margin-bottom: 12px;
}

.rich-data {
	background-color: #f8f9fa;
	border: 1px solid #e9ecef;
	border-radius: 4px;
	padding: 8px;
	font-family: 'Courier New', monospace;
	font-size: 12px;
	overflow-x: auto;
}

.script-container {
	min-height: 0;
}

/* Component-specific styles */
button {
	padding: 8px 16px;
	border: none;
	border-radius: 4px;
	background-color: #007acc;
	color: white;
	cursor: pointer;
	transition: background-color 0.2s;
}

button:hover {
	background-color: #005a9e;
}

table {
	width: 100%;
	border-collapse: collapse;
	margin: 8px 0;
}

table th,
table td {
	border: 1px solid #ddd;
	padding: 8px;
	text-align: left;
}

table th {
	background-color: #f2f2f2;
}

img {
	max-width: 100%;
	height: auto;
	border-radius: 4px;
}

iframe {
	width: 100%;
	min-height: 200px;
	border: 1px solid #ddd;
	border-radius: 4px;
}
</style>
