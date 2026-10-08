<script setup lang="ts">
import { N8nLoading2, N8nSettingsRow, N8nSettingsRowGroup } from '@n8n/design-system';

// Two rows fill about the same height as a short list, so the page moves little when it loads.
const ROWS = 2;
</script>

<template>
	<!-- The same shape as the loaded list: a toolbar with "Link instance", then a group of rows. -->
	<div :class="$style.skeleton" aria-hidden="true" data-test-id="linked-instances-skeleton">
		<div :class="$style.toolbar">
			<div :class="$style.linkButton"><N8nLoading2 variant="custom" /></div>
		</div>
		<N8nSettingsRowGroup>
			<N8nSettingsRow v-for="row in ROWS" :key="row" layout="custom">
				<div :class="$style.content">
					<div :class="$style.info">
						<div :class="$style.name"><N8nLoading2 variant="custom" /></div>
						<div :class="$style.line"><N8nLoading2 variant="custom" /></div>
						<div :class="[$style.line, $style.short]"><N8nLoading2 variant="custom" /></div>
					</div>
					<div :class="$style.actions">
						<div :class="$style.action"><N8nLoading2 variant="custom" /></div>
						<div :class="$style.action"><N8nLoading2 variant="custom" /></div>
						<div :class="$style.menu"><N8nLoading2 variant="custom" /></div>
					</div>
				</div>
			</N8nSettingsRow>
		</N8nSettingsRowGroup>
	</div>
</template>

<style lang="scss" module>
// The sizes follow the loaded row: a name line, two small text lines and three small buttons.
.skeleton {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.toolbar {
	display: flex;
	justify-content: flex-end;
}

.linkButton {
	width: 7.5rem;
	height: var(--height--md);
}

.content {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--xs) var(--spacing--sm);
}

.info {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	flex: 1 1 18rem;
	min-width: 0;
}

.name {
	width: 40%;
	height: var(--spacing--md);
}

.line {
	width: 60%;
	height: var(--spacing--xs);
}

.short {
	width: 45%;
}

.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.action {
	width: 7rem;
	height: var(--height--sm);
}

.menu {
	width: var(--height--sm);
	height: var(--height--sm);
}
</style>
