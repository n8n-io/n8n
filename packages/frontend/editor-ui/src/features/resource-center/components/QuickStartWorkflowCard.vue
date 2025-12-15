<script setup lang="ts">
import { N8nIcon } from '@n8n/design-system';

export interface QuickStartWorkflow {
	id: number;
	name: string;
	description: string;
	icon: string;
	easySetup: boolean;
	noCredentials: boolean;
}

const props = defineProps<{
	workflow: QuickStartWorkflow;
}>();

const emit = defineEmits<{
	import: [workflowId: number];
}>();

const handleImport = () => {
	emit('import', props.workflow.id);
};
</script>

<template>
	<div :class="$style.card" @click="handleImport">
		<div :class="$style.content">
			<div :class="$style.iconWrapper">
				<N8nIcon :icon="workflow.icon" size="large" :class="$style.icon" />
			</div>
			<h3>{{ workflow.name }}</h3>
			<p :class="$style.description">{{ workflow.description }}</p>
			<div v-if="workflow.easySetup || workflow.noCredentials" :class="$style.badges">
				<span v-if="workflow.easySetup" :class="$style.badge">EASY SETUP</span>
				<span v-if="workflow.noCredentials" :class="$style.badge">NO CREDENTIALS NEEDED</span>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.card {
	flex: 1 1 0;
	min-width: 0;
	cursor: pointer;
	position: relative;
	background: white;
	border-radius: 12px;
	overflow: hidden;
	border: 1px solid var(--border-color);
	transition: all 0.35s cubic-bezier(0.22, 1, 0.36, 1);

	&:hover {
		border-color: var(--border-color--strong);

		.iconWrapper {
			background: var(--color--primary--tint-3);
		}

		.icon {
			color: var(--color--primary);
		}
	}
}

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--md);
}

.iconWrapper {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 48px;
	height: 48px;
	background: var(--color--background--light-2);
	border-radius: 10px;
	transition: all 0.3s ease;
}

.icon {
	color: var(--color--text--tint-1);
	transition: color 0.3s ease;
}

h3 {
	font-family: 'DM Sans', var(--font-family);
	font-weight: 600;
	color: var(--color--text);
	line-height: 1.3;
	font-size: var(--font-size--md);
	margin: 0;
}

.description {
	font-family: 'DM Sans', var(--font-family);
	color: var(--color--text--tint-2);
	line-height: 1.55;
	font-size: var(--font-size--sm);
	margin: 0;
}

.badges {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	margin-top: var(--spacing--xs);
}

.badge {
	font-family: InterVariable;
	font-weight: 600;
	font-size: var(--font-size--2xs);
	color: var(--color--success);
	text-transform: uppercase;
	letter-spacing: 0.03em;
}
</style>
