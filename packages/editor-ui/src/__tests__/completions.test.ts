import { render, screen, fireEvent } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { mount } from '@vue/test-utils';
import CodeNodeEditor from '@/components/CodeNodeEditor/CodeNodeEditor.vue';
import { store } from '@/store';
import Vue from 'vue';
import mixins from 'vue-typed-mixins';
import { completerExtension } from '@/components/CodeNodeEditor/completer';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { baseExtensions } from '@/components/CodeNodeEditor/baseExtensions';
import { copyPaste } from '@/components/mixins/copyPaste';

// https://testing-library.com/docs/vue-testing-library/api/#rendercomponent-options

const FakeComponent2 = new Vue({
	template: `<div>hello</div>`,
	mounted() {
		console.log('MOUNTED CALLED');
	},
});

const FakeComponent = mixins(completerExtension).extend({
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
		console.error('------------ mounted --------------');
		const state = EditorState.create({
			doc: this.jsCode,
			extensions: [
				...baseExtensions,
				// ...stateBasedExtensions,
				// CODE_NODE_EDITOR_THEME,
				// javascript(),
				this.autocompletionExtension(),
			],
		});

		this.editor = new EditorView({
			parent: this.$refs.codeNodeEditor as HTMLDivElement,
			state,
		});
	},
});

test('increments value on click', async () => {
	// const wrapper = mount(CodeNodeEditor, {
	// 	// store: {
	// 	// 	getters: {
	// 	// 		allNodes: () => [],
	// 	// 	},
	// 	// },
	// 	propsData: {
	// 		mode: 'runOnceForAllItems',
	// 		isReadOnly: false,
	// 		jsCode: '$execution',
	// 	},
	// });

	// 1. manipulating DOM and collecting result from DOM
	// 2. internal state -> n8n completions
	// [3] keyboard events and collecting result from DOM -> closest to user experience!

	const r = render(FakeComponent, {
		props: {
			mode: 'runOnceForAllItems',
			jsCode: '',
		},
	});

	const lw = r.container.querySelector('div.cm-content.cm-lineWrapping');

	await new Promise((resolve) => {
		setTimeout(() => {
			resolve(true);
		}, 1000);
	});

	// r.debug(lw!);

	const textBox = r.getByRole('textbox');

	r.debug(textBox);

	await userEvent.click(textBox);

	await userEvent.keyboard('$execution');
	await userEvent.keyboard('.');
	await fireEvent.keyDown(textBox);
	// await userEvent.keyboard('.');
	// await userEvent.type(textBox, { init });
	// $execution

	// https://discuss.codemirror.net/t/how-to-write-tests-for-events-in-code-mirror/3740/3
	// browser events


	const parentCm = r.container.querySelector('.cm-editor');

	r.debug(parentCm!);

	// without shift
	// userEvent.keyboard('{Tab}');

	// mount component with jsCode -> OK
	// find input containing jsCode -> OK
	// append . to jsCode -> re-render component with new props
	// press enter
	// check resulting jsCode

	// @vue/test-utils ----------------------

	// @ts-ignore
	// console.log(wrapper.vm.jsCode);

	// await wrapper.setProps({ jsCode: '$execution.' });

	// console.log(wrapper.vm.jsCode);

	// @testing-library/vue ----------------------

	// const textBox = r.getByRole('textbox');

	// const span = textBox.querySelector('span');

	// if (!span) return;

	// // r.debug(span);

	// span.textContent += '.';

	// await fireEvent.update(span, '123');

	// r.debug(span);

	// r.debug(textBox);

	// console.log(q);

	// const x = await r.findByText('$execution.');
	// console.log(x);

	//

	// r.debug(textBox);

	// console.log(textBox.classList);

	// await fireEvent.click()

	// console.log(textBox.textContent);
	// textBox.textContent += '123';
	// console.log(textBox.textContent);
	// const button = r.getByText('xyz');
	// await fireEvent.input()

	// console.log(button);
});
