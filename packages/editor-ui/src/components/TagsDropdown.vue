<template>
	<div class="tags-container">
		<el-select
			filterable
			multiple
			:popperAppendToBody="false"
			popper-class="tags-dropdown"
			:value="appliedTags"
			:loading="isLoading"
			:placeholder="placeholder"
			:filter-method="filterOptions"
			@change="tagsUpdated"
		>
			<el-option
				v-if="options.length === 0 && filter"
				:key="CREATE_KEY"
				:value="CREATE_KEY"
				class="ops"
				ref="create"
			>
				<font-awesome-icon icon="plus-circle" />
				<span>Create tag "{{ filter }}"</span>
			</el-option>
			<el-option v-else-if="options.length === 0" value="message" disabled>
				<span>Type to create a tag</span>
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

			<el-option :key="MANAGE_KEY" :value="MANAGE_KEY" class="ops">
				<font-awesome-icon icon="cog" />
				<span>Manage Tags</span>
			</el-option>
		</el-select>
	</div>
</template>

<script lang="ts">
import { mapGetters, mapState } from "vuex";
import { ITag } from "@/Interface";
import { showMessage } from "@/components/mixins/showMessage";

import mixins from "vue-typed-mixins";

const MANAGE_KEY = "__manage";
const CREATE_KEY = "__create";

export default mixins(showMessage).extend({
	name: "TagsDropdown",
	props: ["placeholder", "currentTagIds"],
	data() {
		return {
			filter: "",
			MANAGE_KEY,
			CREATE_KEY,
		};
	},
	created() {
		this.$store.dispatch("tags/getAll");
	},
	computed: {
		options() {
			return this.tags.filter(({ name }: ITag) =>
				name.toLowerCase().includes(this.$data.filter.toLowerCase()),
			);
		},
		appliedTags() {
			return this.$props.currentTagIds.filter((id: string) =>
				this.tags.find((tag: ITag) => tag.id === id),
			);
		},
		...mapState("tags", [
			"tags",
			"isLoading",
		]),
		...mapGetters("tags", ["hasTags"]),
	},
	methods: {
		filterOptions(filter = "") {
			this.$data.filter = filter.trim();
			this.$nextTick(() => {
				// forgive me father for I have sinned
				if (this.$refs.create) {
					// @ts-ignore
					this.$refs.create.hoverItem();
				}
				// @ts-ignore
				else if (this.$refs.tag && this.$refs.tag[0]) {
					// @ts-ignore
					this.$refs.tag[0].hoverItem();
				}
			});
		},
		async onCreate() {
			const name = this.$data.filter;
			try {
				const newTag = await this.$store.dispatch("tags/addNew", name);
				this.$emit("onUpdate", [...this.$props.currentTagIds, newTag.id]);

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
				// @ts-ignore
				this.onCreate();
			} else {
				this.$emit("onUpdate", selected);
			}
		},
	},
});
</script>

<style lang="scss">
.tags-dropdown {
	min-width: 224px !important;

	li {
		padding: 6px 20px;
		margin: 0;

		:hover {
			background-color: #f5f7fa;
		}

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
	}
}
</style>
