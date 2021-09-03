<template>
	<div>
		<el-tag
			:type="theme"
			size="medium"
			:class="$style.banner"
		>
			<div>
				<font-awesome-icon
					icon="check-circle"
					:class="$style.icon"
				/>
				<span>{{ message }}</span>
				<span v-if="details">More details</span>
			</div>
			<div>
				{{details}}
			</div>
			<n8n-button
				v-if="buttonLabel"
				:label="$props.buttonLabel"
				:title="$props.buttonTitle"
				:theme="theme"
				size="small"
				type="outline"
				:transparentBackground="true"
				@click.stop="$emit('click')"
			/>
		</el-tag>
	</div>
</template>

<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
	name: 'Banner',
	data() {
		return {
			expanded: false,
		};
	},
	props: {
		theme: {
			type: String,
			validator: (value: string): boolean =>
				['success', 'danger'].indexOf(value) !== -1,
		},
		message: {
			type: String,
		},
		buttonLabel: {
			type: String,
		},
		buttonTitle: {
			type: String,
		},
		details: {
			type: String,
		},
	},
});
</script>

<style module lang="scss">
.icon {
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
