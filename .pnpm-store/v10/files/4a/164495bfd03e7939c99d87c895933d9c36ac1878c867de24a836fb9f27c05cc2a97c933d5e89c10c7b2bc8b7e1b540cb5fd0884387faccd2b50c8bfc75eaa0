const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));
const __vueuse_shared = require_rolldown_runtime.__toESM(require("@vueuse/shared"));
const __internationalized_number = require_rolldown_runtime.__toESM(require("@internationalized/number"));

//#region src/NumberField/utils.ts
function usePressedHold(options) {
	const { disabled } = options;
	const timeout = (0, vue.ref)();
	const triggerHook = (0, __vueuse_shared.createEventHook)();
	const resetTimeout = () => window.clearTimeout(timeout.value);
	const onIncrementPressStart = (delay) => {
		resetTimeout();
		if (disabled.value) return;
		triggerHook.trigger();
		timeout.value = window.setTimeout(() => {
			onIncrementPressStart(60);
		}, delay);
	};
	const handlePressStart = () => {
		onIncrementPressStart(400);
	};
	const handlePressEnd = () => {
		resetTimeout();
	};
	const isPressed = (0, vue.ref)(false);
	const target = (0, vue.computed)(() => (0, __vueuse_core.unrefElement)(options.target));
	const onPressStart = (event) => {
		if (event.button !== 0 || isPressed.value) return;
		event.preventDefault();
		isPressed.value = true;
		handlePressStart();
	};
	const onPressRelease = () => {
		isPressed.value = false;
		handlePressEnd();
	};
	if (__vueuse_shared.isClient) {
		(0, __vueuse_core.useEventListener)(target || window, "pointerdown", onPressStart);
		(0, __vueuse_core.useEventListener)(window, "pointerup", onPressRelease);
		(0, __vueuse_core.useEventListener)(window, "pointercancel", onPressRelease);
	}
	return {
		isPressed,
		onTrigger: triggerHook.on
	};
}
function useNumberFormatter(locale, options = (0, vue.ref)({})) {
	return (0, __vueuse_shared.reactiveComputed)(() => new __internationalized_number.NumberFormatter(locale.value, options.value));
}
function useNumberParser(locale, options = (0, vue.ref)({})) {
	return (0, __vueuse_shared.reactiveComputed)(() => new __internationalized_number.NumberParser(locale.value, options.value));
}
function handleDecimalOperation(operator, value1, value2) {
	let result = operator === "+" ? value1 + value2 : value1 - value2;
	if (value1 % 1 !== 0 || value2 % 1 !== 0) {
		const value1Decimal = value1.toString().split(".");
		const value2Decimal = value2.toString().split(".");
		const value1DecimalLength = value1Decimal[1] && value1Decimal[1].length || 0;
		const value2DecimalLength = value2Decimal[1] && value2Decimal[1].length || 0;
		const multiplier = 10 ** Math.max(value1DecimalLength, value2DecimalLength);
		value1 = Math.round(value1 * multiplier);
		value2 = Math.round(value2 * multiplier);
		result = operator === "+" ? value1 + value2 : value1 - value2;
		result /= multiplier;
	}
	return result;
}

//#endregion
Object.defineProperty(exports, 'handleDecimalOperation', {
  enumerable: true,
  get: function () {
    return handleDecimalOperation;
  }
});
Object.defineProperty(exports, 'useNumberFormatter', {
  enumerable: true,
  get: function () {
    return useNumberFormatter;
  }
});
Object.defineProperty(exports, 'useNumberParser', {
  enumerable: true,
  get: function () {
    return useNumberParser;
  }
});
Object.defineProperty(exports, 'usePressedHold', {
  enumerable: true,
  get: function () {
    return usePressedHold;
  }
});
//# sourceMappingURL=utils.cjs.map