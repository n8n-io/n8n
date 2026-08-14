<script setup lang="ts">
import InteractiveSurface from './InteractiveSurface.vue';
import NodeBrand from './NodeBrand.vue';

defineProps<{
	via: string;
	waitingFor: string;
	nodeId?: string | null;
	pressBound?: boolean;
}>();

defineEmits<{ press: [] }>();
</script>

<template>
	<InteractiveSurface
		:node-id="nodeId"
		:label="waitingFor"
		:press-bound="pressBound"
		@press="$emit('press')"
	>
		<section :class="$style.request" data-test-id="approval-request">
			<header :class="$style.header">
				<NodeBrand :node-id="nodeId" :size="16" />
				<span :class="$style.kind">Approval</span>
			</header>
			<dl :class="$style.details">
				<div :class="$style.row">
					<dt :class="$style.term">Waiting for</dt>
					<dd :class="$style.waitingFor" data-test-id="approval-waiting-for">{{ waitingFor }}</dd>
				</div>
				<div :class="$style.row">
					<dt :class="$style.term">Via</dt>
					<dd :class="$style.channel" data-test-id="approval-channel">{{ via }}</dd>
				</div>
			</dl>
		</section>
	</InteractiveSurface>
</template>

<style lang="scss" module>
.request {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	min-width: 0;
	padding: var(--spacing--sm);
	background: var(--background--surface);
	border: var(--border);
	border-left: var(--spacing--4xs) solid var(--color--warning);
	border-radius: var(--radius--md);
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.kind {
	color: var(--text-color--warning);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	letter-spacing: var(--letter-spacing--wide);
	text-transform: uppercase;
}

.details {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	margin: 0;
	min-width: 0;
}

.row {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
}

.term {
	color: var(--text-color--subtler);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--medium);
	letter-spacing: var(--letter-spacing--wide);
	text-transform: uppercase;
}

.waitingFor {
	margin: 0;
	color: var(--text-color);
	font-size: var(--font-size--md);
	font-weight: var(--font-weight--medium);
	line-height: var(--line-height--lg);
	overflow-wrap: anywhere;
}

.channel {
	margin: 0;
	color: var(--text-color--subtle);
	font-size: var(--font-size--sm);
	overflow-wrap: anywhere;
}
</style>
