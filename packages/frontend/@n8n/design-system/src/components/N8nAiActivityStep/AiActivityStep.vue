<script lang="ts" setup>
import { truncate } from '@n8n/utils/string/truncate';
import { CollapsibleRoot, CollapsibleTrigger } from 'reka-ui';
import { computed, inject } from 'vue';

import { aiActivityStepGroupContext } from './context';
import N8nAiActivityStepButton from '../N8nAiActivityStepButton';
import N8nAiActivityStepChevron from '../N8nAiActivityStepChevron';
import N8nAiActivityStepResultSection from '../N8nAiActivityStepResultSection';
import N8nAnimatedCollapsibleContent from '../N8nAnimatedCollapsibleContent';
import N8nCallout from '../N8nCallout';
import N8nIcon from '../N8nIcon';
import N8nTooltip from '../N8nTooltip';

const props = withDefaults(
	defineProps<{
		label: string;
		loading?: boolean;
		error?: string;
		/** Whether the step has collapsible content. */
		hasContent?: boolean;
		/** Wraps slot content in the standard activity data panel. */
		wrapContent?: boolean;
	}>(),
	{
		loading: false,
		error: undefined,
		hasContent: true,
		wrapContent: false,
	},
);

const MAX_ERROR_TOOLTIP_LENGTH = 160;

const isNested = inject(aiActivityStepGroupContext, false);

const errorTooltip = computed(() =>
	props.error ? truncate(props.error, MAX_ERROR_TOOLTIP_LENGTH) : '',
);
</script>

<template>
	<div :class="{ [$style.nestedRow]: isNested }">
		<span v-if="isNested" :class="$style.rail">
			<span :class="$style.railDot" />
		</span>
		<CollapsibleRoot v-if="props.hasContent" v-slot="{ open: isOpen }">
			<CollapsibleTrigger as-child>
				<N8nAiActivityStepButton size="small" :loading="props.loading">
					{{ props.label }}
					<template #icon>
						<N8nTooltip v-if="props.error" placement="top">
							<template #content>
								<span :class="$style.errorTooltip">{{ errorTooltip }}</span>
							</template>
							<N8nIcon
								icon="triangle-alert"
								color="danger"
								size="small"
								:class="$style.activityErrorIcon"
							/>
						</N8nTooltip>
					</template>
					<template #suffix>
						<N8nAiActivityStepChevron :open="isOpen" />
					</template>
				</N8nAiActivityStepButton>
			</CollapsibleTrigger>
			<N8nAnimatedCollapsibleContent>
				<N8nAiActivityStepResultSection v-if="props.wrapContent">
					<slot />
				</N8nAiActivityStepResultSection>
				<slot v-else />
				<N8nCallout v-if="props.error !== undefined" theme="danger" :class="$style.errorCallout">
					{{ props.error }}
				</N8nCallout>
			</N8nAnimatedCollapsibleContent>
		</CollapsibleRoot>
		<N8nAiActivityStepButton v-else size="small" :loading="props.loading" :interactive="false">
			{{ props.label }}
			<template #icon>
				<N8nTooltip v-if="props.error" placement="top">
					<template #content>
						<span :class="$style.errorTooltip">{{ errorTooltip }}</span>
					</template>
					<N8nIcon
						icon="triangle-alert"
						color="danger"
						size="small"
						:class="$style.activityErrorIcon"
					/>
				</N8nTooltip>
			</template>
		</N8nAiActivityStepButton>
	</div>
</template>

<style lang="scss" module>
.nestedRow {
	display: grid;
	grid-template-columns: var(--spacing--md) minmax(0, 1fr);
	column-gap: var(--spacing--3xs);
	margin-left: calc(var(--spacing--4xs) * -1);
}

.rail {
	position: relative;
	display: flex;
	align-items: flex-start;
	justify-content: center;
	align-self: self-start;
	width: var(--spacing--md);
	min-height: var(--spacing--lg);
	height: 100%;

	&::before,
	&::after {
		content: '';
		position: absolute;
		left: 50%;
		width: 1px;
		background-color: var(--border-color);
		transform: translateX(-50%);
	}

	&::before {
		top: 0;
		height: calc(var(--spacing--xs) - var(--spacing--4xs));
	}

	&::after {
		top: calc(var(--spacing--xs) + calc(var(--spacing--3xs) + var(--spacing--4xs)));
		/** Extends the rail through the parent timeline gap when that shared value is set. */
		bottom: calc(var(--n8n--ai-activity-step-gap, 0px) * -1);
	}
}

.nestedRow:first-child .rail::before,
.nestedRow:last-child .rail::after {
	display: none;
}

.railDot {
	position: relative;
	z-index: 1;
	top: var(--spacing--xs);
	width: var(--spacing--3xs);
	height: var(--spacing--3xs);
	border-radius: 50%;
	background-color: var(--text-color--subtler);
}

.errorTooltip {
	white-space: pre-wrap;
}

.errorCallout {
	margin-top: var(--spacing--xs);
	max-width: 90%;
}
.activityErrorIcon {
	transform: translateY(1px);
}
</style>
