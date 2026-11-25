import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Pd as Fragment, Rd as computed, Sp as toDisplayString, Vd as createCommentVNode, Vf as ref, Xf as unref, _p as normalizeClass, ff as openBlock, hf as renderSlot, ip as init_shared_esm_bundler, lf as onMounted, mf as renderList, nf as mergeModels, pd as useDebounceFn, xf as useModel, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { BC as ProjectTypes, HM as N8nAvatar_default, PA as useMessage, SN as _plugin_vue_export_helper_default, VA as isIconOrEmoji, _N as N8nText_default, eC as DEBOUNCE_TIME, fN as N8nTooltip_default, fm as compareSharingEntries, hm as splitName, jN as useI18n, mM as N8nOption_default, nN as N8nBadge_default, pM as N8nSelect_default, xN as N8nIcon_default, yN as N8nButton_default, yy as getDebounceTime } from "./app-D5flEmb-.js";
import { t as ProjectIcon_default } from "./ProjectIcon-Dl4TMfdP.js";
//#region src/features/collaboration/projects/components/ProjectSharingInfo.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1 = { key: 0 };
var ProjectSharingInfo_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ProjectSharingInfo",
	props: {
		project: {},
		subtitle: {}
	},
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const SERVICE_ACCOUNT_ICON = {
			type: "icon",
			value: "bot"
		};
		const isServiceAccount = computed(() => props.project.accountKind === "service");
		const serviceAccountLabel = computed(() => {
			const project = props.project.accountProject;
			return project ? i18n.baseText("projects.sharing.serviceAccountIn", { interpolate: { project: project.name } }) : i18n.baseText("projects.sharing.serviceAccount");
		});
		const processedName = computed(() => {
			const { name, email } = splitName(props.project.name ?? "");
			const nameArray = name?.split(" ");
			const lastName = nameArray?.pop() ?? "";
			return {
				firstName: nameArray?.join(" ") ?? "",
				lastName,
				email
			};
		});
		const projectIcon = computed(() => {
			if (isServiceAccount.value) return SERVICE_ACCOUNT_ICON;
			if (props.project.icon && isIconOrEmoji(props.project.icon)) return props.project.icon;
			return null;
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.projectInfo),
				"data-test-id": "project-sharing-info"
			}, [createBaseVNode("div", null, [projectIcon.value ? (openBlock(), createBlock(ProjectIcon_default, {
				key: 0,
				icon: projectIcon.value,
				size: "large",
				round: true
			}, null, 8, ["icon"])) : (openBlock(), createBlock(unref(N8nAvatar_default), {
				key: 1,
				"first-name": processedName.value.firstName,
				"last-name": processedName.value.lastName
			}, null, 8, ["first-name", "last-name"])), isServiceAccount.value ? (openBlock(), createElementBlock("div", {
				key: 2,
				class: normalizeClass(_ctx.$style.text)
			}, [createBaseVNode("p", null, toDisplayString(props.project.name), 1), createBaseVNode("small", null, toDisplayString(props.subtitle ?? serviceAccountLabel.value), 1)], 2)) : (openBlock(), createElementBlock("div", {
				key: 3,
				class: normalizeClass(_ctx.$style.text)
			}, [processedName.value.firstName || processedName.value.lastName ? (openBlock(), createElementBlock("p", _hoisted_1, toDisplayString(processedName.value.firstName) + " " + toDisplayString(processedName.value.lastName), 1)) : createCommentVNode("", true), createBaseVNode("small", null, toDisplayString(props.subtitle ?? processedName.value.email), 1)], 2))]), renderSlot(_ctx.$slots, "default")], 2);
		};
	}
}), [["__cssModules", { "$style": {
	projectInfo: "_projectInfo_16qj3_1",
	text: "_text_16qj3_26"
} }]]);
//#endregion
//#region src/features/collaboration/projects/components/ProjectSharing.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var ProjectSharing_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ProjectSharing",
	props: /*@__PURE__*/ mergeModels({
		searchFn: {},
		filterFn: {},
		homeProject: {},
		roles: {},
		readonly: { type: Boolean },
		static: { type: Boolean },
		placeholder: {},
		emptyOptionsText: {},
		size: {},
		clearable: { type: Boolean },
		canShareGlobally: { type: Boolean },
		isSharedGlobally: { type: Boolean },
		allUsersLabel: {},
		disabledTooltip: {},
		teleported: {
			type: Boolean,
			default: true
		},
		showSuffix: { type: Boolean },
		roleDescriptions: {},
		sortSelected: { type: Boolean },
		unsharedProjects: {},
		confirmRemoval: {}
	}, {
		"modelValue": { required: true },
		"modelModifiers": {}
	}),
	emits: /*@__PURE__*/ mergeModels([
		"projectAdded",
		"projectRemoved",
		"clear",
		"update:shareWithAllUsers"
	], ["update:modelValue"]),
	setup(__props, { emit: __emit }) {
		const locale = useI18n();
		const props = __props;
		const message = useMessage();
		const inPlacePopperOptions = { strategy: "fixed" };
		const GLOBAL_GROUP = {
			id: "all_users",
			name: props.allUsersLabel ?? locale.baseText("projects.sharing.allUsers"),
			type: "public",
			icon: {
				type: "icon",
				value: "globe"
			},
			role: "member",
			createdAt: `${Date.now()}`,
			updatedAt: `${Date.now()}`
		};
		const model = useModel(__props, "modelValue");
		const emit = __emit;
		const selectedSingleProject = computed(() => Array.isArray(model.value) ? null : model.value ?? null);
		const selectedProject = computed(() => selectedSingleProject.value?.id ?? "");
		const listEntries = computed(() => {
			if (!Array.isArray(model.value)) return null;
			const entries = [...model.value.map((project) => ({
				kind: "shared",
				project
			})), ...(props.unsharedProjects ?? []).map(({ project, subtitle }) => ({
				kind: "unshared",
				project,
				subtitle
			}))];
			if (props.sortSelected) entries.sort((entryA, entryB) => compareSharingEntries(entryA.project, entryB.project));
			return props.isSharedGlobally ? [{
				kind: "shared",
				project: GLOBAL_GROUP
			}, ...entries] : entries;
		});
		const selectPlaceholder = computed(() => props.placeholder ?? locale.baseText("projects.sharing.select.placeholder"));
		const noDataText = computed(() => props.emptyOptionsText ?? locale.baseText("projects.sharing.noMatchingUsers"));
		const searchResults = ref([]);
		const searchCount = ref(0);
		const filter = ref("");
		const filteredProjects = computed(() => {
			let list = searchResults.value;
			if (props.filterFn) list = list.filter(props.filterFn);
			if (props.homeProject) list = list.filter((p) => p.id !== props.homeProject.id);
			if (Array.isArray(model.value)) {
				const selected = model.value;
				list = list.filter((p) => !selected.find((s) => s.id === p.id));
			}
			return list;
		});
		const selectedProjectOption = computed(() => {
			const selected = selectedSingleProject.value;
			if (!selected || filter.value !== "" || filteredProjects.value.some((p) => p.id === selected.id)) return null;
			return selected;
		});
		const sortedProjects = computed(() => {
			const option = selectedProjectOption.value;
			const projects = [...filteredProjects.value, ...option ? [option] : []].sort((projectA, projectB) => (projectA.name ?? "").localeCompare(projectB.name ?? ""));
			return [...props.canShareGlobally && !props.isSharedGlobally ? [GLOBAL_GROUP] : [], ...projects];
		});
		const moreResultsCount = computed(() => {
			const option = selectedProjectOption.value;
			const offPage = option && !searchResults.value.some((p) => p.id === option.id) ? 1 : 0;
			return Math.max(0, searchCount.value - searchResults.value.length - offPage);
		});
		const showSearchHint = computed(() => filter.value === "" && sortedProjects.value.length === 0 && moreResultsCount.value > 0);
		const projectIcon = computed(() => {
			const defaultIcon = {
				type: "icon",
				value: "layers"
			};
			const project = searchResults.value.find((p) => p.id === selectedProject.value) ?? selectedSingleProject.value;
			if (project?.type === ProjectTypes.Personal) return {
				type: "icon",
				value: "user"
			};
			else if (project?.type === ProjectTypes.Team) return isIconOrEmoji(project.icon) ? project.icon : defaultIcon;
			return defaultIcon;
		});
		let searchGeneration = 0;
		const executeSearch = async (query) => {
			const generation = ++searchGeneration;
			try {
				const result = await props.searchFn(query);
				if (generation !== searchGeneration) return;
				searchResults.value = result.data ?? [];
				searchCount.value = result.count ?? 0;
			} catch {
				if (generation !== searchGeneration) return;
				searchResults.value = [];
				searchCount.value = 0;
			}
		};
		const debouncedSearch = useDebounceFn(executeSearch, getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH));
		const setFilter = (query) => {
			filter.value = query;
			debouncedSearch(query);
		};
		onMounted(() => {
			executeSearch("");
		});
		const onProjectSelected = (projectId) => {
			if (projectId === GLOBAL_GROUP.id) {
				emit("update:shareWithAllUsers", true);
				return;
			}
			const project = searchResults.value.find((p) => p.id === projectId);
			if (!project) return;
			if (Array.isArray(model.value)) model.value = [...model.value, project];
			else model.value = project;
			emit("projectAdded", project);
		};
		const showStaticRole = computed(() => !!props.roleDescriptions && !!props.roles?.length);
		const staticRole = computed(() => showStaticRole.value ? props.roles?.[0] : void 0);
		const staticRoleDescription = computed(() => staticRole.value ? props.roleDescriptions?.[staticRole.value.slug] : void 0);
		const canRemoveProject = (project) => !(project.id === GLOBAL_GROUP.id && !props.canShareGlobally);
		const onRoleAction = async (project, role) => {
			if (!Array.isArray(model.value) || props.readonly) return;
			if (project.id === GLOBAL_GROUP.id && role === "remove") {
				emit("update:shareWithAllUsers", false);
				return;
			}
			if (role === "remove") {
				if (props.confirmRemoval) {
					const { title, message: confirmMessage, confirmButtonText, cancelButtonText } = props.confirmRemoval(project);
					if (await message.confirm(confirmMessage, title, {
						confirmButtonText,
						cancelButtonText
					}) !== "confirm") return;
				}
				model.value = model.value.filter((p) => p.id !== project.id);
				emit("projectRemoved", project);
			}
		};
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", null, [createVNode(unref(N8nTooltip_default), {
				disabled: !props.disabledTooltip,
				placement: "top"
			}, {
				content: withCtx(() => [createTextVNode(toDisplayString(props.disabledTooltip), 1)]),
				default: withCtx(() => [!props.static || props.disabledTooltip ? (openBlock(), createBlock(unref(N8nSelect_default), {
					key: 0,
					"model-value": selectedProject.value,
					"data-test-id": "project-sharing-select",
					filterable: "",
					remote: "",
					"remote-show-suffix": props.showSuffix,
					"remote-method": setFilter,
					placeholder: selectPlaceholder.value,
					"default-first-option": true,
					"no-data-text": noDataText.value,
					size: __props.size ?? "medium",
					disabled: props.readonly || !!props.disabledTooltip,
					clearable: __props.clearable,
					teleported: props.teleported,
					"popper-options": props.teleported ? void 0 : inPlacePopperOptions,
					"popper-class": _ctx.$style.popper,
					"onUpdate:modelValue": onProjectSelected,
					onClear: _cache[0] || (_cache[0] = ($event) => emit("clear"))
				}, {
					prefix: withCtx(() => [projectIcon.value.type === "icon" ? (openBlock(), createBlock(unref(N8nIcon_default), {
						key: 0,
						icon: projectIcon.value.value,
						color: "text-dark"
					}, null, 8, ["icon"])) : projectIcon.value.type === "emoji" ? (openBlock(), createBlock(unref(N8nText_default), {
						key: 1,
						color: "text-light",
						class: normalizeClass(_ctx.$style.emoji)
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(projectIcon.value.value), 1)]),
						_: 1
					}, 8, ["class"])) : createCommentVNode("", true)]),
					default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(sortedProjects.value, (project) => {
						return openBlock(), createBlock(unref(N8nOption_default), {
							key: project.id,
							value: project.id,
							label: project.name ?? ""
						}, {
							default: withCtx(() => [createVNode(ProjectSharingInfo_default, { project }, null, 8, ["project"])]),
							_: 2
						}, 1032, ["value", "label"]);
					}), 128)), showSearchHint.value || moreResultsCount.value > 0 ? (openBlock(), createBlock(unref(N8nOption_default), {
						key: "more-results",
						value: "",
						label: "",
						disabled: "",
						class: normalizeClass(_ctx.$style.searchNotice)
					}, {
						default: withCtx(() => [createVNode(unref(N8nText_default), {
							size: "small",
							color: "text-light"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(showSearchHint.value ? unref(locale).baseText("projects.sharing.startTypingToSearch", { interpolate: { count: searchCount.value } }) : unref(locale).baseText("projects.sharing.moreResults", { interpolate: { count: moreResultsCount.value } })), 1)]),
							_: 1
						})]),
						_: 1
					}, 8, ["class"])) : createCommentVNode("", true)]),
					_: 1
				}, 8, [
					"model-value",
					"remote-show-suffix",
					"placeholder",
					"no-data-text",
					"size",
					"disabled",
					"clearable",
					"teleported",
					"popper-options",
					"popper-class"
				])) : createCommentVNode("", true)]),
				_: 1
			}, 8, ["disabled"]), listEntries.value ? (openBlock(), createElementBlock("ul", {
				key: 0,
				class: normalizeClass(_ctx.$style.selectedProjects)
			}, [props.homeProject ? (openBlock(), createElementBlock("li", {
				key: 0,
				class: normalizeClass(_ctx.$style.project),
				"data-test-id": "project-sharing-owner"
			}, [createVNode(ProjectSharingInfo_default, { project: props.homeProject }, {
				default: withCtx(() => [showStaticRole.value ? (openBlock(), createElementBlock("span", {
					key: 0,
					class: normalizeClass(_ctx.$style.rectBadge)
				}, toDisplayString(unref(locale).baseText("auth.roles.owner")), 3)) : (openBlock(), createBlock(unref(N8nBadge_default), {
					key: 1,
					variant: "outline"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("auth.roles.owner")), 1)]),
					_: 1
				}))]),
				_: 1
			}, 8, ["project"])], 2)) : createCommentVNode("", true), (openBlock(true), createElementBlock(Fragment, null, renderList(listEntries.value, (entry) => {
				return openBlock(), createElementBlock(Fragment, { key: entry.project.id }, [entry.kind === "unshared" ? (openBlock(), createElementBlock("li", {
					key: 0,
					class: normalizeClass(_ctx.$style.project),
					"data-test-id": "project-sharing-unshared-item"
				}, [createVNode(ProjectSharingInfo_default, {
					project: entry.project,
					subtitle: entry.subtitle
				}, {
					default: withCtx(() => [renderSlot(_ctx.$slots, "unshared-actions", { project: entry.project })]),
					_: 2
				}, 1032, ["project", "subtitle"])], 2)) : (openBlock(), createElementBlock("li", {
					key: 1,
					class: normalizeClass(_ctx.$style.project),
					"data-test-id": "project-sharing-list-item"
				}, [
					createVNode(ProjectSharingInfo_default, { project: entry.project }, {
						default: withCtx(() => [staticRole.value ? (openBlock(), createElementBlock("span", {
							key: 0,
							class: normalizeClass(_ctx.$style.trailingRow)
						}, [createVNode(unref(N8nText_default), {
							color: "text-light",
							title: staticRoleDescription.value,
							"data-test-id": "project-sharing-static-role"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(staticRole.value.displayName), 1)]),
							_: 1
						}, 8, ["title"]), canRemoveProject(entry.project) ? (openBlock(), createBlock(unref(N8nTooltip_default), {
							key: 0,
							content: unref(locale).baseText("projects.sharing.removeAccess"),
							placement: "top"
						}, {
							default: withCtx(() => [createVNode(unref(N8nButton_default), {
								variant: "outline",
								"icon-only": "",
								"native-type": "button",
								icon: "trash-2",
								"aria-label": unref(locale).baseText("projects.sharing.removeAccess"),
								disabled: props.readonly,
								"data-test-id": "project-sharing-remove",
								onClick: ($event) => onRoleAction(entry.project, "remove")
							}, null, 8, [
								"aria-label",
								"disabled",
								"onClick"
							])]),
							_: 2
						}, 1032, ["content"])) : createCommentVNode("", true)], 2)) : createCommentVNode("", true)]),
						_: 2
					}, 1032, ["project"]),
					props.roles?.length && !props.static && !showStaticRole.value && canRemoveProject(entry.project) ? (openBlock(), createBlock(unref(N8nSelect_default), {
						key: 0,
						class: normalizeClass(_ctx.$style.projectRoleSelect),
						"model-value": props.roles[0],
						disabled: props.readonly,
						"data-test-id": "project-sharing-role-select",
						size: "small",
						"onUpdate:modelValue": ($event) => onRoleAction(entry.project, $event)
					}, {
						default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(__props.roles, (role) => {
							return openBlock(), createBlock(unref(N8nOption_default), {
								key: role.slug,
								value: role.slug,
								label: role.displayName
							}, null, 8, ["value", "label"]);
						}), 128))]),
						_: 1
					}, 8, [
						"class",
						"model-value",
						"disabled",
						"onUpdate:modelValue"
					])) : createCommentVNode("", true),
					!props.static && !showStaticRole.value && canRemoveProject(entry.project) ? (openBlock(), createBlock(unref(N8nTooltip_default), {
						key: 1,
						content: unref(locale).baseText("projects.sharing.removeAccess"),
						placement: "top"
					}, {
						default: withCtx(() => [createVNode(unref(N8nButton_default), {
							variant: "outline",
							"icon-only": "",
							"native-type": "button",
							icon: "trash-2",
							"aria-label": unref(locale).baseText("projects.sharing.removeAccess"),
							disabled: props.readonly,
							"data-test-id": "project-sharing-remove",
							onClick: ($event) => onRoleAction(entry.project, "remove")
						}, null, 8, [
							"aria-label",
							"disabled",
							"onClick"
						])]),
						_: 2
					}, 1032, ["content"])) : createCommentVNode("", true)
				], 2))], 64);
			}), 128))], 2)) : createCommentVNode("", true)]);
		};
	}
}), [["__cssModules", { "$style": {
	project: "_project_1ivyl_1",
	rectBadge: "_rectBadge_1ivyl_9",
	trailingRow: "_trailingRow_1ivyl_23",
	selectedProjects: "_selectedProjects_1ivyl_31",
	projectRoleSelect: "_projectRoleSelect_1ivyl_42",
	popper: "_popper_1ivyl_46",
	emoji: "_emoji_1ivyl_50",
	searchNotice: "_searchNotice_1ivyl_54"
} }]]);
//#endregion
export { ProjectSharing_default as t };
