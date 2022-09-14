import Vue from 'vue';
import N8nButton from '../Button.vue';

const classToTypeMap = {
	'btn--cancel': 'secondary',
};

export default Vue.extend({
	render(createElement) {
		let type = 'primary';
		Object.entries(classToTypeMap).forEach(([className, mappedType]) => {
			if (this.$refs.button && (this.$refs.button as Vue).$el.classList.contains(className)) {
				type = mappedType;
			}
		});

		return createElement(N8nButton, {
			attrs: {
				type,
				...this.$attrs,
			},
		}, this.$slots.default);
	},
});
