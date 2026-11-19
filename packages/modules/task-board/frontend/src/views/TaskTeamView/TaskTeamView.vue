<script setup lang="ts">
import TaskBoardTeamSection from '../../components/TaskBoardTeamSection/TaskBoardTeamSection.vue';
</script>

<template>
	<div :class="$style.page" data-test-id="task-team-view">
		<TaskBoardTeamSection />
	</div>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/breakpoints';

.page {
	width: 100%;
	height: 100%;
	max-width: var(--content-container--width);
	padding: var(--spacing--lg) var(--spacing--2xl);
	overflow: auto;

	@include breakpoints.breakpoint('sm-and-down') {
		padding: var(--spacing--sm);
	}
}
</style>
