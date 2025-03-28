<script lang="ts" setup></script>

<template>
	<div :class="$style.callout">
		<N8nIcon icon="lock" size="size"></N8nIcon>
		<N8nText bold tag="h3" size="large">Upgrade to Pro or Enterprise to see full data</N8nText>
		<N8nText
			>Gain access to detailed execution data with one year data retention.
			<N8nLink to="/">Learn more</N8nLink>
		</N8nText>
		<N8nButton type="primary" size="large">Upgrade</N8nButton>
	</div>
</template>

<style lang="scss" module>
.callout {
	display: flex;
	flex-direction: column;
	height: 100%;
	align-items: center;
	max-width: 360px;
	margin: 0 auto;
	text-align: center;
	gap: 10px;
	justify-content: center;
}
</style>
