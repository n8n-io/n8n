<script lang="ts" setup>
import { N8nIcon } from '@n8n/design-system';
import type { DigestFormat } from '../workflows/dailyInboxDigest';

defineProps<{ format: DigestFormat }>();
</script>

<template>
	<span :class="$style.tile" aria-hidden="true">
		<template v-if="format === 'priority'">
			<span :class="$style.line"
				><span :class="[$style.dot, $style.dotPrimary]" /><span :class="$style.bar"
			/></span>
			<span :class="$style.line"
				><span :class="[$style.dot, $style.dotSecondary]" /><span :class="$style.bar"
			/></span>
			<span :class="$style.line"
				><span :class="[$style.dot, $style.dotMuted]" /><span :class="[$style.bar, $style.short]"
			/></span>
		</template>

		<template v-else-if="format === 'bullets'">
			<span :class="$style.line"><span :class="$style.dot" /><span :class="$style.bar" /></span>
			<span :class="$style.line"><span :class="$style.dot" /><span :class="$style.bar" /></span>
			<span :class="$style.line"
				><span :class="$style.dot" /><span :class="[$style.bar, $style.short]"
			/></span>
		</template>

		<template v-else-if="format === 'briefing'">
			<span :class="$style.block" />
			<span :class="$style.block" />
			<span :class="$style.block" />
			<span :class="[$style.block, $style.shorter]" />
		</template>

		<N8nIcon v-else icon="sparkles" size="large" color="primary" :class="$style.sparkle" />
	</span>
</template>

<style lang="scss" module>
.tile {
	display: flex;
	flex: none;
	flex-direction: column;
	justify-content: center;
	gap: var(--spacing--3xs);
	width: 44px;
	height: 44px;
	padding: 0 var(--spacing--2xs);
	background: var(--color--background--light-1);
	border-radius: var(--radius);
}

.line {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.dot {
	flex: none;
	width: 5px;
	height: 5px;
	border-radius: var(--radius--full);
	background: var(--color--text--tint-1);
}

.dotPrimary {
	background: var(--color--primary);
}

.dotSecondary {
	background: var(--color--secondary);
}

.dotMuted {
	background: var(--color--foreground--shade-1);
}

.bar {
	flex: 1;
	height: 3px;
	border-radius: var(--radius);
	background: var(--color--foreground--shade-1);
}

.block {
	height: 3px;
	border-radius: var(--radius);
	background: var(--color--foreground--shade-1);
}

.short {
	flex: 0 0 60%;
}

.shorter {
	width: 55%;
}

.sparkle {
	align-self: center;
}
</style>
