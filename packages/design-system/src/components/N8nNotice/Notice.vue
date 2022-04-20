<template>
	<div :id="id" :class="classes" role="alert">
	  <div class="notice-content">
			<n8n-text size="small">
				<slot>
					<span
						:class="expanded ? $style['expanded'] : $style['truncated']"
						:id="`${id}-content`"
						role="region"
						v-html="renderedContent"
					/>
					<span v-if="canTruncate">
						<a
							role="button"
						  :aria-controls="`${id}-content`"
						  :aria-expanded="canTruncate && !expanded ? 'false' : 'true'"
							@click="toggleExpanded"
						>
							{{ t(expanded ? 'notice.showLess' : 'notice.showMore') }}
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
import N8nText from "@/components/N8nText";
import Locale from "@/mixins/locale";
import {uid} from "@/utils";

const DEFAULT_TRUNCATION_MAX_LENGTH = 150;

export default Vue.extend({
	directives: {},
	mixins: [
	  Locale,
	],
	props: {
		id: {
			type: String,
			default: () => uid('notice'),
		},
		type: {
			type: String,
			default: 'warning',
		},
		truncate: {
			type: [Boolean, Number],
			default: false,
		},
		content: {
			type: String,
			default: '',
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
		classes (): string[] {
			return [
				'notice',
				this.$style['notice'],
		  	this.$style[`notice-${this.type}`],
			];
		},
		truncateAt(): boolean | number {
			return this.truncate === true
				? DEFAULT_TRUNCATION_MAX_LENGTH
				: this.truncate;
		},
	  canTruncate(): boolean {
		  return !!this.truncateAt && this.content.length > this.truncateAt;
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
		renderedContent(): string {
			return this.sanitizedContent;
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
  padding: var(--spacing-xs);
	background-color: var(--background-color);
	border-width: 1px 1px 1px 7px;
	border-style: solid;
  border-color: var(--border-color);
  border-radius: var(--border-radius-small);

  a {
		font-weight: var(--font-weight-bold);
  }
}

.notice-warning {
  --border-color: #F2DDA6;
  --background-color: #FFF6D7;
}

.notice-danger {
  --border-color: var(--color-danger-tint-1);
  --background-color: var(--color-danger-tint-2);
}

.notice-success {
  --border-color: var(--color-success-tint-1);
  --background-color: var(--color-success-tint-2);
}

.notice-info {
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
