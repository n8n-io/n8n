<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { ITag } from '@/Interface';
import { MAX_TAG_NAME_LENGTH } from '@/constants';
import { N8nOption, N8nSelect } from 'n8n-design-system';
import type { EventBus } from 'n8n-design-system';
import { useI18n } from '@/composables/useI18n';
import { v4 as uuid } from 'uuid';

interface TagsDropdownProps {
	placeholder: string;
	modelValue: string[];
	createEnabled: boolean;
	eventBus: EventBus | null;
	allTags: ITag[];
	isLoading: boolean;
	tagsById: Record<string, ITag>;
}

const i18n = useI18n();

const props = withDefaults(defineProps<TagsDropdownProps>(), {
	placeholder: '',
	modelValue: () => [],
	createEnabled: false,
	eventBus: null,
});

const emit = defineEmits<{
	'update:modelValue': [selected: string[]];
	esc: [];
	blur: [];
	'create-tag': [name: string];
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

const dropdownId = uuid();

const options = computed<ITag[]>(() => {
	return props.allTags.filter((tag: ITag) => tag && tag.name.includes(filter.value));
});

const appliedTags = computed<string[]>(() => {
	return props.modelValue.filter((id: string) => props.tagsById[id]);
});

watch(
	() => props.allTags,
	() => {
		if (props.modelValue.length !== appliedTags.value.length) {
			emit('update:modelValue', appliedTags.value);
		}
	},
);

onMounted(() => {
	const select = selectRef.value?.$refs?.innerSelect as { $refs: { input: Element } } | undefined;

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

function onCreate() {
	const name = filter.value;
	emit('create-tag', name);
	filter.value = '';
}

function onTagsUpdated(selected: string[]) {
	const manage = selected.find((value) => value === MANAGE_KEY);
	const create = selected.find((value) => value === CREATE_KEY);

	if (manage) {
		filter.value = '';
		emit('manage-tags');
		emit('blur');
	} else if (create) {
		onCreate();
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
	if (createRef.value?.$el) {
		createRef.value.$el.dispatchEvent(new Event('mouseenter'));
	} else if (tagRefs.value?.[0]?.$el) {
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

function onClickOutside(e: Event) {
	const tagsDropdown = document.querySelector(`.tags-dropdown-${dropdownId}`);

	const clickInsideTagsDropdowns =
		tagsDropdown?.contains(e.target as Node) ?? tagsDropdown === e.target;

	if (!clickInsideTagsDropdowns && e.type === 'click') {
		emit('blur');
	}
}
</script>

<template>
	<div
		v-on-click-outside="onClickOutside"
		:class="{ 'tags-container': true, focused }"
		@keydown.stop
	>
		<N8nSelect
			ref="selectRef"
			:teleported="true"
			:model-value="appliedTags"
			:loading="isLoading"
			:placeholder="placeholder"
			:filter-method="filterOptions"
			filterable
			multiple
			:allow-create="createEnabled"
			:reserve-keyword="false"
			loading-text="..."
			:popper-class="['tags-dropdown', 'tags-dropdown-' + dropdownId]"
			data-test-id="tags-dropdown"
			@update:model-value="onTagsUpdated"
			@visible-change="onVisibleChange"
			@remove-tag="onRemoveTag"
		>
			<N8nOption
				v-if="options.length === 0 && filter && createEnabled"
				:key="CREATE_KEY"
				ref="createRef"
				:value="CREATE_KEY"
				class="ops"
			>
				<font-awesome-icon icon="plus-circle" />
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

			<N8nOption :key="MANAGE_KEY" :value="MANAGE_KEY" class="ops manage-tags">
				<font-awesome-icon icon="cog" />
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
		color: var(--color-text-dark);
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

		&:after {
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
		font-weight: 400;
		font-size: $--item-font-size;

		&.is-disabled {
			color: $custom-font-light;
			cursor: default;
		}

		&.selected {
			font-weight: bold;

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
