<script setup lang="ts">
import InteractiveSurface from './InteractiveSurface.vue';
import NodeBrand from './NodeBrand.vue';

defineProps<{
	to: string;
	subject: string;
	bodyPreview: string;
	nodeId?: string | null;
	pressBound?: boolean;
}>();

defineEmits<{ press: [] }>();
</script>

<template>
	<InteractiveSurface
		:node-id="nodeId"
		:label="subject"
		:press-bound="pressBound"
		@press="$emit('press')"
	>
		<article :class="$style.message" data-test-id="email-message">
			<header :class="$style.headers" data-test-id="email-headers">
				<div :class="$style.sender">
					<NodeBrand :node-id="nodeId" :size="16" />
					<span :class="$style.channel">Email</span>
				</div>
				<h4 :class="$style.subject">{{ subject }}</h4>
				<dl :class="$style.recipients">
					<dt>To</dt>
					<dd>{{ to }}</dd>
				</dl>
			</header>
			<p :class="$style.body" data-test-id="email-body">{{ bodyPreview }}</p>
		</article>
	</InteractiveSurface>
</template>

<style lang="scss" module>
.message {
	display: flex;
	flex-direction: column;
	min-width: 0;
	background: var(--background--surface);
	border: var(--border);
	border-radius: var(--radius--sm);
	overflow: hidden;
}

.headers {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	padding: var(--spacing--sm);
	background: var(--background--subtle);
	border-bottom: var(--border);
}

.sender {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.channel {
	color: var(--text-color--subtler);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--medium);
	letter-spacing: var(--letter-spacing--wide);
	text-transform: uppercase;
}

.subject {
	margin: 0;
	color: var(--text-color);
	font-size: var(--font-size--md);
	font-weight: var(--font-weight--bold);
	line-height: var(--line-height--lg);
	overflow-wrap: anywhere;
}

.recipients {
	display: grid;
	grid-template-columns: auto 1fr;
	gap: var(--spacing--3xs) var(--spacing--2xs);
	margin: 0;
	font-size: var(--font-size--xs);
}

.recipients dt {
	color: var(--text-color--subtler);
}

.recipients dd {
	min-width: 0;
	margin: 0;
	color: var(--text-color--subtle);
	overflow-wrap: anywhere;
}

.body {
	margin: 0;
	padding: var(--spacing--sm);
	color: var(--text-color);
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
	white-space: pre-wrap;
}
</style>
