<template>
	<div ref="root">
		<slot></slot>
	</div>
</template>

<script lang="ts">
import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import type { EventBus } from 'n8n-design-system/utils';
import { createEventBus } from 'n8n-design-system/utils';

export default defineComponent({
	name: 'IntersectionObserver',
	props: {
		threshold: {
			type: Number,
			default: 0,
		},
		enabled: {
			type: Boolean,
			default: false,
		},
		eventBus: {
			type: Object as PropType<EventBus>,
			default: () => createEventBus(),
		},
	},
	data() {
		return {
			observer: null as IntersectionObserver | null,
		};
	},
	mounted() {
		if (!this.enabled) {
			return;
		}

		const options = {
			root: this.$refs.root as Element,
			rootMargin: '0px',
			threshold: this.threshold,
		};

		const observer = new IntersectionObserver((entries) => {
			entries.forEach(({ target, isIntersecting }) => {
				this.$emit('observed', {
					el: target,
					isIntersecting,
				});
			});
		}, options);

		this.observer = observer;

		this.eventBus.on('observe', (observed: Element) => {
			if (observed) {
				observer.observe(observed);
			}
		});

		this.eventBus.on('unobserve', (observed: Element) => {
			observer.unobserve(observed);
		});
	},
	beforeUnmount() {
		if (this.enabled && this.observer) {
			this.observer.disconnect();
		}
	},
});
</script>
