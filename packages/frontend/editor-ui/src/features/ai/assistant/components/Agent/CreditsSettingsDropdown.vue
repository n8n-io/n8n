<script lang="ts" setup>
import { ref, computed } from 'vue';
import { onClickOutside } from '@vueuse/core';
import { useI18n } from '@n8n/i18n';
import { N8nIconButton, N8nIcon, N8nTooltip, N8nLink } from '@n8n/design-system';

const props = defineProps<{
	creditsRemaining?: number;
	creditsQuota?: number;
	isLowCredits: boolean;
}>();

const emit = defineEmits<{
	'upgrade-click': [];
}>();

const i18n = useI18n();
const isOpen = ref(false);
const dropdownRef = ref<HTMLElement>();

onClickOutside(dropdownRef, () => {
	isOpen.value = false;
});

const hasCredits = computed(() => {
	return props.creditsQuota !== undefined && props.creditsRemaining !== undefined;
});

const creditsLeftText = computed(() => {
	if (props.creditsRemaining === undefined) return '';
	return i18n.baseText('aiAssistant.builder.settings.creditsLeft', {
		interpolate: { count: String(props.creditsRemaining) },
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
	return (props.creditsRemaining / props.creditsQuota) * 100;
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
		<N8nIconButton
			icon="sliders-horizontal"
			variant="ghost"
			size="large"
			data-test-id="credits-settings-button"
			@click="toggleDropdown"
		/>
		<Transition name="dropdown">
			<div v-if="isOpen" :class="$style.dropdown" data-test-id="credits-settings-dropdown">
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
					<N8nLink
						:class="$style.getMoreLink"
						size="small"
						theme="text"
						data-test-id="credits-get-more"
						@click="onGetMoreCredits"
					>
						{{ i18n.baseText('aiAssistant.builder.settings.getMoreCredits') }}
					</N8nLink>
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
	color: var(--color--text--tint-1);
	cursor: pointer;
}

.creditsCount {
	font-size: var(--font-size--sm);
	color: var(--color--text--tint-1);
	margin-left: auto;
	text-align: right;
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

.getMoreLink {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 100%;
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border: var(--border);
	border-radius: var(--radius);
	font-size: var(--font-size--2xs);
	box-sizing: border-box;
	cursor: pointer;

	&:hover {
		background: var(--color--foreground--tint-2);
	}
}
</style>

<style lang="scss" scoped>
.dropdown-enter-active,
.dropdown-leave-active {
	transition:
		opacity 0.15s ease,
		transform 0.15s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
	opacity: 0;
	transform: translateY(-4px);
}
</style>
