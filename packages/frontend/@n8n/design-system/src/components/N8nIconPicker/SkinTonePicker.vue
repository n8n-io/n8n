<script lang="ts" setup>
import { computed, nextTick, ref } from 'vue';

import { useI18n } from '../../composables/useI18n';
import N8nButton from '../N8nButton';
import N8nPopover from '../N8nPopover';

defineOptions({ name: 'SkinTonePicker' });

const { t } = useI18n();

const model = defineModel<number>({ default: 0 });
const isOpen = ref(false);

// Use 🖐️ (raised hand with fingers splayed) because it is an
// Emoji_Modifier_Base and its large skin area makes the color difference
// between tones immediately obvious at small sizes.
// Important: use pre-composed literal strings — do NOT build via concatenation,
// as that causes the skin tone modifier to render as a separate colored square.
const tones = [
	{ index: 0, emoji: '🖐️', labelKey: 'iconPicker.skinTone.default' },
	{ index: 1, emoji: '🖐🏻', labelKey: 'iconPicker.skinTone.light' },
	{ index: 2, emoji: '🖐🏼', labelKey: 'iconPicker.skinTone.mediumLight' },
	{ index: 3, emoji: '🖐🏽', labelKey: 'iconPicker.skinTone.medium' },
	{ index: 4, emoji: '🖐🏾', labelKey: 'iconPicker.skinTone.mediumDark' },
	{ index: 5, emoji: '🖐🏿', labelKey: 'iconPicker.skinTone.dark' },
] as const;

const displayEmoji = computed(() => tones[model.value]?.emoji ?? tones[0].emoji);

async function selectTone(index: number) {
	model.value = index;
	// Wait for model update to propagate to parent before closing popover
	await nextTick();
	isOpen.value = false;
}

defineExpose({ isOpen });
</script>

<template>
	<N8nPopover
		v-model:open="isOpen"
		side="bottom"
		align="end"
		:enable-scrolling="false"
		:suppress-auto-focus="true"
		:teleported="false"
	>
		<template #trigger>
			<N8nButton
				:class="$style.triggerButton"
				type="tertiary"
				size="medium"
				:square="true"
				:aria-label="t('iconPicker.skinTone.selectSkinTone')"
				data-test-id="emoji-skin-tone-trigger"
			>
				<span :class="$style.triggerEmoji">{{ displayEmoji }}</span>
			</N8nButton>
		</template>
		<template #content>
			<div
				:class="$style.toneRow"
				role="radiogroup"
				:aria-label="t('iconPicker.skinTone.tooltip')"
				data-test-id="emoji-skin-tone-popover"
			>
				<button
					v-for="tone in tones"
					:key="tone.index"
					:class="[$style.toneSwatch, { [$style.active]: model === tone.index }]"
					type="button"
					role="radio"
					:aria-checked="model === tone.index"
					:aria-label="t(tone.labelKey)"
					:title="t(tone.labelKey)"
					:data-test-id="`skin-tone-${tone.index}`"
					@click="selectTone(tone.index)"
				>
					<span :class="$style.toneEmoji">{{ tone.emoji }}</span>
				</button>
			</div>
		</template>
	</N8nPopover>
</template>

<style module lang="scss">
.triggerButton {
	display: inline-flex !important;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	padding: 0 !important;
}

.triggerEmoji {
	font-size: 18px;
	line-height: 1;
	font-family:
		'Segoe UI Emoji', 'Segoe UI Symbol', 'Segoe UI', 'Apple Color Emoji', 'Twemoji Mozilla',
		'Noto Color Emoji', 'Android Emoji', sans-serif;
}

.toneRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: var(--spacing--2xs);
}

.toneSwatch {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 34px;
	height: 34px;
	padding: 0;
	border: 2px solid transparent;
	border-radius: var(--radius--sm);
	cursor: pointer;
	background: none;
	transition:
		border-color 0.15s ease,
		background-color 0.15s ease;

	&:hover {
		background-color: var(--color--background--shade-1);
	}

	&.active {
		border-color: var(--color--primary);
	}
}

.toneEmoji {
	font-size: 20px;
	line-height: 1;
	font-family:
		'Segoe UI Emoji', 'Segoe UI Symbol', 'Segoe UI', 'Apple Color Emoji', 'Twemoji Mozilla',
		'Noto Color Emoji', 'Android Emoji', sans-serif;
}
</style>
