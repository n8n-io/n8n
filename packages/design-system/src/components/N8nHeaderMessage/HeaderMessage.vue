<template>
	<div :class="[this.$style['header-message'], this.$style[this.theme]]">
		<div :class="this.$style['message']">
			<slot />
			<a v-if="actionText" @click="$emit('action-text-click')" :class="this.$style['action-text']">
				{{ actionText }}
			</a>
		</div>
		<n8n-link
			v-if="trailingLinkText && trailingLinkUrl"
			:to="trailingLinkUrl"
			:underline="true"
			:theme="'secondary'"
			:size="'small'"
			:bold="true"
		>
			{{ trailingLinkText }}
		</n8n-link>
		<n8n-icon
			v-else-if="trailingIcon"
			:icon="trailingIcon"
			@click="$emit('trailing-icon-click')"
		/>
	</div>
</template>

<script lang="ts">
import Vue from 'vue';
import N8nLink from '../N8nLink';
import N8nIcon from '../N8nIcon';
import N8nInfoTip from '../N8nInfoTip';

export default Vue.extend({
	name: 'n8n-header-message',
	components: {
		N8nLink,
		N8nIcon,
		N8nInfoTip,
	},
	props: {
		theme: {
			type: String,
			default: 'secondary',
			validator: (value: string): boolean => 'secondary' === value,
		},
		actionText: {
			type: String,
		},
		trailingLinkText: {
			type: String,
		},
		trailingLinkUrl: {
			type: String,
		},
		trailingIcon: {
			type: String,
		},
	},
	components: {
		N8nIcon,
	},
});
</script>

<style lang="scss" module>
.header-message {
	font-size: var(--font-size-2xs);
	color: var(--color-secondary);
	line-height: var(--font-line-height-loose);
	font-weight: var(--font-weight-bold);
	background-color: var(--background-color);
	padding: var(--spacing-xs);
	display: flex;
	justify-content: space-between;

	.message {
		display: flex;
	}

	.action-text {
		padding-left: var(--spacing-4xs);
	}
}

.secondary {
	--background-color: var(--color-secondary-tint-2);

	a {
		color: var(--color-secondary);
		text-decoration: underline;
	}
}

</style>
