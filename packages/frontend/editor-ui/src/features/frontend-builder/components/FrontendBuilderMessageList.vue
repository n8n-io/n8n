<script setup lang="ts">
import type { FrontendBuilderMessage } from '@n8n/api-types';

defineProps<{ messages: FrontendBuilderMessage[] }>();
</script>

<template>
	<ul :class="$style.messages">
		<li
			v-for="(message, index) in messages"
			:key="index"
			:class="[$style.message, $style[message.role]]"
		>
			<strong :class="$style.role">{{ message.role }}:</strong>
			<pre :class="$style.content">{{ message.content }}</pre>
		</li>
	</ul>
</template>

<style module>
.messages {
	list-style: none;
	margin: 0;
	padding: var(--spacing--sm);
	overflow-y: auto;
}
.message {
	margin-bottom: var(--spacing--xs);
}
.role {
	margin-right: var(--spacing--3xs);
	text-transform: capitalize;
}
.content {
	white-space: pre-wrap;
	font-family: inherit;
	margin: 0;
}
.user {
	color: var(--color--text);
}
.assistant {
	color: var(--color--text--tint-1);
}
</style>
