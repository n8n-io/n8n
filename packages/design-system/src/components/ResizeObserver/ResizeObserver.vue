<template>
	<div ref="root">
		<slot :bp="bp"></slot>
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
	name: 'ResizeObserver',
	props: {
		enabled: {
			type: Boolean,
			default: true,
		},
		breakpoints: {
			type: Array,
			validator: (bps: Array<{ bp: string; width: number }>) => {
				return (
					Array.isArray(bps) &&
					bps.reduce(
						(accu, { width, bp }) => accu && typeof width === 'number' && typeof bp === 'string',
						true,
					)
				);
			},
		},
	},
	data(): { observer: ResizeObserver | null; bp: string } {
		return {
			observer: null,
			bp: '',
		};
	},
	mounted() {
		if (!this.enabled) {
			return;
		}

		const root = this.$refs.root as HTMLDivElement;

		if (!root) {
			return;
		}

		this.bp = this.getBreakpointFromWidth(root.offsetWidth);

		const observer = new ResizeObserver((entries) => {
			entries.forEach((entry) => {
				// We wrap it in requestAnimationFrame to avoid this error - ResizeObserver loop limit exceeded
				requestAnimationFrame(() => {
					this.bp = this.getBreakpointFromWidth(entry.contentRect.width);
				});
			});
		});

		this.observer = observer;
		observer.observe(root);
	},
	beforeUnmount() {
		if (this.enabled) {
			this.observer?.disconnect();
		}
	},
	methods: {
		getBreakpointFromWidth(width: number): string {
			let newBP = 'default';
			const unsortedBreakpoints = [...(this.breakpoints || [])] as Array<{
				width: number;
				bp: string;
			}>;

			const bps = unsortedBreakpoints.sort((a, b) => a.width - b.width);
			for (let i = 0; i < bps.length; i++) {
				if (width < bps[i].width) {
					newBP = bps[i].bp;
					break;
				}
			}

			return newBP;
		},
	},
});
</script>
