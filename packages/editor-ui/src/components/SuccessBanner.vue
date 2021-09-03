<template>
	<el-tag
		type="success"
		size="medium"
		:class="$style.banner"
	>
		<div>
			<font-awesome-icon
				icon="check-circle"
				:class="$style.successIcon"
			/>
			<span>{{ message }}</span>
		</div>
		<n8n-button
			v-if="buttonLabel"
			:label="$props.buttonLabel"
			:title="$props.buttonTitle"
			size="small"
			theme="success"
			type="outline"
			:transparentBackground="true"
			@click.stop="$emit('click')"
		/>
	</el-tag>
</template>

<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
	name: 'OAuthSuccessBanner',
	props: {
		message: {
			type: String,
		},
		buttonLabel: {
			type: String,
		},
		buttonTitle: {
			type: String,
		},
	},
});
</script>

<style module lang="scss">
.successIcon {
	margin-right: var(--spacing-xs);
}

.banner {
	width: 100%;
	display: flex;
	align-items: center;

	> *:first-child {
		flex-grow: 1;
	}
}

</style>
