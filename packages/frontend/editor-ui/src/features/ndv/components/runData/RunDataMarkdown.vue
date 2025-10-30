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
	white-space: pre-wrap;

	width: 100%;
	height: 100%;
	overflow: auto;
	border: 2px solid var(--border-color);
	padding: var(--spacing--xs);
	border-width: var(--border-width);
	border-style: var(--input--border-style, var(--border-style));
	border-color: var(--input--border-color, var(--border-color));
	border-radius: var(--input--radius, var(--radius));

	h1,
	h2,
	h3,
	h4,
	h5,
	h6 {
		font-weight: 600;
	}

	h1 {
		font-size: var(--font-size--xl);
	}

	h2 {
		font-size: var(--font-size--lg);
	}

	h3 {
		font-size: var(--font-size--md);
	}

	h4 {
		font-size: var(--font-size--sm);
	}

	h5 {
		font-size: var(--font-size--xs);
	}

	h6 {
		font-size: var(--font-size--2xs);
	}

	p {
		word-wrap: break-word;
	}

	strong,
	b {
		font-weight: 600;
	}

	em,
	i {
		font-style: italic;
	}

	s,
	del {
		text-decoration: line-through;
	}

	code {
		background: var(--color--background--light);
		padding: 0.2em 0.4em;
		border-radius: var(--border-radius--xs);
		font-family: var(--font-family--monospace);
		font-size: 0.9em;
	}

	pre {
		background: var(--chat--message--pre--background);
		border-radius: var(--radius);

		padding: var(--spacing--xs);
		font-size: var(--font-size--sm);
		white-space: pre-wrap;
		font-family: inherit;
		margin: var(--spacing--4xs) 0;
		overflow-x: auto;

		code {
			background: transparent;
			padding: 0;
			border-radius: 0;
			font-family: var(--font-family--monospace);
		}
	}

	ul,
	ol {
		padding-left: var(--spacing--lg);
	}

	li {
		margin: 0;
	}

	li input[type='checkbox'] {
		margin-right: var(--spacing--4xs);
	}

	blockquote {
		padding-left: var(--spacing--xs);
		border-left: 3px solid var(--border-color);

		background: var(--color--background--light);
		color: var(--color--text--base);
	}

	a {
		color: var(--color--primary);
		text-decoration: none;

		&:hover {
			text-decoration: underline;
		}
	}

	img {
		max-width: 100%;
		height: auto;
		display: block;
		margin: var(--spacing--4xs) 0;
	}

	table {
		width: fit-content;
		border-collapse: collapse;
		border-top: 2px solid var(--color--text--shade-2);
		border-bottom: 2px solid var(--color--text--shade-2);
		font-size: var(--font-size--sm);
	}

	th,
	td {
		padding: var(--spacing--4xs) var(--spacing--xs);
		text-align: left;
	}

	th {
		font-weight: 600;
		border-bottom: 1px solid var(--color--text--shade-2);
	}

	tr:not(:last-child) td {
		border-bottom: 1px solid var(--color--border);
	}

	hr {
		border: none;
		border-top: 1px solid var(--border-color);
		margin: var(--spacing--xs) var(--spacing--xs);
	}
}
</style>
