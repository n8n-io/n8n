import { createContext } from "../shared/createContext.js";
import { useDirection } from "../shared/useDirection.js";
import { useForwardExpose } from "../shared/useForwardExpose.js";
import { Primitive } from "../Primitive/Primitive.js";
import { useCollection } from "../Collection/Collection.js";
import { RovingFocusGroup_default } from "../RovingFocus/RovingFocusGroup.js";
import { createBlock, createVNode, defineComponent, openBlock, ref, renderSlot, toRefs, unref, withCtx } from "vue";
import { useVModel } from "@vueuse/core";

//#region src/Menubar/MenubarRoot.vue?vue&type=script&setup=true&lang.ts
const [injectMenubarRootContext, provideMenubarRootContext] = createContext("MenubarRoot");
var MenubarRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "MenubarRoot",
	props: {
		modelValue: {
			type: String,
			required: false
		},
		defaultValue: {
			type: String,
			required: false
		},
		dir: {
			type: String,
			required: false
		},
		loop: {
			type: Boolean,
			required: false,
			default: false
		}
	},
	emits: ["update:modelValue"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const { forwardRef } = useForwardExpose();
		const { CollectionSlot } = useCollection({
			key: "Menubar",
			isProvider: true
		});
		const modelValue = useVModel(props, "modelValue", emit, {
			defaultValue: props.defaultValue ?? "",
			passive: props.modelValue === void 0
		});
		const currentTabStopId = ref(null);
		const { dir: propDir, loop } = toRefs(props);
		const dir = useDirection(propDir);
		provideMenubarRootContext({
			modelValue,
			dir,
			loop,
			onMenuOpen: (value) => {
				modelValue.value = value;
				currentTabStopId.value = value;
			},
			onMenuClose: () => {
				modelValue.value = "";
			},
			onMenuToggle: (value) => {
				modelValue.value = modelValue.value ? "" : value;
				currentTabStopId.value = value;
			}
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(CollectionSlot), null, {
				default: withCtx(() => [createVNode(unref(RovingFocusGroup_default), {
					"current-tab-stop-id": currentTabStopId.value,
					"onUpdate:currentTabStopId": _cache[0] || (_cache[0] = ($event) => currentTabStopId.value = $event),
					orientation: "horizontal",
					loop: unref(loop),
					dir: unref(dir),
					"as-child": ""
				}, {
					default: withCtx(() => [createVNode(unref(Primitive), {
						ref: unref(forwardRef),
						role: "menubar"
					}, {
						default: withCtx(() => [renderSlot(_ctx.$slots, "default", { modelValue: unref(modelValue) })]),
						_: 3
					}, 512)]),
					_: 3
				}, 8, [
					"current-tab-stop-id",
					"loop",
					"dir"
				])]),
				_: 3
			});
		};
	}
});

//#endregion
//#region src/Menubar/MenubarRoot.vue
var MenubarRoot_default = MenubarRoot_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { MenubarRoot_default, injectMenubarRootContext };
//# sourceMappingURL=MenubarRoot.js.map