<script lang="ts" setup>
import { computed } from 'vue';

import type { KeyValueCardData, ResultCardSkin } from '../ResultCard.types';

const props = defineProps<{ card: KeyValueCardData; skin: ResultCardSkin }>();

const MAX_PAIRS = 6;
const shownPairs = computed(() => props.card.pairs.slice(0, MAX_PAIRS));
</script>

<template>
	<dl :class="$style.pairs">
		<template v-for="(pair, index) in shownPairs" :key="index">
			<dt :class="$style.key">{{ pair.key }}</dt>
			<dd :class="$style.value">{{ pair.value }}</dd>
		</template>
	</dl>
</template>

<style lang="scss" module>
.pairs {
	display: grid;
	grid-template-columns: minmax(0, 40%) 1fr;
	column-gap: var(--spacing--xs);
	row-gap: var(--spacing--4xs);
	margin: 0;
}

.key {
	margin: 0;
	color: var(--text-color--subtler);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.value {
	margin: 0;
	color: var(--text-color);
	overflow-wrap: anywhere;
}
</style>
