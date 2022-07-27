<template>
	<div :class="{'tags-container': true, focused}" @keydown.stop v-click-outside="onClickOutside">
		<n8n-select
			:popperAppendToBody="false"
			:value="appliedTags"
			:loading="isLoading"
			:placeholder="placeholder"
			:filter-method="filterOptions"
			@change="onTagsUpdated"
			@visible-change="onVisibleChange"
			@remove-tag="onRemoveTag"
			filterable
			multiple
			ref="select"
			loading-text="..."
			popper-class="tags-dropdown"
			size="medium"
		>
			<n8n-option
				v-if="options.length === 0 && filter && createEnabled"
				:key="CREATE_KEY"
				:value="CREATE_KEY"
				class="ops"
				ref="create"
			>
				<font-awesome-icon icon="plus-circle" />
				<span>
					{{ $locale.baseText('tagsDropdown.createTag', { interpolate: { filter } }) }}
				</span>
			</n8n-option>
			<n8n-option v-else-if="options.length === 0" value="message" disabled>
				<span v-if="createEnabled">{{ $locale.baseText('tagsDropdown.typeToCreateATag') }}</span>
				<span v-else-if="allTags.length > 0">{{ $locale.baseText('tagsDropdown.noMatchingTagsExist') }}</span>
				<span v-else>{{ $locale.baseText('tagsDropdown.noTagsExist') }}</span>
			</n8n-option>

			<!-- key is id+index for keyboard navigation to work well with filter -->
			<n8n-option
				v-for="(tag, i) in options"
				:value="tag.id"
				:key="tag.id + '_' + i"
				:label="tag.name"
				class="tag"
				ref="tag"
			/>

			<n8n-option :key="MANAGE_KEY" :value="MANAGE_KEY" class="ops manage-tags">
				<font-awesome-icon icon="cog" />
				<span>{{ $locale.baseText('tagsDropdown.manageTags') }}</span>
			</n8n-option>
		</n8n-select>
	</div>
</template>

<script lang="ts">
import mixins from "vue-typed-mixins";
import { mapGetters } from "vuex";

import { ITag } from "@/Interface";
import { MAX_TAG_NAME_LENGTH, TAGS_MANAGER_MODAL_KEY } from "@/constants";

import { showMessage } from "@/components/mixins/showMessage";

const MANAGE_KEY = "__manage";
const CREATE_KEY = "__create";

export default mixins(showMessage).extend({
	name: "TagsDropdown",
	props: ["placeholder", "currentTagIds", "createEnabled", "eventBus"],
	data() {
		return {
			filter: "",
			MANAGE_KEY,
			CREATE_KEY,
			focused: false,
			preventUpdate: false,
		};
	},
	mounted() {
		const select = this.$refs.select as (Vue | undefined);
		if (select) {
			const input = select.$refs.input as (Element | undefined);
			if (input) {
				input.setAttribute('maxlength', `${MAX_TAG_NAME_LENGTH}`);
				input.addEventListener('keydown', (e: Event) => {
					const keyboardEvent = e as KeyboardEvent;
					// events don't bubble outside of select, so need to hook onto input
					if (keyboardEvent.key === 'Escape') {
						this.$emit('esc');
					}
					else if (keyboardEvent.key === 'Enter' && this.filter.length === 0) {
						this.$data.preventUpdate = true;
						this.$emit('blur');

						// @ts-ignore
						if (this.$refs.select && typeof this.$refs.select.blur === 'function') {
							// @ts-ignore
							this.$refs.select.blur();
						}
					}
				});
			}
		}

		if (this.$props.eventBus) {
			this.$props.eventBus.$on('focus', () => {
				this.focusOnInput();
				this.focusOnTopOption();
			});
		}

		this.$store.dispatch("tags/fetchAll");
	},
	computed: {
		...mapGetters("tags", ["allTags", "isLoading", "hasTags"]),
		options(): ITag[] {
			return this.allTags
				.filter((tag: ITag) =>
					tag && tag.name.toLowerCase().includes(this.$data.filter.toLowerCase()),
				);
		},
		appliedTags(): string[] {
			return this.$props.currentTagIds.filter((id: string) =>
				this.$store.getters['tags/getTagById'](id),
			);
		},
	},
	methods: {
		filterOptions(filter = "") {
			this.$data.filter = filter.trim();
			this.$nextTick(() => this.focusOnTopOption());
		},
		async onCreate() {
			const name = this.$data.filter;
			try {
				const newTag = await this.$store.dispatch("tags/create", name);
				this.$emit("update", [...this.$props.currentTagIds, newTag.id]);
				this.$nextTick(() => this.focusOnTag(newTag.id));

				this.$data.filter = "";
			} catch (error) {
				this.$showError(
					error,
					this.$locale.baseText('tagsDropdown.showError.title'),
					this.$locale.baseText(
						'tagsDropdown.showError.message',
						{ interpolate: { name } },
					),
				);
			}
		},
		onTagsUpdated(selected: string[]) {
			const ops = selected.find(
				(value) => value === MANAGE_KEY || value === CREATE_KEY,
			);
			if (ops === MANAGE_KEY) {
				this.$data.filter = "";
				this.$store.dispatch("ui/openModal", TAGS_MANAGER_MODAL_KEY);
			} else if (ops === CREATE_KEY) {
				this.onCreate();
			} else {
				setTimeout(() => {
					if (!this.$data.preventUpdate) {
						this.$emit("update", selected);
					}
					this.$data.preventUpdate = false;
				}, 0);
			}
		},
		focusOnTopOption() {
			const tags = this.$refs.tag as Vue[] | undefined;
			const create = this.$refs.create as Vue | undefined;
			//@ts-ignore // focus on create option
			if (create && create.hoverItem) {
				// @ts-ignore
				create.hoverItem();
			}
			//@ts-ignore // focus on top option after filter
			else if (tags && tags[0] && tags[0].hoverItem) {
				// @ts-ignore
				tags[0].hoverItem();

				// @ts-ignore
				if (tags[0] && tags[0].$el && tags[0].$el.scrollIntoView) {
					// @ts-ignore
					tags[0].$el.scrollIntoView();
				}
			}
		},
		focusOnTag(tagId: string) {
			const tagOptions = (this.$refs.tag as Vue[]) || [];
			if (tagOptions && tagOptions.length) {
				const added = tagOptions.find((ref: any) => ref.value === tagId); // tslint:disable-line:no-any
				// @ts-ignore // focus on newly created item
				if (added && added.$el && added.$el.scrollIntoView && added.hoverItem) {
					// @ts-ignore
					added.hoverItem();
					added.$el.scrollIntoView();
				}
			}
		},
		focusOnInput() {
			const select = this.$refs.select as Vue;
			const input = select && select.$refs.input as HTMLElement;
			if (input && input.focus) {
				input.focus();
				this.focused = true;
			}
		},
		onVisibleChange(visible: boolean) {
			if (!visible) {
				this.$data.filter = '';
				this.focused = false;
			}
			else {
				this.focused = true;
			}
		},
		onRemoveTag() {
			this.$nextTick(() => {
				this.focusOnInput();
			});
		},
		onClickOutside(e: Event) {
			if (e.type === 'click') {
				this.$emit('blur');
			}
		},
	},
	watch: {
		allTags() {
			// keep applied tags in sync with store
			// for example in case tag is deleted from store
			if (this.currentTagIds.length !== this.appliedTags.length) {
				this.$emit("update", this.appliedTags);
			}
		},
	},
});
</script>

<style lang="scss" scoped>
$--max-input-height: 60px;

::v-deep .el-select {
	.el-select__tags {
		max-height: $--max-input-height;
		overflow-y: scroll;
		overflow-x: hidden;
	}

	input {
		max-height: $--max-input-height;
	}
}
</style>

<style lang="scss">
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
			content: " ";
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
			color: $--custom-font-light;
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

			&:after { // selected check
				font-size: $--item-font-size !important;
			}
		}

		&.ops {
			color: $--color-primary;
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
