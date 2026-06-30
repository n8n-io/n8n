<script setup lang="ts">
import { ref } from 'vue';

import Checkbox from '../Checkbox/Checkbox.vue';

import TreeNodeDefault from './TreeNodeDefault.vue';
import treeVariables from './Tree.variables.module.css';

const noop = () => undefined;

const selected = ref(false);
const disabledSelected = ref(true);

function toggleSelected() {
	selected.value = !selected.value;
}
</script>

<template>
	<div :class="$style.showcase">
		<div :class="$style.variant">
			<span :class="$style.variantLabel">Checkbox icon (interactive)</span>
			<div role="treeitem" tabindex="0" :class="[treeVariables.root, $style.treeItemShell]">
				<TreeNodeDefault
					label="Workflows"
					:is-expanded="false"
					:is-selected="selected"
					:has-children="true"
					:handle-toggle="noop"
					:handle-select="toggleSelected"
				>
					<template #icon="{ disabled, ui }">
						<span v-bind="ui">
							<Checkbox
								:model-value="selected"
								:disabled="disabled"
								@click.stop
								@update:model-value="toggleSelected"
							/>
						</span>
					</template>
				</TreeNodeDefault>
			</div>
		</div>

		<div :class="$style.variant">
			<span :class="$style.variantLabel">Checkbox icon (disabled)</span>
			<div role="treeitem" tabindex="0" :class="[treeVariables.root, $style.treeItemShell]">
				<TreeNodeDefault
					label="Credentials"
					disabled
					:is-expanded="false"
					:is-selected="disabledSelected"
					:has-children="false"
					:handle-toggle="noop"
					:handle-select="noop"
				>
					<template #icon="{ disabled, ui }">
						<span v-bind="ui">
							<Checkbox :model-value="disabledSelected" :disabled="disabled" />
						</span>
					</template>
				</TreeNodeDefault>
			</div>
		</div>
	</div>
</template>

<style lang="css" module>
.showcase {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.variant {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.variantLabel {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
}

.treeItemShell {
	width: 320px;
}
</style>
