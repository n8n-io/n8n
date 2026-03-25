const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Collection_Collection = require('../Collection/Collection.cjs');
const require_Listbox_ListboxRoot = require('./ListboxRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_shared = require_rolldown_runtime.__toESM(require("@vueuse/shared"));

//#region src/Listbox/ListboxContent.vue?vue&type=script&setup=true&lang.ts
var ListboxContent_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "ListboxContent",
	props: {
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false
		}
	},
	setup(__props) {
		const { CollectionSlot } = require_Collection_Collection.useCollection();
		const rootContext = require_Listbox_ListboxRoot.injectListboxRootContext();
		const isClickFocus = (0, __vueuse_shared.refAutoReset)(false, 10);
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(CollectionSlot), null, {
				default: (0, vue.withCtx)(() => [(0, vue.createVNode)((0, vue.unref)(require_Primitive_Primitive.Primitive), {
					role: "listbox",
					as: _ctx.as,
					"as-child": _ctx.asChild,
					tabindex: (0, vue.unref)(rootContext).focusable.value ? (0, vue.unref)(rootContext).highlightedElement.value ? "-1" : "0" : void 0,
					"aria-orientation": (0, vue.unref)(rootContext).orientation.value,
					"aria-multiselectable": !!(0, vue.unref)(rootContext).multiple.value,
					"data-orientation": (0, vue.unref)(rootContext).orientation.value,
					onMousedown: _cache[0] || (_cache[0] = (0, vue.withModifiers)(($event) => isClickFocus.value = true, ["left"])),
					onFocus: _cache[1] || (_cache[1] = (ev) => {
						if ((0, vue.unref)(isClickFocus)) return;
						(0, vue.unref)(rootContext).onEnter(ev);
					}),
					onKeydown: [
						_cache[2] || (_cache[2] = (0, vue.withKeys)((0, vue.withModifiers)((event) => {
							(0, vue.unref)(rootContext).focusable.value && (0, vue.unref)(rootContext).onKeydownNavigation(event);
						}, ["prevent"]), [
							"down",
							"up",
							"left",
							"right",
							"home",
							"end"
						])),
						(0, vue.withKeys)((0, vue.unref)(rootContext).onKeydownEnter, ["enter"]),
						(0, vue.unref)(rootContext).onKeydownTypeAhead
					]
				}, {
					default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
					_: 3
				}, 8, [
					"as",
					"as-child",
					"tabindex",
					"aria-orientation",
					"aria-multiselectable",
					"data-orientation",
					"onKeydown"
				])]),
				_: 3
			});
		};
	}
});

//#endregion
//#region src/Listbox/ListboxContent.vue
var ListboxContent_default = ListboxContent_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'ListboxContent_default', {
  enumerable: true,
  get: function () {
    return ListboxContent_default;
  }
});
//# sourceMappingURL=ListboxContent.cjs.map