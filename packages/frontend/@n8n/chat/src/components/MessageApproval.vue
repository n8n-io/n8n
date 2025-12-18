<script setup lang="ts">
import { Button } from '@n8n/chat/components';

defineProps<{
	text: string;
	approve: {
		text: string;
		link: string;
		type: 'primary' | 'secondary';
	};
	decline?: {
		text: string;
		link: string;
		type: 'primary' | 'secondary';
	};
}>();
</script>

<template>
	<div>
		<div>{{ text }}</div>
		<div :class="$style.buttons">
			<Button element="a" :href="approve.link" :type="approve.type" target="_blank">{{
				approve.text
			}}</Button>
			<Button
				v-if="decline"
				element="a"
				:href="decline.link"
				:type="decline.type"
				target="_blank"
				>{{ decline.text }}</Button
			>
		</div>
	</div>
</template>

<style lang="scss" module>
.buttons {
	display: flex;
	gap: 12px;
	margin-top: 12px;
}
</style>
