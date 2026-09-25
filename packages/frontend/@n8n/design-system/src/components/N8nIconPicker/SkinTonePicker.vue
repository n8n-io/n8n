<script lang="ts" setup>
import { computed, nextTick, ref } from 'vue';

import { useI18n } from '../../composables/useI18n';
import N8nButton from '../N8nButton';
import N8nPopover from '../N8nPopover';
import N8nToggle from '../N8nToggle';
import N8nToggleGroup from '../N8nToggleGroup';

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
		align="start"
		:content-class="$style.popover"
		:enable-scrolling="false"
	>
		<template #trigger>
			<N8nButton
				:class="$style.triggerButton"
				variant="outline"
				size="medium"
				icon-only
				:aria-label="t('iconPicker.skinTone.selectSkinTone')"
				data-test-id="emoji-skin-tone-trigger"
			>
				<span :class="$style.triggerEmoji">{{ displayEmoji }}</span>
			</N8nButton>
		</template>
		<template #content>
			<N8nToggleGroup
				:model-value="model"
				variant="ghost"
				:aria-label="t('iconPicker.skinTone.tooltip')"
				data-test-id="emoji-skin-tone-popover"
			>
				<template #default="slotProps">
					<N8nToggle
						v-for="tone in tones"
						:key="tone.index"
						:value="tone.index"
						:label="t(tone.labelKey)"
						:data-test-id="`skin-tone-${tone.index}`"
						:show-tooltip="false"
						v-bind="slotProps"
						@click="selectTone(tone.index)"
					>
						<span :class="$style.toneEmoji">{{ tone.emoji }}</span>
					</N8nToggle>
				</template>
			</N8nToggleGroup>
		</template>
	</N8nPopover>
</template>

<style module lang="scss">
.popover {
	padding: var(--spacing--4xs);
}
.triggerEmoji {
	font-size: var(--font-size--lg);
}

.toneEmoji {
	font-size: var(--font-size--xl);
}
</style>
