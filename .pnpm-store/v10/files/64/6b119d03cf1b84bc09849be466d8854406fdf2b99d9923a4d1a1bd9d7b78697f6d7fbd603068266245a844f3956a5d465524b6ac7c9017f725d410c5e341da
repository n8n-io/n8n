const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_TagsInput_TagsInputRoot = require('./TagsInputRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/TagsInput/TagsInputInput.vue?vue&type=script&setup=true&lang.ts
var TagsInputInput_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "TagsInputInput",
	props: {
		placeholder: {
			type: String,
			required: false
		},
		autoFocus: {
			type: Boolean,
			required: false
		},
		maxLength: {
			type: Number,
			required: false
		},
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false,
			default: "input"
		}
	},
	setup(__props) {
		const props = __props;
		const context = require_TagsInput_TagsInputRoot.injectTagsInputRootContext();
		const { forwardRef, currentElement } = require_shared_useForwardExpose.useForwardExpose();
		function handleBlur(event) {
			context.selectedElement.value = void 0;
			if (!context.addOnBlur.value) return;
			const target = event.target;
			if (!target.value) return;
			const isAdded = context.onAddValue(target.value);
			if (isAdded) target.value = "";
		}
		function handleTab(event) {
			if (!context.addOnTab.value) return;
			handleCustomKeydown(event);
		}
		const isComposing = (0, vue.ref)(false);
		function onCompositionStart() {
			isComposing.value = true;
		}
		function onCompositionEnd() {
			(0, vue.nextTick)(() => {
				isComposing.value = false;
			});
		}
		async function handleCustomKeydown(event) {
			if (isComposing.value) return;
			await (0, vue.nextTick)();
			if (event.defaultPrevented) return;
			const target = event.target;
			if (!target.value) return;
			const isAdded = context.onAddValue(target.value);
			if (isAdded) target.value = "";
			event.preventDefault();
		}
		function handleInput(event) {
			context.isInvalidInput.value = false;
			if (event.data === null) return;
			const delimiter = context.delimiter.value;
			const matchesDelimiter = delimiter === event.data || delimiter instanceof RegExp && delimiter.test(event.data);
			if (matchesDelimiter) {
				const target = event.target;
				target.value = target.value.replace(delimiter, "");
				const isAdded = context.onAddValue(target.value);
				if (isAdded) target.value = "";
			}
		}
		function handlePaste(event) {
			if (context.addOnPaste.value) {
				event.preventDefault();
				const clipboardData = event.clipboardData;
				if (!clipboardData) return;
				const value = clipboardData.getData("text");
				if (context.delimiter.value) {
					const splitValue = value.split(context.delimiter.value);
					splitValue.forEach((v) => {
						context.onAddValue(v);
					});
				} else context.onAddValue(value);
			}
		}
		(0, vue.onMounted)(() => {
			const inputEl = currentElement.value.nodeName === "INPUT" ? currentElement.value : currentElement.value.querySelector("input");
			if (!inputEl) return;
			setTimeout(() => {
				if (props.autoFocus) inputEl?.focus();
			}, 1);
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), {
				id: (0, vue.unref)(context).id?.value,
				ref: (0, vue.unref)(forwardRef),
				type: "text",
				autocomplete: "off",
				autocorrect: "off",
				autocapitalize: "off",
				as: _ctx.as,
				"as-child": _ctx.asChild,
				maxlength: _ctx.maxLength,
				placeholder: _ctx.placeholder,
				disabled: (0, vue.unref)(context).disabled.value,
				"data-invalid": (0, vue.unref)(context).isInvalidInput.value ? "" : void 0,
				onInput: handleInput,
				onKeydown: [
					(0, vue.withKeys)(handleCustomKeydown, ["enter"]),
					(0, vue.withKeys)(handleTab, ["tab"]),
					(0, vue.unref)(context).onInputKeydown
				],
				onBlur: handleBlur,
				onCompositionstart: onCompositionStart,
				onCompositionend: onCompositionEnd,
				onPaste: handlePaste
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 8, [
				"id",
				"as",
				"as-child",
				"maxlength",
				"placeholder",
				"disabled",
				"data-invalid",
				"onKeydown"
			]);
		};
	}
});

//#endregion
//#region src/TagsInput/TagsInputInput.vue
var TagsInputInput_default = TagsInputInput_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'TagsInputInput_default', {
  enumerable: true,
  get: function () {
    return TagsInputInput_default;
  }
});
//# sourceMappingURL=TagsInputInput.cjs.map