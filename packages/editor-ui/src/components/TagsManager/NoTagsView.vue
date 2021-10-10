<template>
	<div class="container">
		<el-col class="notags" :span="16">
			<div class="icon">🗄️</div>
			<div>
				<div class="headline">Ready to organize your workflows?</div>
				<div class="description">
					With workflow tags, you're free to create the perfect tagging system for
					your flows
				</div>
			</div>
			<n8n-button label="Create a tag" size="large" @click="$emit('enableCreate')" />
		</el-col>
	</div>
</template>

<script lang="ts">

import Vue from 'vue';

export default Vue.extend({
	name: 'NoTagsView',
});
</script>

<style lang="scss" scoped>
$--footer-spacing: 45px;

.container {
	display: flex;
	justify-content: center;
	align-items: center;
	min-height: $--tags-manager-min-height - $--footer-spacing;
	margin-top: $--footer-spacing;
}

.notags {
	word-break: normal;
	text-align: center;

	> * {
		margin-bottom: 32px;
	}
}

.icon {
  font-size: 36px;
  line-height: 14px;
}

.headline {
  font-size: 17.6px;
  color: black;
  margin-bottom: 12px;
}

.description {
  font-size: 14px;
  line-height: 21px;
}
</style>
