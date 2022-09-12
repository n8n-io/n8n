<template>
	<div :class="['card', $style.card]" v-on="$listeners">
		<div :class="$style.icon" v-if="$slots.prepend">
			<slot name="prepend"/>
		</div>
		<div :class="$style.content">
			<div :class="$style.header" v-if="$slots.header">
				<slot name="header"/>
			</div>
			<div :class="$style.body" v-if="$slots.default">
				<slot/>
			</div>
			<div :class="$style.footer" v-if="$slots.footer">
				<slot name="footer"/>
			</div>
		</div>
		<div :class="$style.actions" v-if="$slots.append">
			<slot name="append"/>
		</div>
	</div>
</template>

<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
	name: 'n8n-card',
	inheritAttrs: true,
});
</script>

<style lang="scss" module>
.card {
	border-radius: var(--border-radius-large);
	border: var(--border-base);
	background-color: var(--color-background-xlight);
	padding: var(--spacing-s);
	display: flex;
	flex-direction: row;
	width: 100%;
	align-items: center;
}

.header,
.footer {
	display: flex;
	flex-direction: row;
	justify-content: space-between;
	align-items: center;
}

.content {
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	flex: 1;
	width: 100%;
}

.body {
	width: 100%;
	height: 100%;
	display: flex;
	flex-direction: column;
	justify-content: space-between;
}

.icon {
	width: 24px;
	height: 24px;
	display: inline-flex;
	justify-content: center;
	align-items: center;
	margin-right: var(--spacing-s);
}
</style>
