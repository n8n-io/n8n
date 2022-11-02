import Vue from 'vue';
import { render, fireEvent } from '@testing-library/vue';

const FakeComponent = Vue.extend({
	template: `<div ref="codeNodeEditor" class="ph-no-capture" />`,
	props: {
		mode: {
			type: String,
			validator: (value: string): boolean =>
				['runOnceForAllItems', 'runOnceForEachItem'].includes(value),
		},
		jsCode: {
			type: String,
		},
	},
	mounted() {
		console.log('mounted called!!!!');
	},
});

test('increments value on click', async () => {

	const r = render(FakeComponent, {
		props: {
			mode: 'runOnceForAllItems',
			jsCode: '',
		},
	});

});
