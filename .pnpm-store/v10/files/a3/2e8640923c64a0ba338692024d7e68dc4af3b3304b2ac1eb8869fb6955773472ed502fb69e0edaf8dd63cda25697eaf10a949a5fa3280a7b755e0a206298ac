import { useForwardExpose } from "../shared/useForwardExpose.js";
import { Primitive } from "../Primitive/Primitive.js";
import { useCollection } from "../Collection/Collection.js";
import { EVENT_ROOT_CONTENT_DISMISS, LINK_SELECT } from "./utils.js";
import { createBlock, createVNode, defineComponent, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/NavigationMenu/NavigationMenuLink.vue?vue&type=script&setup=true&lang.ts
var NavigationMenuLink_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
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
		const { CollectionItem } = useCollection({ key: "NavigationMenu" });
		useForwardExpose();
		async function handleClick(ev) {
			const linkSelectEvent = new CustomEvent(LINK_SELECT, {
				bubbles: true,
				cancelable: true,
				detail: { originalEvent: ev }
			});
			emits("select", linkSelectEvent);
			if (!linkSelectEvent.defaultPrevented && !ev.metaKey) {
				const rootContentDismissEvent = new CustomEvent(EVENT_ROOT_CONTENT_DISMISS, {
					bubbles: true,
					cancelable: true
				});
				ev.target?.dispatchEvent(rootContentDismissEvent);
			}
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(CollectionItem), null, {
				default: withCtx(() => [createVNode(unref(Primitive), {
					as: _ctx.as,
					"data-active": _ctx.active ? "" : void 0,
					"aria-current": _ctx.active ? "page" : void 0,
					"as-child": props.asChild,
					onClick: handleClick
				}, {
					default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
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
export { NavigationMenuLink_default };
//# sourceMappingURL=NavigationMenuLink.js.map