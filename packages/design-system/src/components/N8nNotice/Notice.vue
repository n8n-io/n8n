<template>
	<div :id="id" :class="classes" role="alert" @click="onClick">
		<div class="notice-content">
			<N8nText size="small" :compact="true">
				<slot>
					<span
						:id="`${id}-content`"
						:class="showFullContent ? $style['expanded'] : $style['truncated']"
						role="region"
						v-html="sanitizeHtml(showFullContent ? fullContent : content)"
					/>
				</slot>
			</N8nText>
		</div>
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import sanitizeHtml from 'sanitize-html';
import N8nText from '../../components/N8nText';
import Locale from '../../mixins/locale';
import { uid } from '../../utils';

export default defineComponent({
	name: 'N8nNotice',
	directives: {},
	components: {
		N8nText,
	},
	mixins: [Locale],
	props: {
		id: {
			type: String,
			default: () => uid('notice'),
		},
		theme: {
			type: String,
			default: 'warning',
		},
		content: {
			type: String,
			default: '',
		},
		fullContent: {
			type: String,
			default: '',
		},
	},
	data() {
		return {
			showFullContent: false,
		};
	},
	computed: {
		classes(): string[] {
			return ['notice', this.$style.notice, this.$style[this.theme]];
		},
		canTruncate(): boolean {
			return this.fullContent !== undefined;
		},
	},
	methods: {
		toggleExpanded() {
			this.showFullContent = !this.showFullContent;
		},
		sanitizeHtml(text: string): string {
			return sanitizeHtml(text, {
				allowedAttributes: {
					a: [
						'data-key',
						'href',
						'target',
						'data-action',
						'data-action-parameter-connectiontype',
						'data-action-parameter-creatorview',
					],
				},
			});
		},
		onClick(event: MouseEvent) {
			if (!(event.target instanceof HTMLElement)) return;

			if (event.target.localName !== 'a') return;

			if (event.target.dataset?.key) {
				event.stopPropagation();
				event.preventDefault();

				if (event.target.dataset.key === 'show-less') {
					this.showFullContent = false;
				} else if (this.canTruncate && event.target.dataset.key === 'toggle-expand') {
					this.showFullContent = !this.showFullContent;
				} else {
					this.$emit('action', event.target.dataset.key);
				}
			}
		},
	},
});
</script>

<style lang="scss" module>
.notice {
	font-size: var(--font-size-2xs);
	display: flex;
	color: var(--color-notice-font);
	margin: var(--notice-margin, var(--spacing-s) 0);
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
}

.warning {
	--border-color: var(--color-notice-warning-border);
	--background-color: var(--color-notice-warning-background);
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
