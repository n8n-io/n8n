<template functional>
	<span :class="$style.container">
		<component
			v-if="props.firstName"
			:is="$options.components.Avatar"
			:size="$options.methods.getSize(props.size)"
			:name="props.firstName + ' ' + props.lastName"
			variant="marble"
			:colors="$options.methods.getColors(props.colors)"
		/>
		<div
			v-else
			:class="$style.empty"
			:style="$options.methods.getBlankStyles(props.size)">
		</div>
		<span v-if="props.firstName" :class="$style.initials">{{$options.methods.getInitials(props)}}</span>
	</span>
</template>

<script lang="ts">
import Avatar from 'vue2-boring-avatars';

const sizes: {[size: string]: number} = {
	small: 28,
	large: 48,
	medium: 40,
};

export default {
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
	methods: {
		getInitials({firstName, lastName}) {
			return firstName.charAt(0) + lastName.charAt(0);
		},
		getBlankStyles(size): {height: string, width: string} {
			const px = sizes[size];
			return { height: `${px}px`, width: `${px}px` };
		},
		getColors(colors): string[] {
			const style = getComputedStyle(document.body);
			return colors.map((color: string) => style.getPropertyValue(color));
		},
		getSize(size: string): number {
			return sizes[size];
		},
	},
};
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
</style>
