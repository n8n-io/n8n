const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useKbd = require('../shared/useKbd.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Primitive_usePrimitiveElement = require('../Primitive/usePrimitiveElement.cjs');
const require_Editable_EditableRoot = require('./EditableRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Editable/EditableInput.vue?vue&type=script&setup=true&lang.ts
var EditableInput_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "EditableInput",
	props: {
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
		const kbd = require_shared_useKbd.useKbd();
		const context = require_Editable_EditableRoot.injectEditableRootContext();
		const disabled = (0, vue.computed)(() => context.disabled.value);
		const placeholder = (0, vue.computed)(() => context.placeholder.value?.edit);
		const { primitiveElement, currentElement: inputRef } = require_Primitive_usePrimitiveElement.usePrimitiveElement();
		(0, vue.onMounted)(() => {
			context.inputRef.value = inputRef.value;
			if (context.startWithEditMode.value) {
				context.inputRef.value?.focus({ preventScroll: true });
				if (context.selectOnFocus.value) context.inputRef.value?.select();
			}
		});
		(0, vue.watch)(context.isEditing, (value) => {
			if (value) (0, vue.nextTick)(() => {
				context.inputRef.value?.focus({ preventScroll: true });
				if (context.selectOnFocus.value) context.inputRef.value?.select();
			});
		});
		function handleSubmitKeyDown(event) {
			if ((context.submitMode.value === "enter" || context.submitMode.value === "both") && event.key === kbd.ENTER && !event.shiftKey && !event.metaKey) context.submit();
		}
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), (0, vue.mergeProps)({
				ref_key: "primitiveElement",
				ref: primitiveElement
			}, props, {
				value: (0, vue.unref)(context).inputValue.value,
				placeholder: placeholder.value,
				disabled: disabled.value,
				maxlength: (0, vue.unref)(context).maxLength.value,
				"data-disabled": disabled.value ? "" : void 0,
				"data-readonly": (0, vue.unref)(context).readonly.value ? "" : void 0,
				readonly: (0, vue.unref)(context).readonly.value,
				"aria-label": "editable input",
				hidden: (0, vue.unref)(context).autoResize.value ? void 0 : !(0, vue.unref)(context).isEditing.value,
				style: (0, vue.unref)(context).autoResize.value ? {
					all: "unset",
					gridArea: "1 / 1 / auto / auto",
					visibility: !(0, vue.unref)(context).isEditing.value ? "hidden" : void 0
				} : void 0,
				onInput: _cache[0] || (_cache[0] = ($event) => (0, vue.unref)(context).inputValue.value = $event.target.value),
				onKeydown: [(0, vue.withKeys)(handleSubmitKeyDown, ["enter", "space"]), (0, vue.withKeys)((0, vue.unref)(context).cancel, ["esc"])]
			}), {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16, [
				"value",
				"placeholder",
				"disabled",
				"maxlength",
				"data-disabled",
				"data-readonly",
				"readonly",
				"hidden",
				"style",
				"onKeydown"
			]);
		};
	}
});

//#endregion
//#region src/Editable/EditableInput.vue
var EditableInput_default = EditableInput_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'EditableInput_default', {
  enumerable: true,
  get: function () {
    return EditableInput_default;
  }
});
//# sourceMappingURL=EditableInput.cjs.map