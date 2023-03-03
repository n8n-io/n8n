<script lang="ts" setup></script>

<template>
	<div :class="$style.ssoLogin">
		<div :class="$style.divider">
			<span>{{ $locale.baseText('sso.login.divider') }}</span>
		</div>
		<n8n-button size="large" type="primary" outline :label="$locale.baseText('sso.login.button')" />
	</div>
</template>

<style lang="scss" module>
.ssoLogin {
	text-align: center;
}

.divider {
	position: relative;
	text-transform: uppercase;

	&::before {
		content: '';
		position: absolute;
		top: 50%;
		left: 0;
		width: 100%;
		height: 1px;
		background-color: var(--color-foreground-base);
	}

	span {
		position: relative;
		display: inline-block;
		padding: var(--spacing-xl) var(--spacing-l);
		background: var(--color-foreground-xlight);
	}
}
</style>
