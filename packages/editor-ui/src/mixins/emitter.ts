import Vue from 'vue';

// tslint:disable-next-line:no-any
function broadcast(componentName: string, eventName: string, params: any) {
	// @ts-ignore
	(this as Vue).$children.forEach((child) => {
		const name = child.$options.name;

		if (name === componentName) {
			// @ts-ignore
			// eslint-disable-next-line prefer-spread
			child.$emit.apply(child, [eventName].concat(params));
		} else {
			// @ts-ignore
			broadcast.apply(child, [componentName, eventName].concat([params]));
		}
	});
}

export default Vue.extend({
	methods: {
		// tslint:disable-next-line:no-any
		$dispatch(componentName: string, eventName: string, params: any) {
			let parent = this.$parent || this.$root;
			let name = parent.$options.name;

			while (parent && (!name || name !== componentName)) {
				parent = parent.$parent;

				if (parent) {
					name = parent.$options.name;
				}
			}
			if (parent) {
				// @ts-ignore
				// eslint-disable-next-line prefer-spread
				parent.$emit.apply(parent, [eventName].concat(params));
			}
		},
		// tslint:disable-next-line:no-any
		$broadcast(componentName: string, eventName: string, params: any) {
			broadcast.call(this, componentName, eventName, params);
		},
	},
});
