<script setup lang="ts">
import InteractiveSurface from './InteractiveSurface.vue';
import NodeBrand from './NodeBrand.vue';

defineProps<{
	command: string;
	cwd?: string | null;
	nodeId?: string | null;
	pressBound?: boolean;
}>();

defineEmits<{ press: [] }>();
</script>

<template>
	<InteractiveSurface
		:node-id="nodeId"
		:label="cwd ?? 'Shell'"
		:press-bound="pressBound"
		@press="$emit('press')"
	>
		<section :class="$style.console" data-test-id="terminal-console">
			<header :class="$style.bar">
				<span :class="$style.lights" aria-hidden="true">
					<i :class="$style.light" />
					<i :class="$style.light" />
					<i :class="$style.light" />
				</span>
				<span :class="$style.cwd">{{ cwd ?? 'Shell' }}</span>
				<NodeBrand :node-id="nodeId" :size="16" />
			</header>
			<pre :class="$style.command" data-test-id="terminal-command"><span
				:class="$style.prompt">$</span> {{ command }}</pre>
		</section>
	</InteractiveSurface>
</template>

<style lang="scss" module>
.console {
	display: flex;
	flex-direction: column;
	min-width: 0;
	background: var(--background--inverse);
	border-radius: var(--radius--md);
	overflow: hidden;
}

.bar {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--3xs) var(--spacing--xs);
	border-bottom: var(--border);
	border-color: var(--border-color--inverse);
}

.lights {
	display: flex;
	gap: var(--spacing--5xs);
}

.light {
	width: var(--spacing--2xs);
	height: var(--spacing--2xs);
	background: var(--border-color--inverse);
	border-radius: var(--radius--full);
}

.cwd {
	overflow: hidden;
	color: var(--text-color--inverse);
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--3xs);
	text-overflow: ellipsis;
	white-space: nowrap;
}

.command {
	margin: 0;
	padding: var(--spacing--sm);
	overflow-x: auto;
	color: var(--text-color--inverse);
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--xs);
	line-height: var(--line-height--xl);
	white-space: pre-wrap;
}

.prompt {
	color: var(--color--green-400);
}
</style>
