const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_Primitive_Slot = require('./Slot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Primitive/Primitive.ts
const SELF_CLOSING_TAGS = [
	"area",
	"img",
	"input"
];
const Primitive = (0, vue.defineComponent)({
	name: "Primitive",
	inheritAttrs: false,
	props: {
		asChild: {
			type: Boolean,
			default: false
		},
		as: {
			type: [String, Object],
			default: "div"
		}
	},
	setup(props, { attrs, slots }) {
		const asTag = props.asChild ? "template" : props.as;
		if (typeof asTag === "string" && SELF_CLOSING_TAGS.includes(asTag)) return () => (0, vue.h)(asTag, attrs);
		if (asTag !== "template") return () => (0, vue.h)(props.as, attrs, { default: slots.default });
		return () => (0, vue.h)(require_Primitive_Slot.Slot, attrs, { default: slots.default });
	}
});

//#endregion
Object.defineProperty(exports, 'Primitive', {
  enumerable: true,
  get: function () {
    return Primitive;
  }
});
//# sourceMappingURL=Primitive.cjs.map