<template>
	<div class="ph-no-capture" :class="$style.container">
		<span v-if="readonly" :class="$style.headline">
			{{ name }}
		</span>
		<div
			v-else
			:class="[$style.headline, $style['headline-editable']]"
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
		<div :class="$style.subtitle" v-if="!isNameEdit && subtitle">
			{{ subtitle }}
		</div>
	</div>
</template>

<script lang="ts">
import mixins from 'vue-typed-mixins';
import { showMessage } from '@/mixins/showMessage';

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
		readonly: {
			type: Boolean,
			default: false,
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
				const inputRef = this.$refs.nameInput as HTMLInputElement | undefined;
				if (inputRef) {
					inputRef.focus();
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
