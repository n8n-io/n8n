const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/shared/useEmitAsProps.ts
/**
* The `useEmitAsProps` function is a TypeScript utility that converts emitted events into props for a
* Vue component.
* @param emit - The `emit` parameter is a function that is used to emit events from a component. It
* takes two parameters: `name` which is the name of the event to be emitted, and `...args` which are
* the arguments to be passed along with the event.
* @returns The function `useEmitAsProps` returns an object that maps event names to functions that
* call the `emit` function with the corresponding event name and arguments.
*/
function useEmitAsProps(emit) {
	const vm = (0, vue.getCurrentInstance)();
	const events = vm?.type.emits;
	const result = {};
	if (!events?.length) console.warn(`No emitted event found. Please check component: ${vm?.type.__name}`);
	events?.forEach((ev) => {
		result[(0, vue.toHandlerKey)((0, vue.camelize)(ev))] = (...arg) => emit(ev, ...arg);
	});
	return result;
}

//#endregion
Object.defineProperty(exports, 'useEmitAsProps', {
  enumerable: true,
  get: function () {
    return useEmitAsProps;
  }
});
//# sourceMappingURL=useEmitAsProps.cjs.map