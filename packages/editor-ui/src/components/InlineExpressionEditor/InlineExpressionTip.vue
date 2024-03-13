<template>
	<div v-if="tip === 'drag'" :class="$style.tip">
		<n8n-text size="small" :class="$style.tipText"
			>{{ $locale.baseText('parameterInput.tip') }}:
		</n8n-text>
		<n8n-text size="small" :class="$style.text">
			{{ $locale.baseText('parameterInput.dragTipBeforePill') }}
		</n8n-text>
		<div :class="[$style.pill, { [$style.highlight]: !ndvStore.isMappingOnboarded }]">
			{{ $locale.baseText('parameterInput.inputField') }}
		</div>
		<n8n-text size="small" :class="$style.text">
			{{ $locale.baseText('parameterInput.dragTipAfterPill') }}
		</n8n-text>
	</div>

	<div v-else-if="tip === 'executePrevious'" :class="$style.tip">
		<n8n-text size="small" :class="$style.tipText"
			>{{ $locale.baseText('parameterInput.tip') }}:
		</n8n-text>
		<n8n-text size="small" :class="$style.text"
			>{{ $locale.baseText('expressionTip.noExecutionData') }}
		</n8n-text>
	</div>

	<div v-else :class="$style.tip">
		<n8n-text size="small" :class="$style.tipText"
			>{{ $locale.baseText('parameterInput.tip') }}:
		</n8n-text>
		<n8n-text size="small" :class="$style.text">
			{{ i18n.baseText('parameterInput.anythingInside') }}
		</n8n-text>
		<code v-text="`{{ }}`"></code>
		<n8n-text size="small" :class="$style.text">
			{{ i18n.baseText('parameterInput.isJavaScript') }}
		</n8n-text>
		<n8n-link
			:class="$style['learn-more']"
			size="small"
			underline
			theme="text"
			:to="expressionsDocsUrl"
		>
			{{ i18n.baseText('parameterInput.learnMore') }}
		</n8n-link>
	</div>
</template>

<script setup lang="ts">
import { useI18n } from '@/composables/useI18n';
import { useNDVStore } from '@/stores/ndv.store';
import { computed } from 'vue';
import { EXPRESSIONS_DOCS_URL } from '@/constants';

const i18n = useI18n();
const ndvStore = useNDVStore();

const props = defineProps<{ tip?: 'drag' | 'default' }>();

const tip = computed(() => {
	if (!ndvStore.hasInputData) {
		return 'executePrevious';
	}

	if (props.tip) return props.tip;

	if (ndvStore.focusedMappableInput) return 'drag';

	return 'default';
});
const expressionsDocsUrl = EXPRESSIONS_DOCS_URL;
</script>

<style lang="scss" module>
.tip {
	display: inline-flex;
	align-items: center;
	line-height: var(--font-line-height-regular);
	color: var(--color-text-base);
	font-size: var(--font-size-2xs);
	padding: var(--spacing-2xs);
	gap: var(--spacing-4xs);

	.tipText {
		color: var(--color-text-dark);
		font-weight: var(--font-weight-bold);
	}

	.text {
		flex-shrink: 0;

		&:last-child {
			flex-shrink: 1;
			white-space: nowrap;
			min-width: 0;
			overflow: hidden;
			text-overflow: ellipsis;
		}
	}

	code {
		font-size: var(--font-size-3xs);
		background: var(--color-background-base);
		padding: var(--spacing-5xs);
		border-radius: var(--border-radius-base);
	}

	.pill {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		color: var(--color-text-dark);

		border: var(--border-base);
		border-color: var(--color-foreground-light);
		background-color: var(--color-background-xlight);
		padding: var(--spacing-5xs) var(--spacing-3xs);
		border-radius: var(--border-radius-base);
	}

	.highlight {
		color: var(--color-primary);
		background-color: var(--color-primary-tint-3);
		border-color: var(--color-primary-tint-1);
	}
}
</style>
