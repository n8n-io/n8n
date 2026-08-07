<script lang="ts" setup>
import { ref, computed } from 'vue';
import { onClickOutside } from '@vueuse/core';
import { useI18n } from '@n8n/i18n';
import { N8nButton, N8nIcon, N8nTooltip } from '@n8n/design-system';
import type { ButtonSize } from '@n8n/design-system/types';
import { round2 } from './creditFormatting';

const props = withDefaults(
	defineProps<{
		creditsRemaining?: number;
		creditsQuota?: number;
		isLowCredits: boolean;
		buttonSize?: ButtonSize;
		// Per-thread running total (decimal); optional — shared with the builder UI.
		creditsUsed?: number;
	}>(),
	{
		buttonSize: 'large',
	},
);

const emit = defineEmits<{
	'upgrade-click': [];
}>();

const i18n = useI18n();
const isOpen = ref(false);
const dropdownRef = ref<HTMLElement>();

onClickOutside(
	dropdownRef,
	() => {
		isOpen.value = false;
	},
	{ ignore: ['.n8n-tooltip'] },
);

const hasCredits = computed(() => {
	return props.creditsQuota !== undefined && props.creditsRemaining !== undefined;
});

// Usage can cross the quota (the crossing message still finishes and is billed
// in full), so remaining can go negative. Clamp at the render boundary so the
// UI never shows a negative balance regardless of caller.
const creditsRemainingDisplay = computed(() => Math.max(0, props.creditsRemaining ?? 0));

const creditsLeftText = computed(() => {
	if (props.creditsRemaining === undefined) return '';
	return i18n.baseText('aiAssistant.builder.settings.creditsLeft', {
		interpolate: { count: String(round2(creditsRemainingDisplay.value)) },
	});
});

// Hide the line when usage rounds to 0 — "used 0 credits so far" is noise.
const showThreadCreditsUsed = computed(
	() => props.creditsUsed !== undefined && round2(props.creditsUsed) > 0,
);

const threadCreditsUsedText = computed(() => {
	if (props.creditsUsed === undefined) return '';
	return i18n.baseText('aiAssistant.builder.settings.threadCreditsUsed', {
		interpolate: { count: String(round2(props.creditsUsed)) },
	});
});

const progressPercentage = computed(() => {
	if (
		props.creditsQuota === undefined ||
		props.creditsRemaining === undefined ||
		props.creditsQuota === 0
	) {
		return 0;
	}
	return (creditsRemainingDisplay.value / props.creditsQuota) * 100;
});

const getNextMonth = () => {
	const now = new Date();
	const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
	const options: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric', year: 'numeric' };
	return nextMonth.toLocaleDateString('en-US', options);
};

const tooltipContent = computed(() => {
	const date = getNextMonth();
	return i18n.baseText('aiAssistant.builder.settings.creditsTooltip', {
		interpolate: { renewalDate: date, expiryDate: date },
	});
});

function toggleDropdown() {
	isOpen.value = !isOpen.value;
}

function onGetMoreCredits() {
	emit('upgrade-click');
	isOpen.value = false;
}
</script>

<template>
	<div ref="dropdownRef" :class="$style.wrapper">
		<N8nButton
			icon="circle-dollar-sign"
			variant="ghost"
			:size="props.buttonSize"
			icon-only
			:class="{ [$style.active]: isOpen }"
			data-test-id="credits-dropdown-button"
			@click="toggleDropdown"
		/>
		<Transition name="dropdown">
			<div v-if="isOpen" :class="$style.dropdown" data-test-id="credits-dropdown">
				<div v-if="hasCredits" :class="$style.creditsSection">
					<div :class="$style.creditsHeader">
						<div :class="$style.creditsLabel">
							<span>{{ i18n.baseText('aiAssistant.builder.settings.credits') }}</span>
							<N8nTooltip :content="tooltipContent" placement="bottom" :show-after="300">
								<N8nIcon icon="info" size="small" :class="$style.infoIcon" />
							</N8nTooltip>
						</div>
						<span :class="$style.creditsCount">{{ creditsLeftText }}</span>
					</div>
					<div :class="$style.progressBar">
						<div
							:class="[$style.progressFill, { [$style.low]: isLowCredits }]"
							:style="{ width: `${progressPercentage}%` }"
						/>
					</div>
					<span
						v-if="showThreadCreditsUsed"
						:class="$style.threadCreditsUsed"
						data-test-id="credits-thread-used"
					>
						{{ threadCreditsUsedText }}
					</span>
					<N8nButton
						variant="outline"
						size="small"
						:class="$style.getMoreButton"
						data-test-id="credits-get-more"
						@click="onGetMoreCredits"
					>
						{{ i18n.baseText('aiAssistant.builder.settings.getMoreCredits') }}
					</N8nButton>
				</div>
			</div>
		</Transition>
	</div>
</template>

<style lang="scss" module>
.wrapper {
	position: relative;
	display: flex;
	align-items: center;
}

.dropdown {
	position: absolute;
	top: 100%;
	right: 0;
	z-index: 10;
	width: 201px;
	background: var(--color--background--light-3);
	border: var(--border);
	border-radius: var(--radius--lg);
	box-shadow: var(--shadow--light);
}

.creditsSection {
	padding: var(--spacing--sm);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	box-sizing: border-box;
	width: 100%;
}

.creditsHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	width: 100%;
}

.creditsLabel {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
	color: var(--color--text--shade-1);
}

.infoIcon {
	display: flex;
	color: var(--color--text--tint-1);
	cursor: pointer;
}

.creditsCount {
	font-size: var(--font-size--sm);
	color: var(--color--text--tint-1);
	margin-left: auto;
	text-align: right;
}

.threadCreditsUsed {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
}

.progressBar {
	width: 100%;
	height: 8px;
	background: var(--color--foreground);
	border-radius: var(--radius);
	overflow: hidden;
}

.progressFill {
	height: 100%;
	background: var(--color--success);
	border-radius: var(--radius);
	transition: width 0.3s ease;

	&.low {
		background: var(--color--danger);
	}
}

.active {
	background-color: light-dark(var(--color--black-alpha-100), var(--color--white-alpha-100));
}

.getMoreButton {
	width: 100%;
}
</style>

<style lang="scss" scoped>
.dropdown-enter-active {
	transition:
		opacity 0.15s ease,
		transform 0.15s ease;
}

.dropdown-leave-active {
	transition:
		opacity 0.1s ease,
		transform 0.1s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
	opacity: 0;
	transform: translateY(-4px);
}
</style>
