const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Menu_utils = require('./utils.cjs');
const require_Menu_MenuRoot = require('./MenuRoot.cjs');
const require_Menu_MenuContentImpl = require('./MenuContentImpl.cjs');
const require_Menu_MenuItemImpl = require('./MenuItemImpl.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Menu/MenuItem.vue?vue&type=script&setup=true&lang.ts
var MenuItem_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "MenuItem",
	props: {
		disabled: {
			type: Boolean,
			required: false
		},
		textValue: {
			type: String,
			required: false
		},
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false
		}
	},
	emits: ["select"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const { forwardRef, currentElement } = require_shared_useForwardExpose.useForwardExpose();
		const rootContext = require_Menu_MenuRoot.injectMenuRootContext();
		const contentContext = require_Menu_MenuContentImpl.injectMenuContentContext();
		const isPointerDownRef = (0, vue.ref)(false);
		async function handleSelect() {
			const menuItem = currentElement.value;
			if (!props.disabled && menuItem) {
				const itemSelectEvent = new CustomEvent(require_Menu_utils.ITEM_SELECT, {
					bubbles: true,
					cancelable: true
				});
				emits("select", itemSelectEvent);
				await (0, vue.nextTick)();
				if (itemSelectEvent.defaultPrevented) isPointerDownRef.value = false;
				else rootContext.onClose();
			}
		}
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)(require_Menu_MenuItemImpl.MenuItemImpl_default, (0, vue.mergeProps)(props, {
				ref: (0, vue.unref)(forwardRef),
				onClick: handleSelect,
				onPointerdown: _cache[0] || (_cache[0] = () => {
					isPointerDownRef.value = true;
				}),
				onPointerup: _cache[1] || (_cache[1] = async (event) => {
					await (0, vue.nextTick)();
					if (event.defaultPrevented) return;
					if (!isPointerDownRef.value) event.currentTarget?.click();
				}),
				onKeydown: _cache[2] || (_cache[2] = async (event) => {
					const isTypingAhead = (0, vue.unref)(contentContext).searchRef.value !== "";
					if (_ctx.disabled || isTypingAhead && event.key === " ") return;
					if ((0, vue.unref)(require_Menu_utils.SELECTION_KEYS).includes(event.key)) {
						event.currentTarget.click();
						/**
						* We prevent default browser behaviour for selection keys as they should trigger
						* a selection only:
						* - prevents space from scrolling the page.
						* - if keydown causes focus to move, prevents keydown from firing on the new target.
						*/
						event.preventDefault();
					}
				})
			}), {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16);
		};
	}
});

//#endregion
//#region src/Menu/MenuItem.vue
var MenuItem_default = MenuItem_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'MenuItem_default', {
  enumerable: true,
  get: function () {
    return MenuItem_default;
  }
});
//# sourceMappingURL=MenuItem.cjs.map