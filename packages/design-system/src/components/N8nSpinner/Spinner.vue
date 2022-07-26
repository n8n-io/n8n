<template functional>
	<span>
		<div v-if="props.type === 'ring'" class="lds-ring"><div></div><div></div><div></div><div></div></div>
		<component
			v-else
			:is="$options.components.N8nIcon"
			icon="spinner"
			:size="props.size"
			spin
		/>
	</span>
</template>

<script lang="ts">
import N8nIcon from '../N8nIcon';

export default {
	name: 'n8n-spinner',
	components: {
		N8nIcon,
	},
	props: {
		size: {
			type: String,
			validator: function (value: string): boolean {
				return ['small', 'medium', 'large'].includes(value);
			},
		},
		type: {
			type: String,
			validator: function (value: string): boolean {
				return ['dots', 'ring'].includes(value);
			},
			default: 'dots',
		},
	},
};
</script>

<style lang="scss">
.lds-ring {
  display: inline-block;
  position: relative;
  width: 48px;
  height: 48px;
}
.lds-ring div {
  box-sizing: border-box;
  display: block;
  position: absolute;
  width: 48px;
  height: 48px;
  border: 4px solid var(--color-foreground-xlight);
  border-radius: 50%;
  animation: lds-ring 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
  border-color: var(--color-primary) transparent transparent transparent;
}
.lds-ring div:nth-child(1) {
  animation-delay: -0.45s;
}
.lds-ring div:nth-child(2) {
  animation-delay: -0.3s;
}
.lds-ring div:nth-child(3) {
  animation-delay: -0.15s;
}
@keyframes lds-ring {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

</style>
