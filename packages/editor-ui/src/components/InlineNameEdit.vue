<template>
	<div :class="$style.container">
		<span v-if="readonly" :class="$style.headline">
			{{ modelValue }}
		</span>
		<div
			v-else
			v-on-click-outside="disableNameEdit"
			:class="[$style.headline, $style['headline-editable']]"
			@keydown.stop
			@click="enableNameEdit"
		>
			<div v-if="!isNameEdit">
				<span>{{ modelValue }}</span>
				<i><font-awesome-icon icon="pen" /></i>
			</div>
			<div v-else :class="$style.nameInput">
				<n8n-input
					ref="nameInput"
					:model-value="modelValue"
					size="xlarge"
					:maxlength="64"
					@update:model-value="onNameEdit"
					@change="disableNameEdit"
				/>
			</div>
		</div>
		<div v-if="!isNameEdit && subtitle" :class="$style.subtitle">
			{{ subtitle }}
		</div>
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useToast } from '@/composables/useToast';

export default defineComponent({
	name: 'InlineNameEdit',
	props: {
		modelValue: {
			type: String,
		},
		subtitle: {
			type: String,
		},
		type: {
			type: String,
		},
		readonly: {
			type: Boolean,
			default: false,
		},
	},
	setup() {
		return {
			...useToast(),
		};
	},
	data() {
		return {
			isNameEdit: false,
		};
	},
	methods: {
		onNameEdit(value: string) {
			this.$emit('update:modelValue', value);
		},
		enableNameEdit() {
			this.isNameEdit = true;

			setTimeout(() => {
				const inputRef = this.$refs.nameInput as HTMLInputElement | undefined;
				if (inputRef) {
					inputRef.focus();
				}
			}, 0);
		},
		disableNameEdit() {
			if (!this.modelValue) {
				this.$emit('update:modelValue', `Untitled ${this.type}`);

				this.showToast({
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
	display: flex;
	align-items: flex-start;
	justify-content: center;
	flex-direction: column;
	min-height: 36px;
}

.headline {
	font-size: var(--font-size-m);
	line-height: 1.4;
	margin-bottom: var(--spacing-5xs);
	display: inline-block;
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
}

.headline-editable {
	cursor: pointer;

	&:hover {
		background-color: var(--color-background-base);
		--headline-icon-display: inline-flex;
	}
}

.nameInput {
	z-index: 1;
	position: absolute;
	margin-top: 1px;
	top: 50%;
	left: 0;
	width: 400px;
	transform: translateY(-50%);
}

.subtitle {
	font-size: var(--font-size-2xs);
	color: var(--color-text-light);
	margin-left: 4px;
	font-weight: 400;
}
</style>
