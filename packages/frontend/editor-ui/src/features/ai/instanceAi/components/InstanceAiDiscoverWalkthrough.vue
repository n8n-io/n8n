<script lang="ts" setup>
import {
	computed,
	nextTick,
	onUnmounted,
	ref,
	shallowRef,
	useId,
	useTemplateRef,
	watch,
	watchEffect,
} from 'vue';
import { useRouter } from 'vue-router';
import { useEventListener } from '@vueuse/core';
import {
	N8nButton,
	N8nHeading,
	N8nIcon,
	N8nIconButton,
	N8nText,
	type IconName,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { INSTANCE_AI_SETTINGS_VIEW } from '../constants';
import {
	ENABLE_ONBOARDING_RELOCATION_ANIMATION,
	ONBOARDING_HIGHLIGHT_RING_ENTRANCE_EASING,
	ONBOARDING_HIGHLIGHT_RING_ENTRANCE_MS,
	ONBOARDING_HIGHLIGHT_RING_ENTRANCE_SCALE_FROM,
	ONBOARDING_RELOCATION_ENABLE_TRANSITION_RAF_FRAMES,
	ONBOARDING_RELOCATION_TRANSITION_EASING,
	ONBOARDING_RELOCATION_TRANSITION_MS,
	ONBOARDING_RELOCATION_TRANSITION_PROPERTIES,
} from './instanceAiDiscoverWalkthrough.animation';
import type { InstanceAiDiscoverHighlightTargets } from './instanceAiDiscoverWalkthrough.types';
import { useInstanceAiSettingsStore } from '../instanceAiSettings.store';
import LocalGatewayConnectionPanel from './settings/LocalGatewayConnectionPanel.vue';

const open = defineModel<boolean>({ default: false });

const props = defineProps<{
	highlightTargets: InstanceAiDiscoverHighlightTargets;
}>();

const i18n = useI18n();
const router = useRouter();
const settingsStore = useInstanceAiSettingsStore();

const spotlightMaskId = `instance-ai-discover-spot-${useId().replace(/:/g, '')}`;

const STEP_KEYS = [
	'welcome',
	'chatThreads',
	'automation',
	'research',
	'memoryArtifacts',
	'localGateway',
	'settings',
] as const;

const stepIndex = ref(0);

const totalSteps = STEP_KEYS.length;

const currentStepKey = computed(() => STEP_KEYS[stepIndex.value] ?? STEP_KEYS[0]);

const isWelcomeStep = computed(() => currentStepKey.value === 'welcome');

const DISCOVER_STEP_TITLE_ICONS: Partial<Record<(typeof STEP_KEYS)[number], IconName>> = {
	chatThreads: 'messages-square',
	automation: 'wrench',
	research: 'search',
	memoryArtifacts: 'brain',
	localGateway: 'hard-drive',
	settings: 'settings',
};

const discoverTitleStepIcon = computed(
	(): IconName | null => DISCOVER_STEP_TITLE_ICONS[currentStepKey.value] ?? null,
);

const titleClusterAlignsLeadingIcon = computed(
	() => isWelcomeStep.value || discoverTitleStepIcon.value !== null,
);

// Style constants
const DISCOVER_STEP_TITLE_ICON_PX = 16;
const DISCOVER_CARD_BASE_MAX_WIDTH_PX = Math.round(520 * 1.15);
const DISCOVER_WELCOME_CARD_WIDTH_MULTIPLIER = 1.2;
const DISCOVER_LOCAL_GATEWAY_CARD_WIDTH_MULTIPLIER = 1.3;

function centeredCardWidthPx(vw: number): number {
	const maxUsable = vw - 32;
	const base = Math.min(DISCOVER_CARD_BASE_MAX_WIDTH_PX, maxUsable);
	if (isWelcomeStep.value) {
		return Math.min(Math.round(base * DISCOVER_WELCOME_CARD_WIDTH_MULTIPLIER), maxUsable);
	}
	if (currentStepKey.value === 'localGateway') {
		return Math.min(Math.round(base * DISCOVER_LOCAL_GATEWAY_CARD_WIDTH_MULTIPLIER), maxUsable);
	}
	return base;
}

// Progress bar
const progressFillPercent = computed(() => ((stepIndex.value + 1) / totalSteps) * 100);
const progressSeparatorPositions = computed(() =>
	Array.from({ length: totalSteps - 1 }, (_, i) => ((i + 1) / totalSteps) * 100),
);

// Elements highlighting
type HighlightPlacement = 'sidebar' | 'input' | 'research' | 'memory';

const highlightSpec = computed((): { el: HTMLElement; placement: HighlightPlacement } | null => {
	const key = currentStepKey.value;
	if (key === 'chatThreads' && props.highlightTargets.sidebar) {
		return { el: props.highlightTargets.sidebar, placement: 'sidebar' };
	}
	if (key === 'automation' && props.highlightTargets.chatInput) {
		return { el: props.highlightTargets.chatInput, placement: 'input' };
	}
	if (key === 'research' && props.highlightTargets.researchToggle) {
		return { el: props.highlightTargets.researchToggle, placement: 'research' };
	}
	if (key === 'memoryArtifacts' && props.highlightTargets.memoryButton) {
		return { el: props.highlightTargets.memoryButton, placement: 'memory' };
	}
	return null;
});

type PlainRect = { top: number; left: number; width: number; height: number };

const HOLE_PADDING_PX = 6;

function measurePlain(el: HTMLElement, pad: number): PlainRect {
	const r = el.getBoundingClientRect();
	return {
		top: r.top - pad,
		left: r.left - pad,
		width: r.width + 2 * pad,
		height: r.height + 2 * pad,
	};
}

const holeRect = shallowRef<PlainRect | null>(null);
const holeCornerRadiusPx = ref(0);
const viewportW = ref(0);
const viewportH = ref(0);

function updateViewportSize() {
	if (typeof window === 'undefined') return;
	viewportW.value = window.innerWidth;
	viewportH.value = window.innerHeight;
}

function parseCssLengthPxFirst(value: string): number {
	const token = value.trim().split(/\s+/)[0] ?? '';
	const px = /^([\d.]+)px$/i.exec(token);
	if (px) return Number.parseFloat(px[1]);
	const num = /^([\d.]+)$/.exec(token);
	if (num) return Number.parseFloat(num[1]);
	return 0;
}

function syncHole() {
	updateViewportSize();
	if (!open.value) {
		holeRect.value = null;
		holeCornerRadiusPx.value = 0;
		return;
	}
	const spec = highlightSpec.value;
	if (!spec?.el) {
		holeRect.value = null;
		holeCornerRadiusPx.value = 0;
		return;
	}
	const pad = spec.placement === 'sidebar' ? 0 : HOLE_PADDING_PX;
	holeRect.value = measurePlain(spec.el, pad);
	holeCornerRadiusPx.value = 0;
	if (spec.placement === 'input') {
		const raw = parseCssLengthPxFirst(getComputedStyle(spec.el).borderTopLeftRadius);
		const h = holeRect.value;
		if (h && raw > 0) {
			holeCornerRadiusPx.value = Math.min(raw, h.width / 2, h.height / 2);
		}
	}
}

const useSpotlight = computed(
	() => open.value && highlightSpec.value !== null && holeRect.value !== null,
);

const shadeGeometries = computed(() => {
	const h = holeRect.value;
	if (!h) return null;
	const vw = viewportW.value || (typeof window !== 'undefined' ? window.innerWidth : 0);
	const vh = viewportH.value || (typeof window !== 'undefined' ? window.innerHeight : 0);
	const { top, left, width, height } = h;
	const right = left + width;
	const bottom = top + height;
	return {
		top: { top: 0, left: 0, width: vw, height: Math.max(0, top) },
		bottom: { top: bottom, left: 0, width: vw, height: Math.max(0, vh - bottom) },
		left: { top, left: 0, width: Math.max(0, left), height },
		right: { top, left: right, width: Math.max(0, vw - right), height },
	};
});

const useSvgRoundedSpotlightDim = computed(
	() =>
		open.value &&
		currentStepKey.value === 'automation' &&
		holeCornerRadiusPx.value > 0 &&
		holeRect.value !== null,
);

const ringStyle = computed(() => {
	const h = holeRect.value;
	if (!h) return {};
	const style: Record<string, string> = {
		top: `${h.top}px`,
		left: `${h.left}px`,
		width: `${h.width}px`,
		height: `${h.height}px`,
	};
	if (currentStepKey.value === 'chatThreads') {
		style.borderRadius = '0';
	} else if (currentStepKey.value === 'automation' && holeCornerRadiusPx.value > 0) {
		style.borderRadius = `${holeCornerRadiusPx.value}px`;
	}
	return style;
});

// Highlight ring entrance animation
const highlightRingEntranceStyle = computed((): Record<string, string> => {
	const ms = ONBOARDING_HIGHLIGHT_RING_ENTRANCE_MS;
	if (ms <= 0) return {};
	return {
		'--size--discover-highlight-ring-scale-from': String(
			ONBOARDING_HIGHLIGHT_RING_ENTRANCE_SCALE_FROM,
		),
		animationName: 'instance-ai-discover-highlight-ring-entrance',
		animationDuration: `${ms}ms`,
		animationTimingFunction: ONBOARDING_HIGHLIGHT_RING_ENTRANCE_EASING,
		animationFillMode: 'both',
		transformOrigin: 'center center',
	};
});

const cardRef = useTemplateRef<HTMLElement>('cardRef');

const cardPosition = ref({ top: 16, left: 16, width: DISCOVER_CARD_BASE_MAX_WIDTH_PX });

const suppressRelocationTransition = ref(true);

function scheduleEnableRelocationTransition() {
	if (!ENABLE_ONBOARDING_RELOCATION_ANIMATION) {
		suppressRelocationTransition.value = false;
		return;
	}
	const frames = ONBOARDING_RELOCATION_ENABLE_TRANSITION_RAF_FRAMES;
	const finish = (remaining: number) => {
		if (remaining <= 0) {
			suppressRelocationTransition.value = false;
			return;
		}
		requestAnimationFrame(() => finish(remaining - 1));
	};
	finish(frames);
}

function layoutCenteredCard() {
	if (!open.value) return;
	const vw = window.innerWidth;
	const vh = window.innerHeight;
	const cardW = centeredCardWidthPx(vw);
	const cardH = cardRef.value?.getBoundingClientRect().height ?? 380;
	const left = Math.max(16, (vw - cardW) / 2);
	const top = Math.max(16, Math.min((vh - cardH) / 2, vh - cardH - 16));
	cardPosition.value = { top, left, width: cardW };
}

function layoutCard() {
	if (!open.value) return;
	if (useSpotlight.value) {
		layoutFloatingCard();
	} else {
		layoutCenteredCard();
	}
}

function layoutFloatingCard() {
	if (!open.value || !useSpotlight.value || !holeRect.value) return;
	const spec = highlightSpec.value;
	const h = holeRect.value;
	if (!spec) return;

	const vw = window.innerWidth;
	const vh = window.innerHeight;
	const cardW = Math.min(DISCOVER_CARD_BASE_MAX_WIDTH_PX, vw - 32);
	const cardH = cardRef.value?.getBoundingClientRect().height ?? 380;
	const pad = 16;

	const hl = h.left;
	const ht = h.top;
	const hw = h.width;
	const hh = h.height;
	const hb = ht + hh;
	const hr = hl + hw;

	let top = pad;
	let left = pad;

	switch (spec.placement) {
		case 'sidebar': {
			left = hr + pad;
			if (left + cardW > vw - pad) {
				left = hl - cardW - pad;
			}
			left = Math.max(pad, Math.min(left, vw - cardW - pad));
			top = ht + hh / 2 - cardH / 2;
			break;
		}
		case 'input':
		case 'research': {
			top = ht - cardH - pad;
			if (top < pad) {
				top = hb + pad;
			}
			top = Math.max(pad, Math.min(top, vh - cardH - pad));
			left = hl + hw / 2 - cardW / 2;
			left = Math.max(pad, Math.min(left, vw - cardW - pad));
			break;
		}
		case 'memory': {
			top = hb + pad;
			if (top + cardH > vh - pad) {
				top = ht - cardH - pad;
			}
			top = Math.max(pad, Math.min(top, vh - cardH - pad));
			left = hr - cardW;
			left = Math.max(pad, Math.min(left, vw - cardW - pad));
			break;
		}
	}

	cardPosition.value = { top, left, width: cardW };
}

const cardLayoutStyle = computed(() => {
	const { top, left, width } = cardPosition.value;
	return {
		position: 'fixed' as const,
		top: `${top}px`,
		left: `${left}px`,
		width: `${width}px`,
		maxHeight: 'min(90vh, 640px)',
	};
});

const relocationTransitionStyle = computed(() => {
	if (!ENABLE_ONBOARDING_RELOCATION_ANIMATION || suppressRelocationTransition.value) {
		return { transition: 'none' };
	}
	return {
		transitionProperty: ONBOARDING_RELOCATION_TRANSITION_PROPERTIES,
		transitionDuration: `${ONBOARDING_RELOCATION_TRANSITION_MS}ms`,
		transitionTimingFunction: ONBOARDING_RELOCATION_TRANSITION_EASING,
	};
});

function titleKey(step: (typeof STEP_KEYS)[number]) {
	return `instanceAi.discover.steps.${step}.title` as const;
}

function bodyKey(step: (typeof STEP_KEYS)[number]) {
	return `instanceAi.discover.steps.${step}.body` as const;
}

const discoverLocalGatewayUserEnabled = ref(false);
const isEnablingLocalGateway = ref(false);

const isFilesystemDisabledForDiscover = computed(() => {
	if (settingsStore.preferencesDraft.filesystemDisabled !== undefined) {
		return settingsStore.preferencesDraft.filesystemDisabled;
	}
	return settingsStore.preferences?.filesystemDisabled ?? false;
});

const showLocalGatewayConnectionPanel = computed(
	() => !isFilesystemDisabledForDiscover.value || discoverLocalGatewayUserEnabled.value,
);

watch(currentStepKey, (key) => {
	if (key !== 'localGateway') {
		discoverLocalGatewayUserEnabled.value = false;
	}
});

async function ensureGatewayProbesForDiscover() {
	await settingsStore.refreshModuleSettings().catch(() => {});
	if (!settingsStore.isLocalGatewayDisabled) {
		settingsStore.startDaemonProbing();
		settingsStore.startGatewayPushListener();
		settingsStore.pollGatewayStatus();
	}
	if (!settingsStore.isGatewayConnected) {
		void settingsStore.fetchSetupCommand();
	}
}

watch(
	() => [open.value, currentStepKey.value, showLocalGatewayConnectionPanel.value] as const,
	([isOpen, key, showPanel]) => {
		if (!isOpen || key !== 'localGateway' || !showPanel) return;
		void ensureGatewayProbesForDiscover();
	},
);

async function onDiscoverEnableLocalGateway() {
	if (!settingsStore.preferences) {
		await settingsStore.fetch().catch(() => {});
	}
	settingsStore.setPreferenceField('filesystemDisabled', false);
	isEnablingLocalGateway.value = true;
	await settingsStore.save();
	isEnablingLocalGateway.value = false;
	if (Object.keys(settingsStore.preferencesDraft).length > 0) {
		return;
	}
	discoverLocalGatewayUserEnabled.value = true;
	await ensureGatewayProbesForDiscover();
}

function onDiscoverSkipLocalGateway() {
	next();
}

watch(open, (isOpen) => {
	if (!isOpen) {
		suppressRelocationTransition.value = true;
		return;
	}
	stepIndex.value = 0;
	suppressRelocationTransition.value = true;
});

function close() {
	open.value = false;
}

function next() {
	if (stepIndex.value < totalSteps - 1) {
		stepIndex.value += 1;
	} else {
		close();
	}
}

function prev() {
	if (stepIndex.value > 0) {
		stepIndex.value -= 1;
	}
}

function goToSettings() {
	close();
	void router.push({ name: INSTANCE_AI_SETTINGS_VIEW });
}

watchEffect((onCleanup) => {
	if (!open.value) return;
	const el = highlightSpec.value?.el;
	if (!el) return;
	const ro = new ResizeObserver(() => {
		syncHole();
		void nextTick(() => layoutCard());
	});
	ro.observe(el);
	onCleanup(() => ro.disconnect());
});

useEventListener(
	document,
	'scroll',
	() => {
		if (!open.value) return;
		syncHole();
		void nextTick(() => layoutCard());
	},
	true,
);

useEventListener(window, 'resize', () => {
	if (!open.value) return;
	syncHole();
	void nextTick(() => layoutCard());
});

watch(
	[open, stepIndex, () => props.highlightTargets],
	async () => {
		if (!open.value) return;
		syncHole();
		await nextTick();
		layoutCard();
		await nextTick();
		if (suppressRelocationTransition.value) {
			scheduleEnableRelocationTransition();
		}
	},
	{ flush: 'post' },
);

let cardLayoutRo: ResizeObserver | null = null;
watch(
	[open, () => cardRef.value],
	() => {
		cardLayoutRo?.disconnect();
		cardLayoutRo = null;
		if (!open.value || !cardRef.value) return;
		cardLayoutRo = new ResizeObserver(() => {
			void nextTick(() => layoutCard());
		});
		cardLayoutRo.observe(cardRef.value);
	},
	{ flush: 'post' },
);

onUnmounted(() => {
	cardLayoutRo?.disconnect();
});
</script>

<template>
	<Teleport to="body">
		<Transition name="discover-fade">
			<div
				v-if="open"
				:class="$style.layerRoot"
				data-test-id="instance-ai-discover-backdrop"
				role="dialog"
				aria-modal="true"
				:aria-labelledby="'instance-ai-discover-title'"
			>
				<!-- Spotlight: dim only outside the focused element's hole -->
				<template v-if="useSpotlight && holeRect">
					<!-- Step 3 (chat input): SVG mask so dim follows the same radius as the input. -->
					<svg
						v-if="useSvgRoundedSpotlightDim"
						:class="$style.spotSvg"
						:viewBox="`0 0 ${viewportW} ${viewportH}`"
						preserveAspectRatio="none"
					>
						<defs>
							<mask
								:id="spotlightMaskId"
								maskUnits="userSpaceOnUse"
								maskContentUnits="userSpaceOnUse"
							>
								<rect :width="viewportW" :height="viewportH" fill="white" />
								<rect
									:x="holeRect.left"
									:y="holeRect.top"
									:width="holeRect.width"
									:height="holeRect.height"
									:rx="holeCornerRadiusPx"
									:ry="holeCornerRadiusPx"
									fill="black"
								/>
							</mask>
						</defs>
						<rect
							:width="viewportW"
							:height="viewportH"
							fill="rgba(0, 0, 0, 0.45)"
							:mask="`url(#${spotlightMaskId})`"
							@click="close"
						/>
					</svg>
					<template v-else-if="shadeGeometries">
						<div
							:class="$style.shade"
							:style="{
								top: `${shadeGeometries.top.top}px`,
								left: `${shadeGeometries.top.left}px`,
								width: `${shadeGeometries.top.width}px`,
								height: `${shadeGeometries.top.height}px`,
							}"
							@click="close"
						/>
						<div
							:class="$style.shade"
							:style="{
								top: `${shadeGeometries.bottom.top}px`,
								left: `${shadeGeometries.bottom.left}px`,
								width: `${shadeGeometries.bottom.width}px`,
								height: `${shadeGeometries.bottom.height}px`,
							}"
							@click="close"
						/>
						<div
							:class="$style.shade"
							:style="{
								top: `${shadeGeometries.left.top}px`,
								left: `${shadeGeometries.left.left}px`,
								width: `${shadeGeometries.left.width}px`,
								height: `${shadeGeometries.left.height}px`,
							}"
							@click="close"
						/>
						<div
							:class="$style.shade"
							:style="{
								top: `${shadeGeometries.right.top}px`,
								left: `${shadeGeometries.right.left}px`,
								width: `${shadeGeometries.right.width}px`,
								height: `${shadeGeometries.right.height}px`,
							}"
							@click="close"
						/>
					</template>
					<div :key="currentStepKey" :class="$style.highlightRingWrap" :style="ringStyle">
						<div :class="$style.highlightRing" :style="highlightRingEntranceStyle" />
					</div>
				</template>

				<!-- Full dim when no element to spotlight -->
				<div v-else :class="$style.fullDim" @click.self="close" />

				<div
					ref="cardRef"
					:class="$style.card"
					:style="[cardLayoutStyle, relocationTransitionStyle]"
					data-test-id="instance-ai-discover-dialog"
					@click.stop
				>
					<div
						v-if="stepIndex > 0"
						:class="$style.progressBar"
						role="progressbar"
						:aria-valuenow="stepIndex + 1"
						aria-valuemin="1"
						:aria-valuemax="totalSteps"
						:aria-label="
							i18n.baseText('instanceAi.discover.stepProgress', {
								interpolate: {
									current: String(stepIndex + 1),
									total: String(totalSteps),
								},
							})
						"
						data-test-id="instance-ai-discover-progress"
					>
						<div :class="$style.progressTrack">
							<div :class="$style.progressFill" :style="{ width: `${progressFillPercent}%` }" />
						</div>
						<div :class="$style.progressSeparators" aria-hidden="true">
							<span
								v-for="(pct, idx) in progressSeparatorPositions"
								:key="idx"
								:class="$style.progressSeparator"
								:style="{ left: `${pct}%` }"
							/>
						</div>
					</div>

					<div :class="$style.cardHeader">
						<div
							:class="[
								$style.titleCluster,
								titleClusterAlignsLeadingIcon && $style.titleClusterWithLeadingIcon,
							]"
						>
							<span v-if="isWelcomeStep" :class="$style.titleIconWrap">
								<N8nIcon icon="sparkles" :size="24" aria-hidden="true" />
							</span>
							<span v-else-if="discoverTitleStepIcon" :class="$style.titleIconWrap">
								<N8nIcon
									:icon="discoverTitleStepIcon"
									:size="DISCOVER_STEP_TITLE_ICON_PX"
									aria-hidden="true"
								/>
							</span>
							<N8nHeading
								id="instance-ai-discover-title"
								tag="h2"
								size="large"
								bold
								:class="$style.dialogTitle"
							>
								{{ i18n.baseText(titleKey(currentStepKey)) }}
							</N8nHeading>
						</div>
						<N8nIconButton
							icon="x"
							variant="ghost"
							size="small"
							:aria-label="i18n.baseText('instanceAi.discover.close')"
							data-test-id="instance-ai-discover-close"
							@click="close"
						/>
					</div>

					<div :class="$style.stepBody">
						<N8nText color="text-base" :class="$style.stepText">
							{{ i18n.baseText(bodyKey(currentStepKey)) }}
						</N8nText>
						<LocalGatewayConnectionPanel
							v-if="currentStepKey === 'localGateway' && showLocalGatewayConnectionPanel"
							variant="onboarding"
						/>
					</div>

					<div :class="$style.footer">
						<N8nButton
							v-if="stepIndex > 0"
							:class="[$style.footerActionButton, $style.footerCornerLeft]"
							variant="outline"
							size="medium"
							data-test-id="instance-ai-discover-prev"
							@click="prev"
						>
							{{ i18n.baseText('instanceAi.discover.back') }}
						</N8nButton>
						<template v-if="currentStepKey === 'localGateway' && !showLocalGatewayConnectionPanel">
							<N8nButton
								:class="$style.footerActionButton"
								variant="outline"
								size="medium"
								data-test-id="instance-ai-discover-local-gateway-skip"
								@click="onDiscoverSkipLocalGateway"
							>
								{{ i18n.baseText('instanceAi.discover.localGateway.skip') }}
							</N8nButton>
							<N8nButton
								:class="[$style.footerActionButton, $style.footerCornerRight]"
								size="medium"
								:loading="isEnablingLocalGateway"
								:disabled="isEnablingLocalGateway"
								data-test-id="instance-ai-discover-local-gateway-enable"
								@click="onDiscoverEnableLocalGateway"
							>
								{{ i18n.baseText('instanceAi.discover.localGateway.enable') }}
							</N8nButton>
						</template>
						<template v-else>
							<N8nButton
								v-if="currentStepKey === 'settings'"
								:class="$style.footerActionButton"
								variant="outline"
								size="medium"
								data-test-id="instance-ai-discover-open-settings"
								@click="goToSettings"
							>
								{{ i18n.baseText('instanceAi.discover.openSettings') }}
							</N8nButton>
							<N8nButton
								:class="[
									$style.footerActionButton,
									stepIndex === 0 ? $style.footerActionButtonFullWidth : $style.footerCornerRight,
								]"
								size="medium"
								data-test-id="instance-ai-discover-next"
								@click="next"
							>
								{{
									stepIndex >= totalSteps - 1
										? i18n.baseText('instanceAi.discover.done')
										: isWelcomeStep
											? i18n.baseText('instanceAi.discover.steps.welcome.cta')
											: i18n.baseText('instanceAi.discover.next')
								}}
							</N8nButton>
						</template>
					</div>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<style lang="scss" module>
.layerRoot {
	position: fixed;
	inset: 0;
	z-index: 2000;
	pointer-events: none;
}

.shade {
	position: fixed;
	background: rgba(0, 0, 0, 0.45);
	pointer-events: auto;
	z-index: 0;
}

.spotSvg {
	position: fixed;
	inset: 0;
	width: 100%;
	height: 100%;
	z-index: 0;
	pointer-events: none;
}

.spotSvg rect[mask] {
	pointer-events: auto;
	cursor: default;
}

.highlightRingWrap {
	position: fixed;
	z-index: 1;
	pointer-events: none;
	box-sizing: border-box;
	border-radius: var(--radius--lg);
}

.highlightRing {
	position: absolute;
	inset: 0;
	box-sizing: border-box;
	border: 2px solid var(--color--primary);
	border-radius: inherit;
	box-shadow:
		0 0 0 1px color-mix(in srgb, var(--color--primary) 35%, transparent),
		0 0 24px color-mix(in srgb, var(--color--primary) 25%, transparent);
}

.fullDim {
	position: fixed;
	inset: 0;
	z-index: 0;
	background: rgba(0, 0, 0, 0.45);
	pointer-events: auto;
}

.card {
	display: flex;
	flex-direction: column;
	background: var(--color--background);
	border: var(--border);
	border-radius: var(--radius--lg);
	box-shadow: 0 24px 48px rgba(0, 0, 0, 0.18);
	pointer-events: auto;
	z-index: 2;
	overflow: hidden;
}

.progressBar {
	position: relative;
	width: 100%;
	height: var(--spacing--4xs);
	flex-shrink: 0;
}

.progressTrack {
	position: absolute;
	inset: 0;
	background: color-mix(in srgb, var(--color--background) 88%, var(--color--foreground));
}

.progressFill {
	height: 100%;
	background: #fff;
	box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--color--foreground) 18%, transparent);
	transition: width 0.2s ease;
}

.progressSeparators {
	position: absolute;
	inset: 0;
	pointer-events: none;
}

.progressSeparator {
	position: absolute;
	top: 0;
	bottom: 0;
	width: 1px;
	transform: translateX(-50%);
	background: color-mix(in srgb, var(--color--foreground) 14%, transparent);
}

.cardHeader {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: var(--spacing--sm);
	padding: var(--spacing--md) var(--spacing--md) 0;
}

.titleCluster {
	display: flex;
	flex: 1;
	align-items: flex-start;
	gap: var(--spacing--sm);
	min-width: 0;
}

.titleClusterWithLeadingIcon {
	align-items: center;
	gap: var(--spacing--2xs);
}

.titleIconWrap {
	flex-shrink: 0;
	display: inline-flex;
	align-items: center;

	/* `N8nIcon` renders an SVG root; module classes on the component do not reliably set its color. */
	:deep(.n8n-icon) {
		color: #fff;
	}
}

.dialogTitle {
	flex: 1;
	min-width: 0;
	color: var(--color--text);
}

.stepBody {
	flex: 1;
	min-height: 0;
	overflow-y: auto;
	padding: var(--spacing--md);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.stepText {
	font-size: var(--font-size--md);
	line-height: var(--line-height--xl);
	white-space: pre-wrap;
}

.footer {
	display: flex;
	flex-wrap: nowrap;
	align-items: stretch;
	justify-content: flex-start;
	gap: 0;
	padding: 0;
	flex-shrink: 0;
	width: 100%;
	margin-top: 10px;
}

.footerActionButton:global(.button) {
	--button--height: 42px;
	flex: 1 1 0;
	width: auto;
	min-width: 0;
	max-width: none;
	height: 42px;
	min-height: 42px;
	max-height: 42px;
	box-sizing: border-box;
	border-radius: 0;
}

.footerCornerLeft:global(.button) {
	border-bottom-left-radius: var(--radius--lg);
}

.footerCornerRight:global(.button) {
	border-bottom-right-radius: var(--radius--lg);
}

.footerActionButtonFullWidth:global(.button) {
	flex: 1 1 100%;
	width: 100%;
	min-width: 0;
	max-width: none;
	border-bottom-left-radius: var(--radius--lg);
	border-bottom-right-radius: var(--radius--lg);
}
</style>

<style lang="scss">
.discover-fade-enter-active,
.discover-fade-leave-active {
	transition: opacity 0.2s ease;
}

.discover-fade-enter-from,
.discover-fade-leave-to {
	opacity: 0;
}

@keyframes instance-ai-discover-highlight-ring-entrance {
	from {
		opacity: 0;
		transform: scale(var(--size--discover-highlight-ring-scale-from, 0.97));
	}

	to {
		opacity: 1;
		transform: scale(1);
	}
}
</style>
