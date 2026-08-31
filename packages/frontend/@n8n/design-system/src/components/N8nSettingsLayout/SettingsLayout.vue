<script setup lang="ts">
import N8nButton from '../N8nButton';
import N8nIcon from '../N8nIcon';

export type SettingsLayoutSize = 'narrow' | 'wide';

export interface SettingsLayoutProps {
	/** Element/component to render as the layout container. */
	tag?: string;
	/** Show the ghost back action pinned to the top-left of the page. */
	showBack?: boolean;
	/** Label for the back action. */
	backLabel?: string;
	/**
	 * Content width. `narrow` (default) caps the column at 720px for form-style
	 * pages. `wide` lets tables and lists span the padded container; the page
	 * header stays capped at 720px and left-aligns with the table.
	 */
	size?: SettingsLayoutSize;
}

defineOptions({ name: 'N8nSettingsLayout' });

withDefaults(defineProps<SettingsLayoutProps>(), {
	tag: 'div',
	showBack: false,
	backLabel: 'Back',
	size: 'narrow',
});

const emit = defineEmits<{ back: [] }>();
</script>

<template>
	<component :is="tag" :class="$style.layout">
		<div v-if="showBack || $slots.back" :class="$style.backRow">
			<slot name="back">
				<N8nButton
					variant="ghost"
					size="small"
					:class="$style.backButton"
					data-test-id="settings-back-button"
					@click="emit('back')"
				>
					<template #icon>
						<N8nIcon icon="arrow-left" />
					</template>
					{{ backLabel }}
				</N8nButton>
			</slot>
		</div>
		<div :class="$style[size]">
			<slot />
		</div>
	</component>
</template>

<style lang="scss" module>
.layout {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
	width: 100%;
}

.backRow {
	display: flex;
	width: 100%;
}

.backButton {
	margin-inline-start: calc(-1 * var(--spacing--xs));
}

.narrow,
.wide {
	width: 100%;
	padding: 0 var(--spacing--2xl);
}

.narrow {
	max-width: 700px;
	margin-inline: auto;
}
</style>
