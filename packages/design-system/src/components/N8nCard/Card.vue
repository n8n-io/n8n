<template>
	<div :class="['card', $style.card]" v-on="$listeners">
		<div :class="$style.header" v-if="$slots.header">
			<slot name="header" />
		</div>
		<div :class="$style.body" v-if="$slots.default">
			<slot />
		</div>
		<div :class="$style.footer" v-if="$slots.footer">
			<slot name="footer" />
		</div>
	</div>
</template>

<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
	name: 'n8n-card',
});
</script>

<style lang="scss" module>
.card {
	border-radius: var(--border-radius-large);
	border: var(--border-base);
	background-color: var(--color-background-xlight);
	padding: var(--spacing-s);
	display: flex;
	flex-direction: column;
	justify-content: space-between;
}

.header,
.footer {
	display: flex;
  	flex-direction: row;
  	justify-content: space-between;
	align-items: center;
}

.body {
	width: 100%;
	height: 100%;
	display: flex;
	flex-direction: column;
	justify-content: space-between;
}
</style>
