/* eslint-disable @typescript-eslint/no-explicit-any */
import { defineComponent } from 'vue';

function broadcast(
	this: InstanceType<typeof EmitterMixin>,
	componentName: string,
	eventName: string,
	params: any,
) {
	this.$children.forEach((child) => {
		const name = child.$options.name;

		if (name === componentName) {
			// eslint-disable-next-line prefer-spread
			child.$emit.apply(child, [eventName].concat(params) as Parameters<typeof child.$emit>);
		} else {
			broadcast.apply(
				child as InstanceType<typeof EmitterMixin>,
				[componentName, eventName].concat([params]) as Parameters<typeof broadcast>,
			);
		}
	});
}

const EmitterMixin = defineComponent({
	methods: {
		$dispatch(componentName: string, eventName: string, params: any) {
			let parent = this.$parent || this.$root;
			let name = parent.$options.name;

			while (parent && (!name || name !== componentName)) {
				parent = parent.$parent as InstanceType<typeof EmitterMixin>;

				if (parent) {
					name = parent.$options.name;
				}
			}
			if (parent) {
				// eslint-disable-next-line prefer-spread
				parent.$emit.apply(parent, [eventName].concat(params) as Parameters<typeof parent.$emit>);
			}
		},

		$broadcast(componentName: string, eventName: string, params: any) {
			broadcast.call(this, componentName, eventName, params);
		},
	},
});

export default EmitterMixin;
