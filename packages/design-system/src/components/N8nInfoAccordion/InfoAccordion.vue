<template>
	<div :class="['accordion', $style.container]" >
		<div :class="{[$style.header]: true, [$style.expanded]: expanded}" @click="toggle">
			<n8n-text color="text-base" size="small" align="left" bold>{{ title }}</n8n-text>

			<n8n-icon
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
import N8nText from '../N8nText';
import N8nIcon from '../N8nIcon';

import Vue from 'vue';

export default Vue.extend({
	name: 'n8n-info-accordion',
	components: {
		N8nText,
		N8nIcon,
	},
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
});
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

.description {
	display: flex;
	padding: 0 var(--spacing-s) var(--spacing-s) var(--spacing-s);

	b {
		font-weight: var(--font-weight-bold);
	}
}

</style>
