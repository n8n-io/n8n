<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
	props: {
		overflow: {
			type: Boolean,
			default: false,
		},
	},
});
</script>

<template>
	<div :class="{ [$style.wrapper]: true, [$style.overflow]: overflow }">
		<div :class="$style.list">
			<div v-if="$slots.header" :class="$style.header">
				<slot name="header" />
			</div>
			<div :class="$style.body">
				<slot />
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.wrapper {
	display: block;
	width: 100%;
	height: 100%;
}

.overflow {
	.list {
		.body {
			overflow: auto;
		}
	}
}

.list {
	display: flex;
	flex-direction: column;
	width: 100%;
	height: 100%;

	.header {
		flex: 0 0 auto;
	}

	.body {
		overflow: hidden;
		flex: 1 1;
	}
}
</style>
