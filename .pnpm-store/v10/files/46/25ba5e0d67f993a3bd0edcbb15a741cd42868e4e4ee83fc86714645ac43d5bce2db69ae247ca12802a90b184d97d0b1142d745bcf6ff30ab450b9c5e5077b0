const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('./useForwardExpose.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/shared/withDefault.ts
function withDefault(WrappedComponent, options) {
	return {
		inheritAttrs: false,
		name: `${WrappedComponent.__name ?? ""}Wrapper`,
		setup(_, ctx) {
			return () => {
				const optionProps = typeof options?.props === "function" ? options?.props(ctx.attrs) : options?.props;
				const { forwardRef } = require_shared_useForwardExpose.useForwardExpose();
				const mergedProps = (0, vue.mergeProps)(optionProps, ctx.attrs);
				return (0, vue.h)(WrappedComponent, {
					...mergedProps,
					ref: forwardRef
				}, ctx.slots);
			};
		}
	};
}

//#endregion
Object.defineProperty(exports, 'withDefault', {
  enumerable: true,
  get: function () {
    return withDefault;
  }
});
//# sourceMappingURL=withDefault.cjs.map