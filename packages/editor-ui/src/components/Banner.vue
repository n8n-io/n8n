<template>
	<el-tag :type="props.theme" :disable-transitions="true" :class="$style.container">
		<font-awesome-icon
			:icon="props.theme === 'success' ? 'check-circle' : 'exclamation-triangle'"
			:class="props.theme === 'success' ? $style.icon : $style.dangerIcon"
		/>
		<div :class="$style.banner">
			<div :class="$style.content">
				<div>
					<span :class="props.theme === 'success' ? $style.message : $style.dangerMessage">
						{{ props.message }}&nbsp;
					</span>
					<n8n-link v-if="props.details && !expanded" :bold="true" size="small" @click="expand">
						<span :class="$style.moreDetails">More details</span>
					</n8n-link>
				</div>
			</div>

			<slot v-if="slots.button" name="button" />
			<n8n-button
				v-else-if="props.buttonLabel"
				:label="props.buttonLoading && props.buttonLoadingLabel ? props.buttonLoadingLabel : props.buttonLabel"
				:title="props.buttonTitle"
				:type="props.theme"
				:loading="props.buttonLoading"
				size="small"
				outline
				@click.stop="onClick"
			/>
		</div>

		<div v-if="expanded" :class="$style.details">
			{{ props.details }}
		</div>
	</el-tag>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { defineProps, defineEmits, useSlots } from 'vue';

interface Props {
	theme: 'success' | 'danger';
	message: string;
	buttonLabel?: string;
	buttonLoadingLabel?: string;
	buttonTitle?: string;
	details?: string;
	buttonLoading?: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits(['click']);
const slots = useSlots();

const expanded = ref(false);

function expand() {
	expanded.value = true;
}

function onClick() {
	expanded.value = false;
	emit('click');
}
</script>

<style module lang="scss">
.icon {
	position: absolute;
	left: 14px;
	top: 0;
	bottom: 0;
	margin: auto 0;
}

.dangerIcon {
	composes: icon;
	color: var(--color-danger);
}

.container {
	width: 100%;
	position: relative;
	padding-left: 40px;
	border: none;
}

.message {
	white-space: normal;
	line-height: var(--font-line-height-regular);
	overflow: hidden;
	word-break: break-word;
}

.dangerMessage {
	composes: message;
	color: var(--color-callout-danger-font);
}

.banner {
	display: flex;
	align-items: center;
}

.content {
	flex-grow: 1;
	min-height: 26px;
	display: flex;
	align-items: center;
}

.details {
	composes: message;
	margin-top: var(--spacing-3xs);
	color: var(--color-text-base);
	font-size: var(--font-size-2xs);
}

.moreDetails {
	font-size: var(--font-size-xs);
}
</style>