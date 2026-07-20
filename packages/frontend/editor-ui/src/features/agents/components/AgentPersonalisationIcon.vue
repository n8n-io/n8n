<script setup lang="ts">
import { computed } from 'vue';
import { DEFAULT_AGENT_PERSONALISATION, type AgentJsonConfig } from '@n8n/api-types';
import { N8nIcon } from '@n8n/design-system';

type AgentPersonalisation = NonNullable<AgentJsonConfig['personalisation']>;

const props = withDefaults(
	defineProps<{
		personalisation?: AgentJsonConfig['personalisation'] | null;
		size?: number;
	}>(),
	{ personalisation: null, size: 24 },
);

const resolved = computed<AgentPersonalisation>(() => {
	const value = props.personalisation;
	return {
		icon: value?.icon ?? DEFAULT_AGENT_PERSONALISATION.icon,
		gradient: { ...DEFAULT_AGENT_PERSONALISATION.gradient, ...value?.gradient },
	};
});

const tileStyle = computed<Record<string, string>>(() => ({
	'--agent-personalisation-gradient-from': resolved.value.gradient.from,
	'--agent-personalisation-gradient-to': resolved.value.gradient.to,
	'--agent-personalisation-gradient-angle': `${resolved.value.gradient.angle}deg`,
	'--agent-personalisation-gradient-from-stop': `${resolved.value.gradient.fromStop}%`,
	'--agent-personalisation-gradient-to-stop': `${resolved.value.gradient.toStop}%`,
	width: `${props.size}px`,
	height: `${props.size}px`,
}));

const iconSize = computed(() => Math.round(props.size * 0.6));
</script>

<template>
	<div :class="$style.tile" :style="tileStyle" data-test-id="agent-personalisation-icon-tile">
		<N8nIcon :icon="resolved.icon" :size="iconSize" />
	</div>
</template>

<style module lang="scss">
.tile {
	--agent-personalisation-squircle-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cpath fill='black' d='M32 0C55.5 0 64 8.5 64 32C64 55.5 55.5 64 32 64C8.5 64 0 55.5 0 32C0 8.5 8.5 0 32 0Z'/%3E%3C/svg%3E");

	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	color: var(--color--white-alpha-950);
	position: relative;
	isolation: isolate;

	&::before {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(
			var(--agent-personalisation-gradient-angle),
			var(--agent-personalisation-gradient-from) var(--agent-personalisation-gradient-from-stop),
			var(--agent-personalisation-gradient-to) var(--agent-personalisation-gradient-to-stop)
		);
		-webkit-mask: var(--agent-personalisation-squircle-mask) center / contain no-repeat;
		mask: var(--agent-personalisation-squircle-mask) center / contain no-repeat;
		z-index: 0;
	}

	> * {
		position: relative;
		z-index: 1;
	}
}
</style>
