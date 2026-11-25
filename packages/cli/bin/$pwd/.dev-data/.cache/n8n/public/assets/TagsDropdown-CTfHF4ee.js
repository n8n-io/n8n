import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nd as withModifiers, Nf as init_reactivity_esm_bundler, Oa as v4, Pd as Fragment, Rd as computed, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Tf as watch, Vd as createCommentVNode, Vf as ref, Xf as unref, _p as normalizeClass, ff as openBlock, if as nextTick, ip as init_shared_esm_bundler, lf as onMounted, mf as renderList, of as onBeforeUnmount, xu as onClickOutside, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { dC as useToast, jN as useI18n, mM as N8nOption_default, pM as N8nSelect_default, xN as N8nIcon_default } from "./app-D5flEmb-.js";
//#region src/features/shared/tags/components/TagsDropdown.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1 = { key: 0 };
var _hoisted_2 = { "data-test-id": "tags-dropdown-message" };
var _hoisted_3 = {
	key: 0,
	class: "create-blocked-note"
};
var MANAGE_KEY = "__manage";
var CREATE_KEY = "__create";
//#endregion
//#region src/features/shared/tags/components/TagsDropdown.vue
var TagsDropdown_default = /* @__PURE__ */ defineComponent({
	__name: "TagsDropdown",
	props: {
		placeholder: { default: "" },
		modelValue: { default: () => [] },
		eventBus: { default: null },
		allTags: {},
		isLoading: { type: Boolean },
		tagsById: {},
		createEnabled: {
			type: Boolean,
			default: true
		},
		manageEnabled: {
			type: Boolean,
			default: true
		},
		createTag: {
			type: Function,
			default: void 0
		},
		multipleLimit: { default: 0 },
		createTagI18nKey: { default: "tagsDropdown.createTag" },
		createBlockedI18nKey: { default: void 0 }
	},
	emits: [
		"update:modelValue",
		"esc",
		"blur",
		"manage-tags"
	],
	setup(__props, { emit: __emit }) {
		const i18n = useI18n();
		const { showError } = useToast();
		const props = __props;
		const emit = __emit;
		const selectRef = ref();
		const tagRefs = ref();
		const createRef = ref();
		const filter = ref("");
		const focused = ref(false);
		const preventUpdate = ref(false);
		const container = ref();
		const dropdownId = v4();
		const options = computed(() => {
			return props.allTags.filter((tag) => tag && tag.name.toLowerCase().includes(filter.value.toLowerCase()));
		});
		const appliedTags = computed(() => {
			return props.modelValue.filter((id) => props.tagsById[id]);
		});
		const containerClasses = computed(() => {
			return {
				"tags-container": true,
				focused: focused.value
			};
		});
		const dropdownClasses = computed(() => [
			"tags-dropdown",
			`tags-dropdown-${dropdownId}`,
			props.createEnabled ? "tags-dropdown-create-enabled" : "",
			props.manageEnabled ? "tags-dropdown-manage-enabled" : ""
		].join(" "));
		watch(() => props.allTags, () => {
			if (props.modelValue.length !== appliedTags.value.length) emit("update:modelValue", appliedTags.value);
		});
		onMounted(() => {
			const select = selectRef.value?.innerSelect;
			if (select) {
				const input = select.$refs.input;
				if (input) {
					input.setAttribute("maxlength", `24`);
					input.addEventListener("keydown", (e) => {
						const keyboardEvent = e;
						if (keyboardEvent.key === "Escape") emit("esc");
						else if (keyboardEvent.key === "Enter" && filter.value.length === 0) {
							preventUpdate.value = true;
							emit("blur");
							if (typeof selectRef.value?.blur === "function") selectRef.value.blur();
						}
					});
				}
			}
			props.eventBus?.on("focus", onBusFocus);
		});
		onBeforeUnmount(() => {
			props.eventBus?.off("focus", onBusFocus);
		});
		function onBusFocus() {
			focusOnInput();
			focusFirstOption();
		}
		function filterOptions(value = "") {
			filter.value = value;
			nextTick(() => focusFirstOption());
		}
		async function onCreate() {
			if (!props.createTag) return;
			const name = filter.value;
			try {
				const newTag = await props.createTag(name);
				emit("update:modelValue", [...props.modelValue, newTag.id]);
				filter.value = "";
			} catch (error) {
				showError(error, i18n.baseText("tagsDropdown.showError.title"), { message: i18n.baseText("tagsDropdown.showError.message", { interpolate: { name } }) });
			}
		}
		function onTagsUpdated(selected) {
			const manage = selected.find((value) => value === MANAGE_KEY);
			const create = selected.find((value) => value === CREATE_KEY);
			if (manage) {
				filter.value = "";
				emit("manage-tags");
				emit("blur");
			} else if (create) onCreate();
			else setTimeout(() => {
				if (!preventUpdate.value) emit("update:modelValue", selected);
				preventUpdate.value = false;
			}, 0);
		}
		function focusFirstOption() {
			if (createRef.value?.$el) createRef.value.$el.dispatchEvent(new Event("mouseenter"));
			else if (tagRefs.value?.[0]?.$el) tagRefs.value[0].$el.dispatchEvent(new Event("mouseenter"));
		}
		function focusOnInput() {
			if (selectRef.value) {
				selectRef.value.focusOnInput();
				focused.value = true;
			}
		}
		function onVisibleChange(visible) {
			if (!visible) {
				filter.value = "";
				focused.value = false;
			} else focused.value = true;
		}
		function onRemoveTag() {
			nextTick(() => {
				focusOnInput();
			});
		}
		onClickOutside(container, () => {
			emit("blur");
		}, {
			ignore: [`.tags-dropdown-${dropdownId}`, "#tags-manager-modal"],
			detectIframe: true
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				ref_key: "container",
				ref: container,
				class: normalizeClass(containerClasses.value),
				onKeydown: _cache[0] || (_cache[0] = withModifiers(() => {}, ["stop"]))
			}, [createVNode(unref(N8nSelect_default), {
				ref_key: "selectRef",
				ref: selectRef,
				teleported: true,
				"model-value": appliedTags.value,
				loading: __props.isLoading,
				placeholder: __props.placeholder,
				"filter-method": filterOptions,
				filterable: "",
				multiple: "",
				"multiple-limit": props.multipleLimit,
				"reserve-keyword": false,
				"loading-text": "...",
				"popper-class": dropdownClasses.value,
				"data-test-id": "tags-dropdown",
				"onUpdate:modelValue": onTagsUpdated,
				onVisibleChange,
				onRemoveTag
			}, {
				default: withCtx(() => [
					__props.createEnabled && options.value.length === 0 && filter.value ? (openBlock(), createBlock(unref(N8nOption_default), {
						key: CREATE_KEY,
						ref_key: "createRef",
						ref: createRef,
						value: CREATE_KEY,
						class: "ops"
					}, {
						default: withCtx(() => [createVNode(unref(N8nIcon_default), { icon: "circle-plus" }), createBaseVNode("span", null, toDisplayString(unref(i18n).baseText(props.createTagI18nKey, { interpolate: { filter: filter.value } })), 1)]),
						_: 1
					})) : options.value.length === 0 ? (openBlock(), createBlock(unref(N8nOption_default), {
						key: 1,
						value: "message",
						disabled: "",
						class: "message"
					}, {
						default: withCtx(() => [__props.createEnabled ? (openBlock(), createElementBlock("span", _hoisted_1, toDisplayString(unref(i18n).baseText("tagsDropdown.typeToCreateATag")), 1)) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [createBaseVNode("span", _hoisted_2, toDisplayString(__props.allTags.length > 0 ? unref(i18n).baseText("tagsDropdown.noMatchingTagsExist") : unref(i18n).baseText("tagsDropdown.noTagsExist")), 1), __props.createBlockedI18nKey ? (openBlock(), createElementBlock("span", _hoisted_3, toDisplayString(unref(i18n).baseText(__props.createBlockedI18nKey)), 1)) : createCommentVNode("", true)], 64))]),
						_: 1
					})) : createCommentVNode("", true),
					(openBlock(true), createElementBlock(Fragment, null, renderList(options.value, (tag, i) => {
						return openBlock(), createBlock(unref(N8nOption_default), {
							key: tag.id + "_" + i,
							ref_for: true,
							ref_key: "tagRefs",
							ref: tagRefs,
							value: tag.id,
							label: tag.name,
							class: "tag",
							"data-test-id": "tag"
						}, null, 8, ["value", "label"]);
					}), 128)),
					__props.manageEnabled ? (openBlock(), createBlock(unref(N8nOption_default), {
						key: MANAGE_KEY,
						value: MANAGE_KEY,
						class: "ops manage-tags"
					}, {
						default: withCtx(() => [createVNode(unref(N8nIcon_default), { icon: "cog" }), createBaseVNode("span", null, toDisplayString(unref(i18n).baseText("tagsDropdown.manageTags")), 1)]),
						_: 1
					})) : createCommentVNode("", true)
				]),
				_: 1
			}, 8, [
				"model-value",
				"loading",
				"placeholder",
				"multiple-limit",
				"popper-class"
			])], 34);
		};
	}
});
//#endregion
export { TagsDropdown_default as t };
