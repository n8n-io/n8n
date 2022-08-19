<template>
	<span :class="['n8n-avatar', $style.container]"	v-on="$listeners">
		<avatar
			v-if="firstName"
			:size="getSize(size)"
			:name="firstName + ' ' + lastName"
			variant="marble"
			:colors="getColors(colors)"
		/>
		<div
			v-else
			:class="[$style.empty, $style[size]]"
		>
		</div>
		<span v-if="firstName" :class="$style.initials">{{initials}}</span>
	</span>
</template>

<script lang="ts">
import Avatar from 'vue2-boring-avatars';

const sizes: {[size: string]: number} = {
	small: 28,
	large: 48,
	medium: 40,
};

import Vue from 'vue';

export default Vue.extend({
	name: 'n8n-avatar',
	props: {
		firstName: {
			type: String,
		},
		lastName: {
			type: String,
		},
		size: {
			type: String,
			default: 'medium',
		},
		colors: {
			default: () => (['--color-primary', '--color-secondary', '--color-avatar-accent-1', '--color-avatar-accent-2', '--color-primary-tint-1']),
		},
	},
	components: {
		Avatar,
	},
	computed: {
		initials() {
			return (this.firstName ? this.firstName.charAt(0): '') + (this.lastName? this.lastName.charAt(0): '');
		},
	},
	methods: {
		getColors(colors): string[] {
			const style = getComputedStyle(document.body);
			return colors.map((color: string) => style.getPropertyValue(color));
		},
		getSize(size: string): number {
			return sizes[size];
		},
	},
});
</script>

<style lang="scss" module>
.container {
	position: relative;
	display: inline-flex;
	justify-content: center;
	align-items: center;
}

.empty {
	border-radius: 50%;
	background-color: var(--color-foreground-dark);
	opacity: .3;
}

.initials {
	position: absolute;
	font-size: var(--font-size-2xs);
	font-weight: var(--font-weight-bold);
	color: var(--color-text-xlight);
	text-shadow: 0px 1px 6px rgba(25, 11, 9, 0.3);
}

.small {
	height: 28px;
	width: 28px;
}

.medium {
	height: 40px;
	width: 40px;
}

.large {
	height: 48px;
	width: 48px;
}
</style>
