<script lang="ts" setup>
import { onUnmounted, computed } from 'vue';
import { useDependencyGraphStore } from '../dependencyGraph.store';
import DependencyGraphVisualization from '../components/DependencyGraphVisualization.vue';
import DependencyGraphSidebar from '../components/DependencyGraphSidebar.vue';
import DependencyGraphToolbar from '../components/DependencyGraphToolbar.vue';

const store = useDependencyGraphStore();

const hasSelectedNode = computed(() => store.selectedNode !== null);

onUnmounted(() => {
	store.reset();
});
</script>

<template>
	<div :class="$style.container">
		<!-- Toolbar -->
		<DependencyGraphToolbar />

		<!-- Main Content -->
		<div :class="$style.content">
			<div :class="[$style.graphArea, { [$style.withSidebar]: hasSelectedNode }]">
				<DependencyGraphVisualization />
			</div>

			<Transition name="slide-panel">
				<DependencyGraphSidebar v-if="hasSelectedNode" />
			</Transition>
		</div>

		<!-- Bottom Legend -->
		<div :class="$style.footer">
			<div :class="$style.legend">
				<div :class="$style.legendGroup">
					<span :class="$style.legendTitle">Nodes</span>
					<div :class="$style.legendItem">
						<span :class="[$style.legendIndicator, $style.activeWorkflow]"></span>
						<span>Active Workflow</span>
					</div>
					<div :class="$style.legendItem">
						<span :class="[$style.legendIndicator, $style.inactiveWorkflow]"></span>
						<span>Inactive Workflow</span>
					</div>
					<div :class="$style.legendItem">
						<span :class="[$style.legendIndicator, $style.credential]"></span>
						<span>Credential</span>
					</div>
				</div>

				<div :class="$style.legendDivider"></div>

				<div :class="$style.legendGroup">
					<span :class="$style.legendTitle">Connections</span>
					<div :class="$style.legendItem">
						<span :class="[$style.legendLine, $style.usesCredential]"></span>
						<span>Uses Credential</span>
					</div>
					<div :class="$style.legendItem">
						<span :class="[$style.legendLine, $style.callsWorkflow]"></span>
						<span>Calls Workflow</span>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	height: 100%;
	background: var(--color--background);
}

.content {
	flex: 1;
	display: flex;
	overflow: hidden;
	position: relative;
}

.graphArea {
	flex: 1;
	overflow: hidden;
	transition: margin-right 0.25s ease;

	&.withSidebar {
		margin-right: 0;
	}
}

.footer {
	padding: 8px 20px;
	background: var(--color--background--light-1);
	border-top: 1px solid var(--color--foreground);
}

.legend {
	display: flex;
	align-items: center;
	gap: 24px;
}

.legendGroup {
	display: flex;
	align-items: center;
	gap: 16px;
}

.legendTitle {
	font-size: 10px;
	font-weight: 700;
	color: var(--color--text--tint-1);
	text-transform: uppercase;
	letter-spacing: 0.5px;
	margin-right: 4px;
}

.legendItem {
	display: flex;
	align-items: center;
	gap: 6px;
	font-size: 12px;
	color: var(--color--text);
}

.legendIndicator {
	width: 12px;
	height: 12px;
	border-radius: var(--radius--sm);
	border: 2px solid;

	&.activeWorkflow {
		background-color: #dcfce7;
		border-color: var(--color--success);
	}

	&.inactiveWorkflow {
		background-color: var(--color--background--light-1);
		border-color: var(--color--foreground--shade-1);
	}

	&.credential {
		background-color: #fef3c7;
		border-color: var(--color--warning);
	}
}

.legendLine {
	width: 24px;
	height: 3px;
	border-radius: 2px;

	&.usesCredential {
		background: repeating-linear-gradient(
			90deg,
			#f59e0b 0,
			#f59e0b 4px,
			transparent 4px,
			transparent 8px
		);
	}

	&.callsWorkflow {
		background: #6366f1;
	}
}

.legendDivider {
	width: 1px;
	height: 20px;
	background: var(--color--foreground);
}
</style>

<style>
/* Panel slide transition */
.slide-panel-enter-active,
.slide-panel-leave-active {
	transition:
		transform 0.25s ease,
		opacity 0.25s ease;
}

.slide-panel-enter-from,
.slide-panel-leave-to {
	transform: translateX(100%);
	opacity: 0;
}
</style>
