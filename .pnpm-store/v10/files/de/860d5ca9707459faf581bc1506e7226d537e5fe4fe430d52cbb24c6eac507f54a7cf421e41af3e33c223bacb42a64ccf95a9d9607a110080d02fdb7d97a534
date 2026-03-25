import { createContext } from "../shared/createContext.js";
import { isNullish } from "../shared/nullish.js";
import { getDefaultDate, hasTime, isBefore } from "../date/comparators.js";
import { normalizeDateStep, normalizeHourCycle } from "../date/utils.js";
import { useDateFormatter } from "../shared/useDateFormatter.js";
import { useDirection } from "../shared/useDirection.js";
import { useKbd } from "../shared/useKbd.js";
import { useLocale } from "../shared/useLocale.js";
import { Primitive } from "../Primitive/Primitive.js";
import { usePrimitiveElement } from "../Primitive/usePrimitiveElement.js";
import { createContent, initializeSegmentValues, syncSegmentValues } from "../date/parser.js";
import { getSegmentElements, isSegmentNavigationKey } from "../date/segment.js";
import { VisuallyHidden_default } from "../VisuallyHidden/VisuallyHidden.js";
import { computed, createBlock, createVNode, defineComponent, mergeProps, nextTick, onMounted, openBlock, ref, renderSlot, toRefs, unref, watch, withCtx, withKeys } from "vue";
import { useVModel } from "@vueuse/core";

//#region src/DateField/DateFieldRoot.vue?vue&type=script&setup=true&lang.ts
const [injectDateFieldRootContext, provideDateFieldRootContext] = createContext("DateFieldRoot");
var DateFieldRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	inheritAttrs: false,
	__name: "DateFieldRoot",
	props: {
		defaultValue: {
			type: null,
			required: false,
			default: void 0
		},
		defaultPlaceholder: {
			type: null,
			required: false
		},
		placeholder: {
			type: null,
			required: false,
			default: void 0
		},
		modelValue: {
			type: null,
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
			type: null,
			required: false
		},
		minValue: {
			type: null,
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
		isDateUnavailable: {
			type: Function,
			required: false,
			default: void 0
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
		const { disabled, readonly, isDateUnavailable: propsIsDateUnavailable, granularity, defaultValue, dir: propDir, locale: propLocale } = toRefs(props);
		const locale = useLocale(propLocale);
		const dir = useDirection(propDir);
		const formatter = useDateFormatter(locale.value, { hourCycle: normalizeHourCycle(props.hourCycle) });
		const { primitiveElement, currentElement: parentElement } = usePrimitiveElement();
		const segmentElements = ref(/* @__PURE__ */ new Set());
		onMounted(() => {
			getSegmentElements(parentElement.value).forEach((item) => segmentElements.value.add(item));
		});
		const modelValue = useVModel(props, "modelValue", emits, {
			defaultValue: defaultValue.value,
			passive: props.modelValue === void 0
		});
		const defaultDate = getDefaultDate({
			defaultPlaceholder: props.placeholder,
			granularity: granularity.value,
			defaultValue: modelValue.value,
			locale: props.locale
		});
		const placeholder = useVModel(props, "placeholder", emits, {
			defaultValue: props.defaultPlaceholder ?? defaultDate.copy(),
			passive: props.placeholder === void 0
		});
		const step = computed(() => normalizeDateStep(props));
		const inferredGranularity = computed(() => {
			if (props.granularity) return !hasTime(placeholder.value) ? "day" : props.granularity;
			return hasTime(placeholder.value) ? "minute" : "day";
		});
		const isInvalid = computed(() => {
			if (!modelValue.value) return false;
			if (propsIsDateUnavailable.value?.(modelValue.value)) return true;
			if (props.minValue && isBefore(modelValue.value, props.minValue)) return true;
			if (props.maxValue && isBefore(props.maxValue, modelValue.value)) return true;
			return false;
		});
		const initialSegments = initializeSegmentValues(inferredGranularity.value);
		const segmentValues = ref(modelValue.value ? { ...syncSegmentValues({
			value: modelValue.value,
			formatter
		}) } : { ...initialSegments });
		const allSegmentContent = computed(() => createContent({
			granularity: inferredGranularity.value,
			dateRef: placeholder.value,
			formatter,
			hideTimeZone: props.hideTimeZone,
			hourCycle: props.hourCycle,
			segmentValues: segmentValues.value,
			locale
		}));
		const segmentContents = computed(() => allSegmentContent.value.arr);
		const editableSegmentContents = computed(() => segmentContents.value.filter(({ part }) => part !== "literal"));
		watch(locale, (value) => {
			if (formatter.getLocale() !== value) {
				formatter.setLocale(value);
				nextTick(() => {
					segmentElements.value.clear();
					getSegmentElements(parentElement.value).forEach((item) => segmentElements.value.add(item));
				});
			}
		});
		watch(modelValue, (_modelValue) => {
			if (!isNullish(_modelValue) && placeholder.value.compare(_modelValue) !== 0) placeholder.value = _modelValue.copy();
		});
		watch([modelValue, locale], ([_modelValue]) => {
			if (!isNullish(_modelValue)) segmentValues.value = { ...syncSegmentValues({
				value: _modelValue,
				formatter
			}) };
			else if (Object.values(segmentValues.value).every((value) => value !== null) && isNullish(_modelValue)) segmentValues.value = { ...initialSegments };
		});
		const currentFocusedElement = ref(null);
		const currentSegmentIndex = computed(() => Array.from(segmentElements.value).findIndex((el) => el.getAttribute("data-reka-date-field-segment") === currentFocusedElement.value?.getAttribute("data-reka-date-field-segment")));
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
		provideDateFieldRootContext({
			isDateUnavailable: propsIsDateUnavailable.value,
			locale,
			modelValue,
			placeholder,
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
//#region src/DateField/DateFieldRoot.vue
var DateFieldRoot_default = DateFieldRoot_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { DateFieldRoot_default, injectDateFieldRootContext };
//# sourceMappingURL=DateFieldRoot.js.map