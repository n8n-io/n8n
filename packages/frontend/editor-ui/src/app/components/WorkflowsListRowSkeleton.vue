<script setup lang="ts">
import { N8nLoading } from '@n8n/design-system';

withDefaults(defineProps<{ rows?: number }>(), { rows: 3 });

// Vary the name widths so the placeholder rows do not look like one block
const NAME_WIDTHS = ['45%', '60%', '35%', '52%', '40%'];
</script>

<template>
	<div data-test-id="workflows-list-row-skeleton">
		<div v-for="index in rows" :key="index" :class="$style.row">
			<div :class="$style.name">
				<span :class="$style.toggle" />
				<N8nLoading variant="custom" :class="$style.icon" />
				<N8nLoading
					variant="p"
					:class="$style.text"
					:style="{ width: NAME_WIDTHS[(index - 1) % NAME_WIDTHS.length] }"
				/>
			</div>
			<N8nLoading variant="p" :class="$style.cell" />
			<N8nLoading variant="p" :class="$style.cell" />
			<span />
		</div>
	</div>
</template>

<style lang="scss" module>
@use '@/app/css/workflows-list';

.row {
	@include workflows-list.row;
}

.name {
	@include workflows-list.row-name;
}

.toggle {
	@include workflows-list.row-toggle;
}

.icon {
	flex-shrink: 0;
	width: var(--spacing--md);
	height: var(--spacing--md);

	:global(.el-skeleton__item) {
		border-radius: var(--radius--3xs);
	}
}

.text,
.cell {
	:global(.el-skeleton__item) {
		height: var(--spacing--xs);
		margin: 0;
	}
}

.cell {
	width: 60%;
}
</style>
