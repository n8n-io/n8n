<script setup lang="ts">
import { N8nButton } from '@n8n/design-system';

defineProps<{
	text: string;
	approve: {
		text: string;
		link: string;
		style: 'primary' | 'secondary';
	};
	decline?: {
		text: string;
		link: string;
		style: 'primary' | 'secondary';
	};
}>();
</script>

<template>
	<div>
		<p>{{ text }}</p>
		<div :class="$style.buttons">
			<N8nButton element="a" :href="approve.link" :type="approve.style">{{
				approve.text
			}}</N8nButton>
			<N8nButton v-if="decline" element="a" :href="decline.link" :type="decline.style">{{
				decline.text
			}}</N8nButton>
		</div>
	</div>
</template>

<style lang="scss" module>
.buttons {
	display: flex;
	gap: var(--spacing--xs);
	margin-top: var(--spacing--xs);
}

.approve {
	color: var(--chat--color-primary);
	text-decoration: none;
	&:hover {
		text-decoration: underline;
	}
}
.decline {
	color: var(--chat--color-danger);
	text-decoration: none;
}
</style>
