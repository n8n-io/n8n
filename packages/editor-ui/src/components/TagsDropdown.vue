<template>
	<div class="tags-container" @keydown.stop>
		<el-select
			filterable
			multiple
			ref="select"
			popper-class="tags-dropdown"
			:popperAppendToBody="false"
			:value="appliedTags"
			:loading="isLoading"
			:placeholder="placeholder"
			:filter-method="filterOptions"
			@change="tagsUpdated"
			loading-text="..."
		>
			<el-option
				v-if="options.length === 0 && filter && createEnabled"
				:key="CREATE_KEY"
				:value="CREATE_KEY"
				class="ops"
				ref="create"
			>
				<font-awesome-icon icon="plus-circle" />
				<span>Create tag "{{ filter }}"</span>
			</el-option>
			<el-option v-else-if="options.length === 0" value="message" disabled>
				<span v-if="createEnabled">Type to create a tag</span>
				<span v-else-if="tags.length > 0">No matching tags exist</span>
				<span v-else>No tags exist</span>
			</el-option>

			<!-- key is id+index for keyboard navigation to work well with filter -->
			<el-option
				v-for="(tag, i) in options"
				:value="tag.id"
				:key="tag.id + i"
				:label="tag.name"
				class="tag"
				ref="tag"
			/>

			<el-option :key="MANAGE_KEY" :value="MANAGE_KEY" class="ops manage-tags">
				<font-awesome-icon icon="cog" />
				<span>Manage tags</span>
			</el-option>
		</el-select>
	</div>
</template>

<script lang="ts">
import mixins from "vue-typed-mixins";
import { mapGetters } from "vuex";

import { ITag } from "@/Interface";
import { MAX_TAG_NAME_LENGTH } from "@/constants";

import { showMessage } from "@/components/mixins/showMessage";

const MANAGE_KEY = "__manage";
const CREATE_KEY = "__create";

export default mixins(showMessage).extend({
	name: "TagsDropdown",
	props: ["placeholder", "currentTagIds", "createEnabled"],
	data() {
		return {
			filter: "",
			MANAGE_KEY,
			CREATE_KEY,
		};
	},
	mounted() {
		const select = this.$refs.select as (Vue | undefined);
		if (select) {
			const input = select.$refs.input as (Element | undefined);
			if (input) {
				input.setAttribute('maxlength', `${MAX_TAG_NAME_LENGTH}`);
			}
		}

		this.$store.dispatch("tags/fetchAll");
	},
	computed: {
		...mapGetters("tags", ["tags", "isLoading", "hasTags"]),
		options(): ITag[] {
			return this.tags
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
				this.$emit("onUpdate", [...this.$props.currentTagIds, newTag.id]);
				this.$nextTick(() => this.focusOnTag(newTag.id));

				this.$showMessage({
					title: "New tag was created",
					message: `"${name}" was added to your tag collection`,
					type: "success",
				});
				this.$data.filter = "";
			} catch (error) {
				this.$showError(
					error,
					"New tag was not created",
					`A problem occurred when trying to create the "${name}" tag`,
				);
			}
		},
		tagsUpdated(selected: string[]) {
			const ops = selected.find(
				(value) => value === MANAGE_KEY || value === CREATE_KEY,
			);
			if (ops === MANAGE_KEY) {
				this.$data.filter = "";
				this.$store.commit("ui/openTagsManager");
			} else if (ops === CREATE_KEY) {
				this.onCreate();
			} else {
				this.$emit("onUpdate", selected);
			}
		},
		focusOnTopOption() {
			// @ts-ignore // focus on create option
			if (this.$refs.create && this.$refs.create.hoverItem) {
				// @ts-ignore
				this.$refs.create.hoverItem();
			}
			// @ts-ignore // focus on top option after filter
			else if (this.$refs.tag && this.$refs.tag[0] && this.$refs.tag[0].hoverItem) {
				// @ts-ignore
				this.$refs.tag[0].hoverItem();
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
	},
	watch: {
		tags() {
			// keep applied tags in sync with store
			// for example in case tag is deleted from store
			this.$emit("onUpdate", this.appliedTags);
		},
	},
});
</script>

<style lang="scss" scoped>
$--max-input-height: 60px;

/deep/ .el-select {
	.el-select__tags {
		max-height: $--max-input-height;
		overflow-y: auto;
		border-radius: 20px;
	}

	.el-input.is-focus {
		border: 1px solid #ff6d5a;
		border-radius: 20px;
	}

	input {
		max-height: $--max-input-height + 4;
	}
}
</style>

<style lang="scss">
.tags-dropdown {
	$--dropdown-length: 224px;
	$--item-height: 32px;

	min-width: $--dropdown-length !important;
	max-width: $--dropdown-length;

	* {
		box-sizing: border-box;
	}

	.el-scrollbar {
		position: relative;
		max-height: $--dropdown-length;

		ul {
			padding: 0;
			max-height: $--dropdown-length - $--item-height;
		}

		&:after {
			content: " ";
			display: block;
			height: $--item-height;
			width: 100%;
		}
	}

	li {
		height: $--item-height; 
		padding: 6px 20px;
		margin: 0;

		&.is-disabled {
			color: $--custom-font-light;
			cursor: default;
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
			min-width: $--dropdown-length;
		}
	}
}
</style>
