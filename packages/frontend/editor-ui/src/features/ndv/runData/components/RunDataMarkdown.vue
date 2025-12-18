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
	padding: var(--spacing--sm) var(--spacing--md);
	border: var(--border);
	border-radius: var(--radius);
	background-color: var(--color--background--light-3);
	color: var(--color--text);
	font-family: var(--font-family);
	line-height: var(--line-height--xl);

	h1,
	h2,
	h3,
	h4,
	h5,
	h6 {
		margin-top: var(--spacing--lg);
		margin-bottom: var(--spacing--sm);
		font-weight: var(--font-weight--bold);
		line-height: var(--line-height--lg);
		border-bottom: var(--border-width) solid var(--border-color--light);

		&:first-child {
			margin-top: 0;
		}
	}

	h1 {
		font-size: var(--font-size--2xl);
	}
	h2 {
		font-size: var(--font-size--xl);
	}
	h3 {
		font-size: var(--font-size--lg);
	}
	h4 {
		font-size: var(--font-size--md);
	}
	h5 {
		font-size: var(--font-size--sm);
	}
	h6 {
		font-size: var(--font-size--xs);
		color: var(--color--text--tint-1);
	}

	p {
		margin: var(--spacing--sm) 0;
	}

	a {
		color: var(--color--primary);
		text-decoration: none;

		&:hover {
			text-decoration: underline;
			color: var(--color--primary--shade-1);
		}
	}

	strong {
		font-weight: var(--font-weight--bold);
	}

	em {
		font-style: italic;
	}

	blockquote {
		padding: var(--spacing--xs) var(--spacing--sm);
		margin: var(--spacing--sm) 0;
		color: var(--color--text--tint-1);
		border-left: 0.25em solid var(--border-color);
		background-color: var(--color--background--light-1);
		border-radius: var(--radius--sm);
	}

	code,
	pre {
		font-family: var(--font-family--monospace);
		font-size: var(--font-size--sm);
	}

	code {
		background-color: var(--color--background--light-1);
		padding: 0.2em 0.4em;
		border-radius: var(--radius--sm);
		color: var(--code--color--foreground);
	}

	pre {
		background-color: var(--color--background--light-2);
		padding: var(--spacing--sm);
		border-radius: var(--radius--lg);
		overflow-x: auto;
		border: var(--border-width) solid var(--border-color--light);

		code {
			background: none;
			padding: 0;
			color: inherit;
		}
	}

	ul,
	ol {
		margin: var(--spacing--sm) 0;
		padding-left: var(--spacing--lg);
	}

	table {
		border-collapse: collapse;
		width: 100%;
		margin: var(--spacing--sm) 0;
		font-size: var(--font-size--sm);

		th,
		td {
			border: var(--border-width) solid var(--border-color--light);
			padding: var(--spacing--2xs) var(--spacing--xs);
			text-align: left;
		}

		th {
			background-color: var(--table--header--color--background);
			font-weight: var(--font-weight--medium);
			color: var(--color--text--shade-1);
		}

		tr:nth-child(even) {
			background-color: var(--table--row--color--background--even);
		}

		tr:hover {
			background-color: var(--table--row--color--background--hover);
		}
	}

	hr {
		border: 0;
		border-top: var(--border-width) solid var(--border-color--light);
		margin: var(--spacing--lg) 0;
	}

	img {
		max-width: 100%;
		border-radius: var(--radius--sm);
		box-shadow: var(--shadow--light);
	}

	blockquote > :last-child {
		margin-bottom: 0;
	}
}
</style>
