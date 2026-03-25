import { useForwardExpose } from "./useForwardExpose.js";
import { h, mergeProps } from "vue";

//#region src/shared/withDefault.ts
function withDefault(WrappedComponent, options) {
	return {
		inheritAttrs: false,
		name: `${WrappedComponent.__name ?? ""}Wrapper`,
		setup(_, ctx) {
			return () => {
				const optionProps = typeof options?.props === "function" ? options?.props(ctx.attrs) : options?.props;
				const { forwardRef } = useForwardExpose();
				const mergedProps = mergeProps(optionProps, ctx.attrs);
				return h(WrappedComponent, {
					...mergedProps,
					ref: forwardRef
				}, ctx.slots);
			};
		}
	};
}

//#endregion
export { withDefault };
//# sourceMappingURL=withDefault.js.map