<script setup lang="ts">
import { N8nIcon, N8nTooltip } from '@n8n/design-system';
</script>

<template>
	<span>
		<N8nTooltip content=" " placement="top">
			<template #content>
				<slot />
			</template>
			<N8nIcon :class="$style['icon']" icon="triangle-alert" />
		</N8nTooltip>
	</span>
</template>

<style lang="scss" module>
.icon {
	font-size: 14px;
	height: 18px;
	color: $warning-tooltip-color;
}
</style>
