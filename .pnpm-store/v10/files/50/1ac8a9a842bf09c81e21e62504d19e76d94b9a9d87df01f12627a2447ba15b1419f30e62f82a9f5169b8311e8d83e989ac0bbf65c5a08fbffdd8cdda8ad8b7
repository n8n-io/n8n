const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardPropsEmits = require('../shared/useForwardPropsEmits.cjs');
const require_Presence_Presence = require('../Presence/Presence.cjs');
const require_Select_SelectRoot = require('./SelectRoot.cjs');
const require_Select_SelectContentImpl = require('./SelectContentImpl.cjs');
const require_Select_SelectProvider = require('./SelectProvider.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Select/SelectContent.vue?vue&type=script&setup=true&lang.ts
const _hoisted_1 = { key: 1 };
var SelectContent_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	inheritAttrs: false,
	__name: "SelectContent",
	props: {
		forceMount: {
			type: Boolean,
			required: false
		},
		position: {
			type: String,
			required: false
		},
		bodyLock: {
			type: Boolean,
			required: false
		},
		side: {
			type: null,
			required: false
		},
		sideOffset: {
			type: Number,
			required: false
		},
		sideFlip: {
			type: Boolean,
			required: false
		},
		align: {
			type: null,
			required: false
		},
		alignOffset: {
			type: Number,
			required: false
		},
		alignFlip: {
			type: Boolean,
			required: false
		},
		avoidCollisions: {
			type: Boolean,
			required: false
		},
		collisionBoundary: {
			type: null,
			required: false
		},
		collisionPadding: {
			type: [Number, Object],
			required: false
		},
		arrowPadding: {
			type: Number,
			required: false
		},
		sticky: {
			type: String,
			required: false
		},
		hideWhenDetached: {
			type: Boolean,
			required: false
		},
		positionStrategy: {
			type: String,
			required: false
		},
		updatePositionStrategy: {
			type: String,
			required: false
		},
		disableUpdateOnLayoutShift: {
			type: Boolean,
			required: false
		},
		prioritizePosition: {
			type: Boolean,
			required: false
		},
		reference: {
			type: null,
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
	emits: [
		"closeAutoFocus",
		"escapeKeyDown",
		"pointerDownOutside"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const forwarded = require_shared_useForwardPropsEmits.useForwardPropsEmits(props, emits);
		const rootContext = require_Select_SelectRoot.injectSelectRootContext();
		const fragment = (0, vue.ref)();
		(0, vue.onMounted)(() => {
			fragment.value = new DocumentFragment();
		});
		const presenceRef = (0, vue.ref)();
		const present = (0, vue.computed)(() => props.forceMount || rootContext.open.value);
		const renderPresence = (0, vue.ref)(present.value);
		(0, vue.watch)(present, () => {
			setTimeout(() => renderPresence.value = present.value);
		});
		return (_ctx, _cache) => {
			return present.value || renderPresence.value || presenceRef.value?.present ? ((0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Presence_Presence.Presence_default), {
				key: 0,
				ref_key: "presenceRef",
				ref: presenceRef,
				present: present.value
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.createVNode)(require_Select_SelectContentImpl.SelectContentImpl_default, (0, vue.normalizeProps)((0, vue.guardReactiveProps)({
					...(0, vue.unref)(forwarded),
					..._ctx.$attrs
				})), {
					default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
					_: 3
				}, 16)]),
				_: 3
			}, 8, ["present"])) : fragment.value ? ((0, vue.openBlock)(), (0, vue.createElementBlock)("div", _hoisted_1, [((0, vue.openBlock)(), (0, vue.createBlock)(vue.Teleport, { to: fragment.value }, [(0, vue.createVNode)(require_Select_SelectProvider.SelectProvider_default, { context: (0, vue.unref)(rootContext) }, {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 8, ["context"])], 8, ["to"]))])) : (0, vue.createCommentVNode)("v-if", true);
		};
	}
});

//#endregion
//#region src/Select/SelectContent.vue
var SelectContent_default = SelectContent_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'SelectContent_default', {
  enumerable: true,
  get: function () {
    return SelectContent_default;
  }
});
//# sourceMappingURL=SelectContent.cjs.map