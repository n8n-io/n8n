<script lang="ts">
import { defineComponent } from 'vue';
import VueMarkdownRender from 'vue-markdown-render';

export default defineComponent({
	name: 'RunDataMarkdown',
	components: {
		VueMarkdownRender,
	},
	props: {
		inputMarkdown: {
			type: String,
			required: true,
		},
	},
});
</script>

<template>
	<div :class="$style.markdown">
		<VueMarkdownRender :source="inputMarkdown" />
	</div>
</template>

<style lang="scss" module>
.markdown {
	width: 100%;
	height: 100%;
	overflow: auto;
	padding: 1rem 1.25rem;
	border: 1px solid var(--border-color);
	border-radius: var(--radius);
	background-color: var(-color-foreground-base);
	color: var(--color--text);
	font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
	line-height: 1.6;

	h1,
	h2,
	h3,
	h4,
	h5,
	h6 {
		margin-top: 1.5em;
		margin-bottom: 0.75em;
		font-weight: 600;
		line-height: 1.25;
		border-bottom: 1px solid #d8dee4;

		&:first-child {
			margin-top: 0;
		}
	}

	h1 {
		font-size: 1.75rem;
	}
	h2 {
		font-size: 1.5rem;
	}
	h3 {
		font-size: 1.25rem;
	}
	h4 {
		font-size: 1.1rem;
	}
	h5 {
		font-size: 1rem;
	}
	h6 {
		font-size: 0.9rem;
		color: #6a737d;
	}

	p {
		margin: 0.75em 0;
	}

	a {
		color: #0969da;
		text-decoration: none;

		&:hover {
			text-decoration: underline;
		}
	}

	strong {
		font-weight: 600;
	}

	em {
		font-style: italic;
	}

	blockquote {
		padding: 0.5em 1em;
		margin: 0.75em 0;
		color: #6a737d;
		border-left: 0.25em solid #d0d7de;
		background-color: #f6f8fa;
		border-radius: 0.25rem;
	}

	code,
	pre {
		font-family: SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace;
		font-size: 0.9rem;
	}

	code {
		background-color: #f6f8fa;
		padding: 0.2em 0.4em;
		border-radius: 0.25rem;
	}

	pre {
		background-color: #f6f8fa;
		padding: 1rem;
		border-radius: 0.5rem;
		overflow-x: auto;

		code {
			background: none;
			padding: 0;
		}
	}

	ul,
	ol {
		margin: 0.75em 0;
		padding-left: 2em;
	}

	table {
		border-collapse: collapse;
		width: 100%;
		margin: 1em 0;
		font-size: 0.95rem;

		th,
		td {
			border: 1px solid #d0d7de;
			padding: 0.5em 0.75em;
			text-align: left;
		}

		th {
			background-color: #f6f8fa;
			font-weight: 600;
		}
	}

	hr {
		border: 0;
		border-top: 1px solid #d8dee4;
		margin: 1.5em 0;
	}

	img {
		max-width: 100%;
		border-radius: 0.25rem;
	}

	blockquote > :last-child {
		margin-bottom: 0;
	}
}
</style>
