const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Collection_Collection = require('../Collection/Collection.cjs');
const require_NavigationMenu_utils = require('./utils.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/NavigationMenu/NavigationMenuLink.vue?vue&type=script&setup=true&lang.ts
var NavigationMenuLink_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "NavigationMenuLink",
	props: {
		active: {
			type: Boolean,
			required: false
		},
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false,
			default: "a"
		}
	},
	emits: ["select"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const { CollectionItem } = require_Collection_Collection.useCollection({ key: "NavigationMenu" });
		require_shared_useForwardExpose.useForwardExpose();
		async function handleClick(ev) {
			const linkSelectEvent = new CustomEvent(require_NavigationMenu_utils.LINK_SELECT, {
				bubbles: true,
				cancelable: true,
				detail: { originalEvent: ev }
			});
			emits("select", linkSelectEvent);
			if (!linkSelectEvent.defaultPrevented && !ev.metaKey) {
				const rootContentDismissEvent = new CustomEvent(require_NavigationMenu_utils.EVENT_ROOT_CONTENT_DISMISS, {
					bubbles: true,
					cancelable: true
				});
				ev.target?.dispatchEvent(rootContentDismissEvent);
			}
		}
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(CollectionItem), null, {
				default: (0, vue.withCtx)(() => [(0, vue.createVNode)((0, vue.unref)(require_Primitive_Primitive.Primitive), {
					as: _ctx.as,
					"data-active": _ctx.active ? "" : void 0,
					"aria-current": _ctx.active ? "page" : void 0,
					"as-child": props.asChild,
					onClick: handleClick
				}, {
					default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
					_: 3
				}, 8, [
					"as",
					"data-active",
					"aria-current",
					"as-child"
				])]),
				_: 3
			});
		};
	}
});

//#endregion
//#region src/NavigationMenu/NavigationMenuLink.vue
var NavigationMenuLink_default = NavigationMenuLink_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'NavigationMenuLink_default', {
  enumerable: true,
  get: function () {
    return NavigationMenuLink_default;
  }
});
//# sourceMappingURL=NavigationMenuLink.cjs.map