import Vue from 'vue';

export const deviceSupportHelpers = Vue.extend({
	data() {
		return {
			// @ts-ignore msMaxTouchPoints is deprecated but must fix tablet bugs before fixing this.. otherwise breaks touchscreen computers
			isTouchDevice: 'ontouchstart' in window || navigator.msMaxTouchPoints,
			isMacOs: /(ipad|iphone|ipod|mac)/i.test(navigator.platform), // TODO: `platform` deprecated
		};
	},
	computed: {
		// TODO: Check if used anywhere
		controlKeyCode(): string {
			if (this.isMacOs) {
				return 'Meta';
			}
			return 'Control';
		},
	},
	methods: {
		isCtrlKeyPressed(e: MouseEvent | KeyboardEvent): boolean {
			if (this.isTouchDevice === true && e instanceof MouseEvent) {
				return true;
			}
			if (this.isMacOs) {
				return e.metaKey;
			}
			return e.ctrlKey;
		},
	},
});
