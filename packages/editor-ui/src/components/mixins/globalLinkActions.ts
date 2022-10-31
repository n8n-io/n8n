/**
 * Creates event listeners for `data-action` attribute to allow for actions to be called from locale without using
 * unsafe onclick attribute
 */
 import Vue from 'vue';

 export const globalLinkActions = Vue.extend({
	data(): {[key: string]: {[key: string]: Function}} {
		return {
			customActions: {},
		};
	},
	mounted() {
		window.addEventListener('click', this.delegateClick, { capture: true, passive: true });
		this.$root.$on('registerGlobalLinkAction', this.registerCustomAction);
	},
	destroyed() {
		window.removeEventListener('click', this.delegateClick, { capture: true });
		this.$root.$off('registerGlobalLinkAction', this.registerCustomAction);
	},
	computed: {
		availableActions(): {[key: string]: Function} {
			return {
				reload: this.reload,
				...this.customActions,
			};
		},
	},
	methods: {
		registerCustomAction(key: string, action: Function) {
			Vue.set(this.customActions, key, action);
		},
		unregisterCustomAction(key: string) {
			Vue.delete(this.customActions, key);
		},
		delegateClick(e: MouseEvent) {
			const clickedElement = e.target;
			if (!(clickedElement instanceof Element) || clickedElement.tagName !== 'A') return;

			const actionAttribute = clickedElement.getAttribute('data-action');
			if(actionAttribute && typeof this.availableActions[actionAttribute] === 'function') {
				this.availableActions[actionAttribute]();
			}
		},
		reload() {
			if (window.top) {
				window.top.location.reload();
			} else {
				window.location.reload();
			}
		},
	},
 });

