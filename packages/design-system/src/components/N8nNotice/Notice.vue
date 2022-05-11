<template>
	<div :id="id" :class="classes" role="alert">
		<div class="notice-content">
			<n8n-text size="small">
				<slot>
					<span
						v-if="expandFromContent"
						v-html="preExpansionText"
						:class="expanded ? $style['expanded'] : $style['truncated']"
						:id="`${id}-content`"
						role="pre-expansion-text-region"
					/>
					<a
						v-if="expandFromContent"
						v-html="expansionText"
						role="expansion-text-region"
						:aria-controls="`${id}-content`"
						:aria-expanded="canTruncate && !expanded ? 'false' : 'true'"
						@click="toggleExpanded"
					/>
					<span
						:class="expanded ? $style['expanded'] : $style['truncated']"
						:id="`${id}-content`"
						role="region"
						v-html="expandFromContent ? postExpansionText : sanitizedContent"
					/>
					<span v-if="canTruncate">
						<a
							role="button"
							@click="toggleExpanded"
							:aria-controls="`${id}-content`"
							:aria-expanded="canTruncate && !expanded ? 'false' : 'true'"
						>
							{{ expanded ? t('notice.showLess') : expandFromContent ? '' : t('notice.showMore') }}
						</a>
					</span>
				</slot>
			</n8n-text>
		</div>
	</div>
</template>

<script lang="ts">
import Vue from 'vue';
import sanitizeHtml from 'sanitize-html';
import N8nText from "../../components/N8nText";
import Locale from "../../mixins/locale";
import {uid} from "../../utils";

const DEFAULT_TRUNCATION_MAX_LENGTH = 150;

export default Vue.extend({
	name: 'n8n-notice',
	directives: {},
	mixins: [
		Locale,
	],
	props: {
		id: {
			type: String,
			default: () => uid('notice'),
		},
		theme: {
			type: String,
			default: 'warning',
		},
		truncateAt: {
			type: Number,
			default: 150,
		},
		truncate: {
			type: Boolean,
			default: false,
		},
		content: {
			type: String,
			default: '',
		},
		expandFromContent: {
			type: Boolean,
			default: false,
		},
		expansionTextPattern: {
			type: RegExp,
			default: () => /./,
		},
	},
	components: {
		N8nText,
	},
	data() {
		return {
			expanded: false,
		};
	},
	computed: {
		classes(): string[] {
			return [
				'notice',
				this.$style['notice'],
				this.$style[this.theme],
			];
		},
		canTruncate(): boolean {
			return this.truncate && this.content.length > this.truncateAt;
		},
		truncatedContent(): string {
			if (!this.canTruncate || this.expanded) {
				return this.content;
			}

			return this.content.slice(0, this.truncateAt as number) + '...';
		},
		sanitizedContent(): string {
			return sanitizeHtml(this.truncatedContent);
		},
		expansionText(): string {
			const match = this.truncatedContent.match(this.expansionTextPattern);

			if (match.length !== 1) {
				throw new Error('Expansion text must appear once in content');
			}

			return match[0];
		},
		preExpansionText(): string {
			const pre = this.truncatedContent.split(this.expansionTextPattern).shift();

			return sanitizeHtml(pre);
		},
		postExpansionText(): string {
			const post = this.truncatedContent.split(this.expansionTextPattern).pop();

			return sanitizeHtml(post);
		},
	},
	methods: {
		toggleExpanded() {
			this.expanded = !this.expanded;
		},
	},
});
</script>

<style lang="scss" module>
.notice {
	display: flex;
	color: var(--custom-font-black);
	margin: 0;
	padding: var(--spacing-2xs);
	background-color: var(--background-color);
	border-width: 1px 1px 1px 7px;
	border-style: solid;
	border-color: var(--border-color);
	border-radius: var(--border-radius-small);
	line-height: var(--font-line-height-compact);

	a {
		font-weight: var(--font-weight-bold);
	}

	span {
		line-height: var(--font-line-height-compact);
	}
}

.warning {
	--border-color: var(--color-warning-tint-1);
	--background-color: var(--color-warning-tint-2);
}

.danger {
	--border-color: var(--color-danger-tint-1);
	--background-color: var(--color-danger-tint-2);
}

.success {
	--border-color: var(--color-success-tint-1);
	--background-color: var(--color-success-tint-2);
}

.info {
	--border-color: var(--color-info-tint-1);
	--background-color: var(--color-info-tint-2);
}

.expanded {
	+ span {
		margin-top: var(--spacing-4xs);
		display: block;
	}
}

.truncated {
	display: inline;
}
</style>
