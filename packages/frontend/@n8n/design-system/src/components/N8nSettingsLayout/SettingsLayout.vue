<script setup lang="ts">
import N8nButton from '../N8nButton';
import N8nIcon from '../N8nIcon';

export interface SettingsLayoutProps {
	/** Element/component to render as the layout container. */
	tag?: string;
	/** Show the ghost back action pinned to the top-left of the page. */
	showBack?: boolean;
	/** Label for the back action. */
	backLabel?: string;
	/**
	 * Let the content fill the full padded width instead of being capped at the
	 * content max-width. Use for pages with a wide table that should span the container.
	 */
	fullWidth?: boolean;
}

defineOptions({ name: 'N8nSettingsLayout' });

withDefaults(defineProps<SettingsLayoutProps>(), {
	tag: 'div',
	showBack: false,
	backLabel: 'Back',
	fullWidth: false,
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
		<div :class="[$style.content, { [$style.fullWidth]: fullWidth }]">
			<slot />
		</div>
	</component>
</template>

<style lang="scss" module>
.layout {
	/* The single component-scoped width token; 45rem === 720px at a 16px root. */
	--settings-content--max-width: 45rem;

	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
	width: 100%;
	/* top | inline | bottom — bottom uses the larger 2xl token. */
	padding: var(--spacing--lg) var(--spacing--lg) var(--spacing--2xl);
	box-sizing: border-box;
}

.backRow {
	display: flex;
	width: 100%;
}

.backButton {
	/* Pull the ghost button's inner padding so the arrow aligns to the page's 24px inset. */
	margin-inline-start: calc(-1 * var(--spacing--xs));
}

.content {
	width: 100%;
	max-width: var(--settings-content--max-width);
	margin-inline: auto;

	/*
	 * Center each child within its own cap. The page header caps itself at
	 * --settings-content--max-width, so it stays centered on the page even when the
	 * content region goes full-width; full-width children (width: 100%) are unaffected.
	 */
	> * {
		margin-inline: auto;
	}

	/*
	 * Vertical rhythm is owned solely by the FOLLOWING child's margin-block-start, so two
	 * adjacent margins never meet and the spacing never depends on margin-collapsing.
	 * Default rhythm for non-section direct children:
	 */
	> * + * {
		margin-block-start: var(--spacing--lg); /* 24px */
	}

	/*
	 * Enforced page-header → content gap (48px). The page header renders a semantic <header>,
	 * so the element that follows it owns the larger gap. Kept here (not on the header's own
	 * margin) so it is deterministic, can't be overridden, and never relies on collapse.
	 */
	> header + * {
		margin-block-start: var(--spacing--2xl); /* 48px */
	}
}

.fullWidth {
	max-width: none;
}
</style>
