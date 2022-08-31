<template>
	<Modal
		:name="modalName"
		:eventBus="modalBus"
		@enter="save"
		:title="$locale.baseText('duplicateWorkflowDialog.duplicateWorkflow')"
		:center="true"
		width="420px"
	>
		<template v-slot:content>
			<div :class="$style.content">
				<n8n-input
					v-model="name"
					ref="nameInput"
					:placeholder="$locale.baseText('duplicateWorkflowDialog.enterWorkflowName')"
					:maxlength="MAX_WORKFLOW_NAME_LENGTH"
				/>
				<TagsDropdown
					v-if="areTagsEnabled"
					:createEnabled="true"
					:currentTagIds="currentTagIds"
					:eventBus="dropdownBus"
					@blur="onTagsBlur"
					@esc="onTagsEsc"
					@update="onTagsUpdate"
					:placeholder="$locale.baseText('duplicateWorkflowDialog.chooseOrCreateATag')"
					ref="dropdown"
				/>
			</div>
		</template>
		<template v-slot:footer="{ close }">
			<div :class="$style.footer">
				<n8n-button @click="save" :loading="isSaving" :label="$locale.baseText('duplicateWorkflowDialog.save')" float="right" />
				<n8n-button type="secondary" @click="close" :disabled="isSaving" :label="$locale.baseText('duplicateWorkflowDialog.cancel')" float="right" />
			</div>
		</template>
	</Modal>
</template>

<script lang="ts">
import Vue from "vue";
import mixins from "vue-typed-mixins";

import { MAX_WORKFLOW_NAME_LENGTH } from "@/constants";
import { workflowHelpers } from "@/components/mixins/workflowHelpers";
import { showMessage } from "@/components/mixins/showMessage";
import TagsDropdown from "@/components/TagsDropdown.vue";
import Modal from "./Modal.vue";
import { mapGetters } from "vuex";

export default mixins(showMessage, workflowHelpers).extend({
	components: { TagsDropdown, Modal },
	name: "DuplicateWorkflow",
	props: ["modalName", "isActive"],
	data() {
		const currentTagIds = this.$store.getters[
			"workflowTags"
		] as string[];

		return {
			name: '',
			currentTagIds,
			isSaving: false,
			modalBus: new Vue(),
			dropdownBus: new Vue(),
			MAX_WORKFLOW_NAME_LENGTH,
			prevTagIds: currentTagIds,
		};
	},
	async mounted() {
		this.$data.name = await this.$store.dispatch('workflows/getDuplicateCurrentWorkflowName');
		this.$nextTick(() => this.focusOnNameInput());
	},
	computed: {
		...mapGetters('settings', ['areTagsEnabled']),
	},
	watch: {
		isActive(active) {
			if (active) {
				this.focusOnSelect();
			}
		},
	},
	methods: {
		focusOnSelect() {
			this.dropdownBus.$emit('focus');
		},
		focusOnNameInput() {
			const input = this.$refs.nameInput as HTMLElement;
			if (input && input.focus) {
				input.focus();
			}
		},
		onTagsBlur() {
			this.prevTagIds = this.currentTagIds;
		},
		onTagsEsc() {
			// revert last changes
			this.currentTagIds = this.prevTagIds;
		},
		onTagsUpdate(tagIds: string[]) {
			this.currentTagIds = tagIds;
		},
		async save(): Promise<void> {
			const name = this.name.trim();
			if (!name) {
				this.$showMessage({
					title: this.$locale.baseText('duplicateWorkflowDialog.showMessage.title'),
					message: this.$locale.baseText('duplicateWorkflowDialog.showMessage.message'),
					type: "error",
				});

				return;
			}

			const currentWorkflowId = this.$store.getters.workflowId;

			this.$data.isSaving = true;

			const saved = await this.saveAsNewWorkflow({name, tags: this.currentTagIds, resetWebhookUrls: true, openInNewWindow: true, resetNodeIds: true});

			if (saved) {
				this.closeDialog();
				this.$telemetry.track('User duplicated workflow', {
					old_workflow_id: currentWorkflowId,
					workflow_id: this.$store.getters.workflowId,
				});
			}

			this.$data.isSaving = false;
		},
		closeDialog(): void {
			this.modalBus.$emit("close");
		},
	},
});
</script>

<style lang="scss" module>
.content {
	> *:not(:last-child) {
		margin-bottom: var(--spacing-m);
	}
}

.footer {
	> * {
		margin-left: var(--spacing-3xs);
	}
}
</style>
