import { createContext } from "../shared/createContext.js";
import { isNullish } from "../shared/nullish.js";
import { getDefaultTime, isBefore } from "../date/comparators.js";
import { normalizeDateStep, normalizeHourCycle } from "../date/utils.js";
import { useDateFormatter } from "../shared/useDateFormatter.js";
import { useDirection } from "../shared/useDirection.js";
import { useKbd } from "../shared/useKbd.js";
import { useLocale } from "../shared/useLocale.js";
import { Primitive } from "../Primitive/Primitive.js";
import { usePrimitiveElement } from "../Primitive/usePrimitiveElement.js";
import { createContent, initializeTimeSegmentValues, syncTimeSegmentValues } from "../date/parser.js";
import { getTimeFieldSegmentElements, isSegmentNavigationKey } from "../date/segment.js";
import { VisuallyHidden_default } from "../VisuallyHidden/VisuallyHidden.js";
import { computed, createBlock, createVNode, defineComponent, mergeProps, nextTick, onMounted, openBlock, ref, renderSlot, toRefs, unref, watch, withCtx, withKeys } from "vue";
import { useVModel } from "@vueuse/core";
import { Time, getLocalTimeZone, isEqualDay, toCalendarDateTime, today } from "@internationalized/date";

//#region src/TimeField/TimeFieldRoot.vue?vue&type=script&setup=true&lang.ts
const [injectTimeFieldRootContext, provideTimeFieldRootContext] = createContext("TimeFieldRoot");
function convertValue(value, date = today(getLocalTimeZone())) {
	if (value && "day" in value) return value;
	return toCalendarDateTime(date, value);
}
var TimeFieldRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	inheritAttrs: false,
	__name: "TimeFieldRoot",
	props: {
		defaultValue: {
			type: Object,
			required: false,
			default: void 0
		},
		defaultPlaceholder: {
			type: Object,
			required: false
		},
		placeholder: {
			type: Object,
			required: false,
			default: void 0
		},
		modelValue: {
			type: [Object, null],
			required: false
		},
		hourCycle: {
			type: null,
			required: false
		},
		step: {
			type: Object,
			required: false
		},
		granularity: {
			type: String,
			required: false
		},
		hideTimeZone: {
			type: Boolean,
			required: false
		},
		maxValue: {
			type: Object,
			required: false
		},
		minValue: {
			type: Object,
			required: false
		},
		locale: {
			type: String,
			required: false
		},
		disabled: {
			type: Boolean,
			required: false,
			default: false
		},
		readonly: {
			type: Boolean,
			required: false,
			default: false
		},
		id: {
			type: String,
			required: false
		},
		dir: {
			type: String,
			required: false
		},
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false
		},
		name: {
			type: String,
			required: false
		},
		required: {
			type: Boolean,
			required: false
		}
	},
	emits: ["update:modelValue", "update:placeholder"],
	setup(__props, { expose: __expose, emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const { disabled, readonly, granularity, defaultValue, minValue, maxValue, dir: propDir, locale: propLocale } = toRefs(props);
		const locale = useLocale(propLocale);
		const dir = useDirection(propDir);
		const formatter = useDateFormatter(locale.value, { hourCycle: normalizeHourCycle(props.hourCycle) });
		const { primitiveElement, currentElement: parentElement } = usePrimitiveElement();
		const segmentElements = ref(/* @__PURE__ */ new Set());
		const step = computed(() => normalizeDateStep(props));
		const convertedMinValue = computed(() => minValue.value ? convertValue(minValue.value) : void 0);
		const convertedMaxValue = computed(() => maxValue.value ? convertValue(maxValue.value) : void 0);
		onMounted(() => {
			getTimeFieldSegmentElements(parentElement.value).forEach((item) => segmentElements.value.add(item));
		});
		const modelValue = useVModel(props, "modelValue", emits, {
			defaultValue: defaultValue.value,
			passive: props.modelValue === void 0
		});
		const convertedModelValue = computed({
			get() {
				if (isNullish(modelValue.value)) return modelValue.value;
				return convertValue(modelValue.value);
			},
			set(newValue) {
				if (newValue) modelValue.value = modelValue.value && "day" in modelValue.value ? newValue : new Time(newValue.hour, newValue.minute, newValue.second, modelValue.value?.millisecond);
				else modelValue.value = newValue;
				return newValue;
			}
		});
		const defaultDate = getDefaultTime({
			defaultPlaceholder: props.placeholder,
			defaultValue: modelValue.value
		});
		const placeholder = useVModel(props, "placeholder", emits, {
			defaultValue: props.defaultPlaceholder ?? defaultDate.copy(),
			passive: props.placeholder === void 0
		});
		const convertedPlaceholder = computed({
			get() {
				return convertValue(placeholder.value);
			},
			set(newValue) {
				if (newValue) placeholder.value = "day" in placeholder.value ? newValue.copy() : new Time(newValue.hour, newValue.minute, newValue.second, placeholder.value?.millisecond);
				return newValue;
			}
		});
		const inferredGranularity = computed(() => {
			if (granularity.value) return granularity.value;
			return "minute";
		});
		const isInvalid = computed(() => {
			if (!modelValue.value) return false;
			if (convertedMinValue.value && isBefore(convertedModelValue.value, convertedMinValue.value)) return true;
			if (convertedMaxValue.value && isBefore(convertedMaxValue.value, convertedModelValue.value)) return true;
			return false;
		});
		const initialSegments = initializeTimeSegmentValues(inferredGranularity.value);
		const segmentValues = ref(modelValue.value ? { ...syncTimeSegmentValues({
			value: convertedModelValue.value,
			formatter
		}) } : { ...initialSegments });
		const allSegmentContent = computed(() => createContent({
			granularity: inferredGranularity.value,
			dateRef: convertedPlaceholder.value,
			formatter,
			hideTimeZone: props.hideTimeZone,
			hourCycle: props.hourCycle,
			segmentValues: segmentValues.value,
			locale,
			isTimeValue: true
		}));
		const segmentContents = computed(() => allSegmentContent.value.arr);
		const editableSegmentContents = computed(() => segmentContents.value.filter(({ part }) => part !== "literal"));
		watch(locale, (value) => {
			if (formatter.getLocale() !== value) {
				formatter.setLocale(value);
				nextTick(() => {
					segmentElements.value.clear();
					getTimeFieldSegmentElements(parentElement.value).forEach((item) => segmentElements.value.add(item));
				});
			}
		});
		watch(convertedModelValue, (_modelValue) => {
			if (!isNullish(_modelValue) && (!isEqualDay(convertedPlaceholder.value, _modelValue) || convertedPlaceholder.value.compare(_modelValue) !== 0)) placeholder.value = _modelValue.copy();
		});
		watch([convertedModelValue, locale], ([_modelValue]) => {
			if (!isNullish(_modelValue)) segmentValues.value = { ...syncTimeSegmentValues({
				value: _modelValue,
				formatter
			}) };
			else if (Object.values(segmentValues.value).every((value) => value !== null) && isNullish(_modelValue)) segmentValues.value = { ...initialSegments };
		});
		const currentFocusedElement = ref(null);
		const currentSegmentIndex = computed(() => Array.from(segmentElements.value).findIndex((el) => el.getAttribute("data-reka-time-field-segment") === currentFocusedElement.value?.getAttribute("data-reka-time-field-segment")));
		const nextFocusableSegment = computed(() => {
			const sign = dir.value === "rtl" ? -1 : 1;
			const nextCondition = sign < 0 ? currentSegmentIndex.value < 0 : currentSegmentIndex.value > segmentElements.value.size - 1;
			if (nextCondition) return null;
			const segmentToFocus = Array.from(segmentElements.value)[currentSegmentIndex.value + sign];
			return segmentToFocus;
		});
		const prevFocusableSegment = computed(() => {
			const sign = dir.value === "rtl" ? -1 : 1;
			const prevCondition = sign > 0 ? currentSegmentIndex.value < 0 : currentSegmentIndex.value > segmentElements.value.size - 1;
			if (prevCondition) return null;
			const segmentToFocus = Array.from(segmentElements.value)[currentSegmentIndex.value - sign];
			return segmentToFocus;
		});
		const kbd = useKbd();
		function handleKeydown(e) {
			if (!isSegmentNavigationKey(e.key)) return;
			if (e.key === kbd.ARROW_LEFT) prevFocusableSegment.value?.focus();
			if (e.key === kbd.ARROW_RIGHT) nextFocusableSegment.value?.focus();
		}
		function setFocusedElement(el) {
			currentFocusedElement.value = el;
		}
		provideTimeFieldRootContext({
			locale,
			modelValue: convertedModelValue,
			placeholder: convertedPlaceholder,
			disabled,
			formatter,
			hourCycle: props.hourCycle,
			step,
			readonly,
			segmentValues,
			isInvalid,
			segmentContents: editableSegmentContents,
			elements: segmentElements,
			setFocusedElement,
			focusNext() {
				nextFocusableSegment.value?.focus();
			}
		});
		__expose({ setFocusedElement });
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Primitive), mergeProps(_ctx.$attrs, {
				ref_key: "primitiveElement",
				ref: primitiveElement,
				role: "group",
				"aria-disabled": unref(disabled) ? true : void 0,
				"data-disabled": unref(disabled) ? "" : void 0,
				"data-readonly": unref(readonly) ? "" : void 0,
				"data-invalid": isInvalid.value ? "" : void 0,
				dir: unref(dir),
				onKeydown: withKeys(handleKeydown, ["left", "right"])
			}), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default", {
					modelValue: unref(modelValue),
					segments: segmentContents.value,
					isInvalid: isInvalid.value
				}), createVNode(unref(VisuallyHidden_default), {
					id: _ctx.id,
					as: "input",
					feature: "focusable",
					tabindex: "-1",
					value: unref(modelValue) ? unref(modelValue).toString() : "",
					name: _ctx.name,
					disabled: unref(disabled),
					required: _ctx.required,
					onFocus: _cache[0] || (_cache[0] = ($event) => Array.from(segmentElements.value)?.[0]?.focus())
				}, null, 8, [
					"id",
					"value",
					"name",
					"disabled",
					"required"
				])]),
				_: 3
			}, 16, [
				"aria-disabled",
				"data-disabled",
				"data-readonly",
				"data-invalid",
				"dir"
			]);
		};
	}
});

//#endregion
//#region src/TimeField/TimeFieldRoot.vue
var TimeFieldRoot_default = TimeFieldRoot_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { TimeFieldRoot_default, injectTimeFieldRootContext };
//# sourceMappingURL=TimeFieldRoot.js.map