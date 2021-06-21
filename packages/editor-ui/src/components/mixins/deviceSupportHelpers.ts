import Vue from 'vue';

export const deviceSupportHelpers = Vue.extend({
	data() {
		return {
			isTouchDevice: 'ontouchstart' in window || navigator.msMaxTouchPoints,
			isMacOs: /(ipad|iphone|ipod|mac)/i.test(navigator.platform),
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
			if (this.isTouchDevice === true) {
				return true;
			}
			if (this.isMacOs) {
				return e.metaKey;
			}
			return e.ctrlKey;
		},
	},
});
