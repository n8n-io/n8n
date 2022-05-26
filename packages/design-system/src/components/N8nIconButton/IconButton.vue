<template>
	<n8n-button
		:class="`icon-button ${$style['icon-button']} ${$style[size]}`"
		v-bind="$props"
		v-on="$listeners"
	/>
</template>

<script lang="ts">
import N8nButton from '../N8nButton';

export default {
	name: 'n8n-icon-button',
	components: {
		N8nButton,
	},
	props: {
		type: {
			type: String,
			default: 'primary',
		},
		size: {
			type: String,
			default: 'medium',
		},
		loading: {
			type: Boolean,
			default: false,
		},
		outline: {
			type: Boolean,
			default: false,
		},
		text: {
			type: Boolean,
			default: false,
		},
		disabled: {
			type: Boolean,
			default: false,
		},
		active: {
			type: Boolean,
			default: false,
		},
		icon: {
			type: [String, Array],
			required: true,
		},
		float: {
			type: String,
			validator: (value: string): boolean =>
				['left', 'right'].includes(value),
		},
		circle: {
			type: Boolean,
			default: true,
		},
		circle: {
			type: Boolean,
			default: true,
		},
	},
};
</script>

<style lang="scss" module>
.icon-button {
	padding: 0;
	display: inline-flex;
	justify-content: center;
	align-items: center;
}

.mini {
	height: 22px;
	width: 22px;
}

.small {
	height: 26px;
	width: 26px;
}

.medium {
	height: 30px;
	width: 30px;
}

.large {
	height: 42px;
	width: 42px;
}

.xlarge {
	height: 46px;
	width: 46px;
}
</style>
