import { useEmitAsProps } from "./useEmitAsProps.js";
import { useForwardProps } from "./useForwardProps.js";
import { computed } from "vue";

//#region src/shared/useForwardPropsEmits.ts
/**
* The function `useForwardPropsEmits` takes in props and an optional emit function, and returns a
* computed object that combines the parsed props and emits as props.
* @param {T} props - The `props` parameter is of type `T`, which is a generic type that extends the
* parameters of the `useForwardProps` function. It represents the props object that is passed to the
* `useForwardProps` function.
* @param [emit] - The `emit` parameter is a function that can be used to emit events. It takes two
* arguments: `name`, which is the name of the event to be emitted, and `args`, which are the arguments
* to be passed along with the event.
* @returns a computed property that combines the parsed
* props and emits as props.
*/
function useForwardPropsEmits(props, emit) {
	const parsedProps = useForwardProps(props);
	const emitsAsProps = emit ? useEmitAsProps(emit) : {};
	return computed(() => ({
		...parsedProps.value,
		...emitsAsProps
	}));
}

//#endregion
export { useForwardPropsEmits };
//# sourceMappingURL=useForwardPropsEmits.js.map