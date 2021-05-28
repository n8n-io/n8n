<template>
  <div>
    <node-create-item
      v-for="(nodeType, index) in nodeTypes"
      :active="index === activeIndex"
      :nodeType="nodeType"
      v-bind:key="nodeType.name"
      @nodeTypeSelected="nodeTypeSelected"
    ></node-create-item>
  </div>
</template>


<script lang="ts">

import NodeCreateItem from '@/components/NodeCreateItem.vue';

import Vue from 'vue';

export default Vue.extend({
	name: 'NodeCreateIterator',
	components: {
		NodeCreateItem,
	},
	props: ['nodeTypes', 'activeIndex'],
	methods: {
		nodeTypeSelected (nodeTypeName: string) {
			this.$emit('nodeTypeSelected', nodeTypeName);
		},
	}
});

</script>