<template>
	<div>
		<n8n-input-label :label="label">
			<div :class="$style.copyText" @click="copy">
				<span>{{ copyContent }}</span>
				<div :class="$style.copyButton"><span>{{ copyButtonText }}</span></div>
			</div>
		</n8n-input-label>
		<div :class="$style.subtitle">{{ subtitle }}</div>
	</div>
</template>

<script lang="ts">
import mixins from 'vue-typed-mixins';
import { copyPaste } from './mixins/copyPaste';
import { showMessage } from './mixins/showMessage';

export default mixins(copyPaste, showMessage).extend({
	props: {
		label: {
			type: String,
		},
		subtitle: {
			type: String,
		},
		copyContent: {
			type: String,
		},
		copyButtonText: {
			type: String,
		},
		successMessage: {
			type: String,
		},
	},
	methods: {
		copy(): void {
			this.copyToClipboard(this.$props.copyContent);

			this.$showMessage({
				title: this.$locale.baseText('credentialEdit.credentialEdit.showMessage.title'),
				message: this.$props.successMessage,
				type: 'success',
			});
		},
	},
});
</script>

<style lang="scss" module>

.copyText {
	span {
		font-family: Monaco, Consolas;
		line-height: 1.5;
		font-size: var(--font-size-s);
	}

	padding: var(--spacing-xs);
	background-color: var(--color-background-light);
	border: var(--border-base);
	border-radius: var(--border-radius-base);
	cursor: pointer;
	position: relative;
	font-weight: var(--font-weight-regular);

	&:hover {
		--display-copy-button: flex;
		width: 100%;
	}
}

.copyButton {
	display: var(--display-copy-button, none);
	position: absolute;
	top: 0;
	right: 0;
	padding: var(--spacing-xs);
	background-color: var(--color-background-light);
	height: 100%;
	align-items: center;
	border-radius: var(--border-radius-base);

	span {
		font-family: unset;
	}
}

.subtitle {
	margin-top: var(--spacing-2xs);
	font-size: var(--font-size-2xs);
	line-height: var(--font-line-height-loose);
	font-weight: var(--font-weight-regular);
	word-break: normal;
}

</style>
