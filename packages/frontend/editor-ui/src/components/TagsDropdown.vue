<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { onClickOutside } from '@vueuse/core';
import type { ITag } from '@n8n/rest-api-client/api/tags';
import { MAX_TAG_NAME_LENGTH } from '@/constants';
import { N8nOption, N8nSelect } from '@n8n/design-system';
import type { EventBus } from '@n8n/utils/event-bus';
import { useI18n } from '@n8n/i18n';
import { v4 as uuid } from 'uuid';
import { useToast } from '@/composables/useToast';

interface TagsDropdownProps {
	placeholder: string;
	modelValue: string[];
	eventBus: EventBus | null;
	allTags: ITag[];
	isLoading: boolean;
	tagsById: Record<string, ITag>;
	createEnabled?: boolean;
	manageEnabled?: boolean;
	createTag?: (name: string) => Promise<ITag>;
	multipleLimit?: number;
}

const i18n = useI18n();

const { showError } = useToast();

const props = withDefaults(defineProps<TagsDropdownProps>(), {
	placeholder: '',
	modelValue: () => [],
	eventBus: null,
	createEnabled: true,
	manageEnabled: true,
	createTag: undefined,
	multipleLimit: 0,
});

const emit = defineEmits<{
	'update:modelValue': [selected: string[]];
	esc: [];
	blur: [];
	'manage-tags': [];
}>();

const MANAGE_KEY = '__manage';
const CREATE_KEY = '__create';

const selectRef = ref<InstanceType<typeof N8nSelect>>();
const tagRefs = ref<Array<InstanceType<typeof N8nOption>>>();
const createRef = ref<InstanceType<typeof N8nOption>>();

const filter = ref('');
const focused = ref(false);
const preventUpdate = ref(false);

const container = ref<HTMLDivElement>();

const dropdownId = uuid();

const options = computed<ITag[]>(() => {
	return props.allTags.filter(
		(tag: ITag) => tag && tag.name.toLowerCase().includes(filter.value.toLowerCase()),
	);
});

const appliedTags = computed<string[]>(() => {
	return props.modelValue.filter((id: string) => props.tagsById[id]);
});

const containerClasses = computed(() => {
	return { 'tags-container': true, focused: focused.value };
});

const dropdownClasses = computed(() => ({
	'tags-dropdown': true,
	[`tags-dropdown-${dropdownId}`]: true,
	'tags-dropdown-create-enabled': props.createEnabled,
	'tags-dropdown-manage-enabled': props.manageEnabled,
}));

watch(
	() => props.allTags,
	() => {
		if (props.modelValue.length !== appliedTags.value.length) {
			emit('update:modelValue', appliedTags.value);
		}
	},
);

onMounted(() => {
	const select = selectRef.value?.innerSelect;

	if (select) {
		const input = select.$refs.input as Element | undefined;

		if (input) {
			input.setAttribute('maxlength', `${MAX_TAG_NAME_LENGTH}`);
			input.addEventListener('keydown', (e: Event) => {
				const keyboardEvent = e as KeyboardEvent;
				if (keyboardEvent.key === 'Escape') {
					emit('esc');
				} else if (keyboardEvent.key === 'Enter' && filter.value.length === 0) {
					preventUpdate.value = true;
					emit('blur');
					if (typeof selectRef.value?.blur === 'function') {
						selectRef.value.blur();
					}
				}
			});
		}
	}

	props.eventBus?.on('focus', onBusFocus);
});

onBeforeUnmount(() => {
	props.eventBus?.off('focus', onBusFocus);
});

function onBusFocus() {
	focusOnInput();
	focusFirstOption();
}

function filterOptions(value = '') {
	filter.value = value;
	void nextTick(() => focusFirstOption());
}

async function onCreate() {
	if (!props.createTag) return;

	const name = filter.value;
	try {
		const newTag = await props.createTag(name);
		emit('update:modelValue', [...props.modelValue, newTag.id]);

		filter.value = '';
	} catch (error) {
		showError(
			error,
			i18n.baseText('tagsDropdown.showError.title'),
			i18n.baseText('tagsDropdown.showError.message', { interpolate: { name } }),
		);
	}
}

function onTagsUpdated(selected: string[]) {
	const manage = selected.find((value) => value === MANAGE_KEY);
	const create = selected.find((value) => value === CREATE_KEY);

	if (manage) {
		filter.value = '';
		emit('manage-tags');
		emit('blur');
	} else if (create) {
		void onCreate();
	} else {
		setTimeout(() => {
			if (!preventUpdate.value) {
				emit('update:modelValue', selected);
			}
			preventUpdate.value = false;
		}, 0);
	}
}

function focusFirstOption() {
	// focus on create option
	if (createRef.value?.$el) {
		createRef.value.$el.dispatchEvent(new Event('mouseenter'));
	}
	// focus on top option after filter
	else if (tagRefs.value?.[0]?.$el) {
		tagRefs.value[0].$el.dispatchEvent(new Event('mouseenter'));
	}
}

function focusOnInput() {
	if (selectRef.value) {
		selectRef.value.focusOnInput();
		focused.value = true;
	}
}

function onVisibleChange(visible: boolean) {
	if (!visible) {
		filter.value = '';
		focused.value = false;
	} else {
		focused.value = true;
	}
}

function onRemoveTag() {
	void nextTick(() => {
		focusOnInput();
	});
}

onClickOutside(
	container,
	() => {
		emit('blur');
	},
	{ ignore: [`.tags-dropdown-${dropdownId}`, '#tags-manager-modal'], detectIframe: true },
);
</script>

<template>
	<div ref="container" :class="containerClasses" @keydown.stop>
		<N8nSelect
			ref="selectRef"
			:teleported="true"
			:model-value="appliedTags"
			:loading="isLoading"
			:placeholder="placeholder"
			:filter-method="filterOptions"
			filterable
			multiple
			:multiple-limit="props.multipleLimit"
			:reserve-keyword="false"
			loading-text="..."
			:popper-class="dropdownClasses"
			data-test-id="tags-dropdown"
			@update:model-value="onTagsUpdated"
			@visible-change="onVisibleChange"
			@remove-tag="onRemoveTag"
		>
			<N8nOption
				v-if="createEnabled && options.length === 0 && filter"
				:key="CREATE_KEY"
				ref="createRef"
				:value="CREATE_KEY"
				class="ops"
			>
				<n8n-icon icon="circle-plus" />
				<span>
					{{ i18n.baseText('tagsDropdown.createTag', { interpolate: { filter } }) }}
				</span>
			</N8nOption>
			<N8nOption v-else-if="options.length === 0" value="message" disabled>
				<span v-if="createEnabled">{{ i18n.baseText('tagsDropdown.typeToCreateATag') }}</span>
				<span v-else-if="allTags.length > 0">{{
					i18n.baseText('tagsDropdown.noMatchingTagsExist')
				}}</span>
				<span v-else>{{ i18n.baseText('tagsDropdown.noTagsExist') }}</span>
			</N8nOption>

			<N8nOption
				v-for="(tag, i) in options"
				:key="tag.id + '_' + i"
				ref="tagRefs"
				:value="tag.id"
				:label="tag.name"
				class="tag"
				data-test-id="tag"
			/>

			<N8nOption v-if="manageEnabled" :key="MANAGE_KEY" :value="MANAGE_KEY" class="ops manage-tags">
				<n8n-icon icon="cog" />
				<span>{{ i18n.baseText('tagsDropdown.manageTags') }}</span>
			</N8nOption>
		</N8nSelect>
	</div>
</template>

<style lang="scss">
.tags-container {
	$--max-input-height: 60px;

	.el-select-tags-wrapper {
		.el-tag {
			max-height: $--max-input-height;
			overflow-y: scroll;
			overflow-x: hidden;
		}

		input {
			max-height: $--max-input-height;
		}
	}

	.el-tag {
		padding: var(--spacing-5xs) var(--spacing-4xs);
		color: var(--color-text-base);
		background-color: var(--color-background-base);
		border-radius: var(--border-radius-base);
		font-size: var(--font-size-2xs);
		border: 0;

		.el-tag__close {
			max-height: 14px;
			max-width: 14px;
			line-height: 14px;
		}
	}
}

.tags-dropdown {
	$--item-font-size: 14px;
	$--item-line-height: 18px;
	$--item-vertical-padding: 10px;
	$--item-horizontal-padding: 20px;
	$--item-height: $--item-line-height + $--item-vertical-padding * 2;
	$--items-to-show: 7;
	$--item-padding: $--item-vertical-padding $--item-horizontal-padding;
	$--dropdown-height: $--item-height * $--items-to-show;
	$--dropdown-width: 224px;

	min-width: $--dropdown-width !important;
	max-width: $--dropdown-width;

	.el-tag {
		white-space: normal;
	}

	.el-scrollbar {
		position: relative;
		max-height: $--dropdown-height;

		> div {
			overflow: auto;
			margin-bottom: 0 !important;
		}

		ul {
			padding: 0;
			max-height: $--dropdown-height - $--item-height;

			::-webkit-scrollbar {
				display: none;
			}
		}

		.tags-dropdown-manage-enabled &:after {
			content: ' ';
			display: block;
			min-height: $--item-height;
			width: $--dropdown-width;
			padding: $--item-padding;
		}

		// override theme scrollbars in safari when overscrolling
		::-webkit-scrollbar-thumb {
			display: none;
		}
	}

	li {
		height: $--item-height;
		background-color: var(--color-foreground-xlight);
		padding: $--item-padding;
		margin: 0;
		line-height: $--item-line-height;
		font-weight: var(--font-weight-regular);
		font-size: $--item-font-size;

		&.is-disabled {
			color: $custom-font-light;
			cursor: default;
		}

		&.selected {
			font-weight: var(--font-weight-bold);

			> span {
				display: inline-block;
				width: calc(100% - #{$--item-font-size});
				overflow: hidden;
				text-overflow: ellipsis;
			}

			&:after {
				// selected check
				font-size: $--item-font-size !important;
			}
		}

		&.ops {
			color: $color-primary;
			cursor: pointer;

			:first-child {
				margin-right: 5px;
			}
		}

		&.tag {
			border-top: none;
		}

		&.manage-tags {
			position: absolute;
			bottom: 0;
			min-width: $--dropdown-width;
			border-top: 1px solid var(--color-foreground-base);
		}
	}
}
</style>
