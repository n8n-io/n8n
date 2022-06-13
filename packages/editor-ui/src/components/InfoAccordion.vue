<template>
	<div>
		<div :class="$style.clickable" @click="toggle">
			{{ title }}

			<font-awesome-icon
				:icon="expanded? 'chevron-up' : 'chevron-down'"
				:title="$locale.baseText('fixedCollectionParameter.deleteItem')"
			/>

		</div>
	</div>
</template>

<script>
export default Vue.extend({
	name: 'InfoAccordion',
	props: {
		title: {
			type: String,
		},
		description: {
			type: String,
		},
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
	},
});
</script>

<style lang="scss" module>

.clickable {
	cursor: pointer;
}

</style>
