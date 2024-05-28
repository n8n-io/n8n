<template>
	<span :class="$style.container" data-test-id="node-title-container" @click="onEdit">
		<span :class="$style.iconWrapper">
			<NodeIcon :node-type="nodeType" :size="18" />
		</span>
		<n8n-popover placement="right" width="200" :visible="editName" :disabled="!editable">
			<div
				:class="$style.editContainer"
				@keydown.enter="onRename"
				@keydown.stop
				@keydown.esc="editName = false"
			>
				<n8n-text :bold="true" color="text-base" tag="div">{{
					$locale.baseText('ndv.title.renameNode')
				}}</n8n-text>
				<n8n-input ref="input" v-model="newName" size="small" data-test-id="node-rename-input" />
				<div :class="$style.editButtons">
					<n8n-button
						type="secondary"
						size="small"
						:label="$locale.baseText('ndv.title.cancel')"
						@click="editName = false"
					/>
					<n8n-button
						type="primary"
						size="small"
						:label="$locale.baseText('ndv.title.rename')"
						@click="onRename"
					/>
				</div>
			</div>
			<template #reference>
				<div :class="{ [$style.title]: true, [$style.hoverable]: editable }">
					{{ modelValue }}
					<div :class="$style.editIconContainer">
						<font-awesome-icon v-if="editable" :class="$style.editIcon" icon="pencil-alt" />
					</div>
				</div>
			</template>
		</n8n-popover>
	</span>
</template>

<script setup lang="ts">
import NodeIcon from '@/components/NodeIcon.vue';
import type { INodeTypeDescription } from 'n8n-workflow';
import { computed, nextTick, ref } from 'vue';

type Props = {
	modelValue: string;
	nodeType?: INodeTypeDescription;
	readOnly?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
	modelValue: '',
	nodeType: undefined,
	readOnly: false,
});
const emit = defineEmits<{
	(event: 'update:model-value', value: string): void;
}>();
const editName = ref(false);
const newName = ref('');
const input = ref<HTMLInputElement>();

const editable = computed(() => !props.readOnly && window === window.parent);

async function onEdit() {
	newName.value = props.modelValue;
	editName.value = true;
	await nextTick();
	if (input.value) {
		input.value.focus();
	}
}

function onRename() {
	if (newName.value.trim() !== '') {
		emit('update:model-value', newName.value.trim());
	}

	editName.value = false;
}
</script>

<style lang="scss" module>
.container {
	font-weight: var(--font-weight-bold);
	display: flex;
	font-size: var(--font-size-m);
	line-height: var(--font-line-height-compact);
	overflow-wrap: anywhere;
	padding-right: var(--spacing-s);
	overflow: hidden;
}

.title {
	max-height: 100px;
	display: -webkit-box;
	-webkit-line-clamp: 5;
	-webkit-box-orient: vertical;
	color: var(--color-text-dark);
}

.hoverable {
	&:hover {
		cursor: pointer;
		.editIcon {
			display: inline-block;
		}
	}
}

.iconWrapper {
	display: inline-flex;
	margin-right: var(--spacing-2xs);
}

.editIcon {
	display: none;
	font-size: var(--font-size-xs);
	color: var(--color-text-base);
	position: absolute;
	bottom: 0;
}

.editIconContainer {
	display: inline-block;
	position: relative;
	width: 0;
}

.editButtons {
	text-align: right;
	margin-top: var(--spacing-s);

	> * {
		margin-left: var(--spacing-4xs);
	}
}

.editContainer {
	text-align: left;

	> *:first-child {
		margin-bottom: var(--spacing-4xs);
	}
}
</style>
