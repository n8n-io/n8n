<template>
	<div>
		<div :class="sidebarMenuCollapsed ? $style.templatesHeader : $style.templatesHeader + $style.expanded">
			<div :class="$style.topView">
				<n8n-heading size="2xlarge">{{$locale.baseText('templates.heading')}}</n8n-heading>
				<div>
					<n8n-button type="outline" :label="$locale.baseText('templates.newButton')" @click="openNewWorkflow"></n8n-button>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">

import { mapGetters } from 'vuex';

export default {
	name: 'TemplatesHeader',
	computed: {
		...mapGetters('ui', [
			'sidebarMenuCollapsed',
		]),
	},
	methods: {
		openNewWorkflow() {
			this.$router.push({ name: 'NodeViewNew' });
		},
	},
};
</script>

<style lang="scss" module>
.templatesHeader {
	position: fixed;
	top: 0;
	height: 120px;
	width: 100%;
	box-sizing: border-box;

	padding-left: $--sidebar-width;

	&.expanded {
		padding-left: $--sidebar-expanded-width;
	}
}

.topView {
	display: flex;
	flex-direction: row;
  justify-content: space-between;
	font-weight: 400;
	padding: 48px;
	//todo var
}

</style>
