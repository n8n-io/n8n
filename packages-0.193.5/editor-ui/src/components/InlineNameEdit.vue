<template>
	<div :class="$style.container">
		<div
			:class="$style.headline"
			@keydown.stop
			@click="enableNameEdit"
			v-click-outside="disableNameEdit"
		>
			<div v-if="!isNameEdit">
				<span>{{ name }}</span>
				<i><font-awesome-icon icon="pen" /></i>
			</div>
			<div v-else :class="$style.nameInput">
				<n8n-input
					:value="name"
					size="xlarge"
					ref="nameInput"
					@input="onNameEdit"
					@change="disableNameEdit"
					:maxlength="64"
				/>
			</div>
		</div>
		<div :class="$style.subtitle" v-if="!isNameEdit">{{ subtitle }}</div>
	</div>
</template>

<script lang="ts">
import mixins from 'vue-typed-mixins';
import { showMessage } from './mixins/showMessage';

export default mixins(showMessage).extend({
	name: 'InlineNameEdit',
	props: {
		name: {
			type: String,
		},
		subtitle: {
			type: String,
		},
		type: {
			type: String,
		},
	},
	data() {
		return {
			isNameEdit: false,
		};
	},
	methods: {
		onNameEdit(value: string) {
			this.$emit('input', value);
		},
		enableNameEdit() {
			this.isNameEdit = true;

			setTimeout(() => {
				const input = this.$refs.nameInput as HTMLInputElement;
				if (input) {
					input.focus();
				}
			}, 0);
		},
		disableNameEdit() {
			if (!this.name) {
				this.$emit('input', `Untitled ${this.type}`);

				this.$showToast({
					title: 'Error',
					message: `${this.type} name cannot be empty`,
					type: 'warning',
				});
			}

			this.isNameEdit = false;
		},
	},
});
</script>


<style module lang="scss">
.container {
	min-height: 36px;
}

.headline {
	font-size: var(--font-size-m);
	line-height: 1.4;
	margin-bottom: var(--spacing-5xs);
	display: inline-block;
	cursor: pointer;
	padding: 0 var(--spacing-4xs);
	border-radius: var(--border-radius-base);
	position: relative;
	min-height: 22px;
	max-height: 22px;
	font-weight: 400;

	i {
		display: var(--headline-icon-display, none);
		font-size: 0.75em;
		margin-left: 8px;
		color: var(--color-text-base);
	}

	&:hover {
		background-color: var(--color-background-base);
		--headline-icon-display: inline-flex;
	}
}

.nameInput {
	z-index: 1;
	position: absolute;
	top: -13px;
	left: -9px;
	width: 400px;
}

.subtitle {
	font-size: var(--font-size-2xs);
	color: var(--color-text-light);
	margin-left: 4px;
	font-weight: 400;
}

</style>
