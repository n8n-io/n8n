<template>
	<div :class="['accordion', $style.container]" >
		<div :class="{[$style.header]: true, [$style.expanded]: expanded}" @click="toggle">
			<n8n-text color="text-base" size="small" align="left" bold>{{ title }}</n8n-text>

			<font-awesome-icon
				:class="$style.chevron"
				:icon="expanded? 'chevron-up' : 'chevron-down'"
				bold
			/>

		</div>
		<div v-if="expanded" :class="{[$style.description]: true, [$style.collapsed]: !expanded}" @click="onClick">
			<n8n-text color="text-base" size="small" align="left">
				<span v-html="description"></span>
			</n8n-text>
		</div>
	</div>
</template>

<script>
export default {
	name: 'n8n-info-accordion',
	props: {
		title: {
			type: String,
		},
		description: {
			type: String,
		},
	},
	mounted() {
		this.$on('expand', () => {
			this.expanded = true;
		});
	},
	data() {
		return {
			expanded: false,
		};
	},
	methods: {
		toggle() {
			this.expanded = !this.expanded;
		},
		onClick(e) {
			this.$emit('click', e);
		},
	},
};
</script>

<style lang="scss" module>
.container {
	background-color: var(--color-background-base);
}

.header {
	cursor: pointer;
	display: flex;
	padding: var(--spacing-s);

	*:first-child {
		flex-grow: 1;
	}
}

.expanded {
	padding: var(--spacing-s) var(--spacing-s) var(--spacing-2xs) var(--spacing-s);
}

.chevron {
	height: 14px;
}

.description {
	display: flex;
	padding: 0 var(--spacing-s) var(--spacing-s) var(--spacing-s);
}

</style>
