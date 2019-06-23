<template>
	<div class="node-icon-wrapper">
		<div v-if="nodeIconData !== null" class="icon">
			<img :src="nodeIconData.path" style="width: 100%; height: 100%;" v-if="nodeIconData.type === 'file'"/>
			<font-awesome-icon :icon="nodeIconData.path" v-else-if="nodeIconData.type === 'fa'" />
		</div>
		<div v-else class="node-icon-placeholder">
			{{nodeType !== null ? nodeType.displayName.charAt(0) : '?' }}
		</div>
	</div>
</template>

<script lang="ts">

import Vue from 'vue';

interface NodeIconData {
	type: string;
	path: string;
}

export default Vue.extend({
	name: 'NodeIcon',
	props: [
		'nodeType',
	],
	computed: {
		nodeIconData (): null | NodeIconData {
			if (this.nodeType === null) {
				return null;
			}

			const restUrl = this.$store.getters.getRestUrl;

			if (this.nodeType.icon) {
				let type, path;
				[type, path] = this.nodeType.icon.split(':');
				const returnData = {
					type,
					path,
				};

				if (type === 'file') {
					returnData.path = restUrl + '/node-icon/' + this.nodeType.name;
				}

				return returnData;
			}
			return null;
		},
	},
});
</script>

<style lang="scss">

.node-icon-wrapper {
	width: 30px;
	height: 30px;
	border-radius: 20px;
	color: #444;
	line-height: 30px;
	font-size: 1.1em;
	overflow: hidden;
	background-color: #fff;
	text-align: center;
	font-size: 12px;
	font-weight: bold;

	.icon {
		font-size: 1.6em;
	}

	.node-icon-placeholder {
		font-size: 1.4em;
		text-align: center;
	}
}

</style>
