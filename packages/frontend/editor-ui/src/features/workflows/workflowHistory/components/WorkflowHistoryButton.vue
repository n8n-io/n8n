<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import { VIEWS } from '@/app/constants';
import { useI18n } from '@n8n/i18n';
import { useUIStore } from '@/app/stores/ui.store';
import { N8nIcon, N8nIconButton, N8nTooltip } from '@n8n/design-system';
import { useDebounce } from '@/app/composables/useDebounce';
import { LOADING_ANIMATION_MIN_DURATION } from '@/app/constants/durations';
const locale = useI18n();

const props = defineProps<{
	workflowId: string;
	isNewWorkflow: boolean;
}>();

const uiStore = useUIStore();
const isWorkflowSaving = ref(false);
const loadingVisible = ref(false);
const { debounce } = useDebounce();

const debouncedRemoveSaveIndicator = debounce(
	() => {
		isWorkflowSaving.value = false;
	},
	{ debounceTime: LOADING_ANIMATION_MIN_DURATION, trailing: true },
);

watch(
	() => uiStore.isActionActive.workflowSaving,
	(value) => {
		if (value) {
			isWorkflowSaving.value = true;
			loadingVisible.value = true;
		} else {
			debouncedRemoveSaveIndicator();
			setTimeout(() => {
				loadingVisible.value = false;
			}, LOADING_ANIMATION_MIN_DURATION + 100);
		}
	},
);

const workflowHistoryRoute = computed<{ name: string; params: { workflowId: string } }>(() => ({
	name: VIEWS.WORKFLOW_HISTORY,
	params: {
		workflowId: props.workflowId,
	},
}));
</script>

<template>
	<div :class="$style.relative">
		<N8nTooltip placement="bottom">
			<RouterLink :to="workflowHistoryRoute">
				<N8nIcon
					:class="{ [$style.loadingIcon]: true, [$style.loadingVisible]: loadingVisible }"
					icon="spinner"
					color="text-base"
				/>
				<N8nIconButton
					:class="{ [$style.button]: true, [$style.buttonHidden]: isWorkflowSaving }"
					:disabled="isNewWorkflow || isWorkflowSaving"
					data-test-id="workflow-history-button"
					type="highlight"
					icon="history"
					size="medium"
				/>
			</RouterLink>
			<template #content>
				<span v-if="isNewWorkflow">
					{{ locale.baseText('workflowHistory.button.tooltip.empty') }}
				</span>
				<span v-else>{{ locale.baseText('workflowHistory.button.tooltip') }}</span>
			</template>
		</N8nTooltip>
	</div>
</template>

<style lang="scss" module>
.relative {
	position: relative;
}

.loadingIcon {
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	opacity: 0;
	filter: blur(2px);
	transition:
		opacity 0.25s,
		filter 0.25s;
	pointer-events: none;
}

.loadingVisible {
	opacity: 1;
	filter: blur(0);
	animation: loading-rotate 1s linear infinite;
}

.button {
	transition:
		opacity 0.25s,
		filter 0.25s;
	opacity: 1;
	filter: blur(0);
}

.buttonHidden {
	opacity: 0;
	filter: blur(2px);

	:global(.n8n-icon) {
		animation: icon-rotate 1s ease-in-out infinite;
	}
}

@keyframes loading-rotate {
	100% {
		transform: translate(-50%, -50%) rotate(-360deg);
	}
}

@keyframes icon-rotate {
	100% {
		transform: rotate(-360deg);
	}
}
</style>
