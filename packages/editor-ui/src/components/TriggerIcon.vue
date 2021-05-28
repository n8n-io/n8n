<template>
	<span>
		<img :src="require('@/assets/trigger-icon.svg')" alt="trigger" />
	</span>
</template>

<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
});
</script>

<style lang="scss" scoped>
* {
	box-sizing: border-box;
}

span {
	background-color: $--trigger-icon-background-color;
	border: 1px solid $--trigger-icon-border-color;
  border-radius: 4px;
	display: inline-flex;
}

</style>
