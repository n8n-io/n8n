import { Slot } from "./Slot.js";
import { defineComponent, h } from "vue";

//#region src/Primitive/Primitive.ts
const SELF_CLOSING_TAGS = [
	"area",
	"img",
	"input"
];
const Primitive = defineComponent({
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
		if (typeof asTag === "string" && SELF_CLOSING_TAGS.includes(asTag)) return () => h(asTag, attrs);
		if (asTag !== "template") return () => h(props.as, attrs, { default: slots.default });
		return () => h(Slot, attrs, { default: slots.default });
	}
});

//#endregion
export { Primitive };
//# sourceMappingURL=Primitive.js.map