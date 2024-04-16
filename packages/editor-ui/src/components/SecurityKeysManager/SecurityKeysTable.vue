<template>
	<div :class="$style.container">
		<el-table ref="table" class="tags-table" stripe max-height="450" :data="keys">
			<el-table-column :label="$locale.baseText('securityKeysModal.table.id')">
				<template #default="scope">
					<transition name="fade" mode="out-in">
						<span v-if="scope.row.delete">{{
							$locale.baseText('securityKeysModal.table.confirmDelete')
						}}</span>
						<span v-else :class="$style.idCell" :title="scope.row.id">{{ scope.row.id }}</span>
					</transition>
				</template>
			</el-table-column>
			<el-table-column :label="$locale.baseText('securityKeysModal.table.name')">
				<template #default="scope">
					<transition name="fade" mode="out-in">
						<n8n-input
							v-if="scope.row.update"
							ref="nameInput"
							:model-value="newName"
							:maxlength="maxLength"
							@update:model-value="onNewNameChange"
						></n8n-input>
						<span v-else-if="!scope.row.delete">{{ scope.row.label }}</span>
					</transition>
				</template>
			</el-table-column>
			<el-table-column>
				<template #default="scope">
					<transition name="fade" mode="out-in">
						<div v-if="scope.row.update || scope.row.delete" :class="$style.actions">
							<n8n-button
								:label="$locale.baseText('generic.cancel')"
								type="secondary"
								@click.stop="cancel"
							/>
							<n8n-button
								:label="
									scope.row.delete
										? $locale.baseText('securityKeysModal.table.applyButton.delete')
										: $locale.baseText('securityKeysModal.table.applyButton.update')
								"
								@click.stop="apply"
							/>
						</div>
						<div v-else :class="$style.actions">
							<n8n-icon-button
								:title="$locale.baseText('securityKeysModal.table.editButton.label')"
								icon="pen"
								data-test-id="edit-tag-button"
								@click.stop="enableUpdate(scope.row)"
							/>
							<n8n-icon-button
								:title="$locale.baseText('securityKeysModal.table.deleteButton.label')"
								icon="trash"
								data-test-id="delete-tag-button"
								@click.stop="enableDelete(scope.row)"
							/>
						</div>
					</transition>
				</template>
			</el-table-column>
		</el-table>
	</div>
</template>

<script setup lang="ts">
import { defineProps } from 'vue';
import type { PropType } from 'vue';

const props = defineProps({
	keys: {
		type: Array as PropType<string[]>,
		required: true,
	},
	newName: {
		type: String,
		required: true,
	},
});

const emit = defineEmits([
	'updateEnable',
	'deleteEnable',
	'newNameChange',
	'cancelOperation',
	'applyOperation',
]);

const enableUpdate = (row: SecurityKey) => {
	if (row) {
		emit('updateEnable', row);
		emit('newNameChange', row.label);
	}
};

const enableDelete = (row: SecurityKey) => {
	if (row) {
		emit('deleteEnable', row);
	}
};

const onNewNameChange = (newName: string) => {
	emit('newNameChange', newName);
};

const cancel = () => {
	emit('cancelOperation');
};

const apply = () => {
	emit('applyOperation');
};
</script>

<style module lang="scss">
.container {
	display: flex;
}

.idCell {
	overflow: hidden;
	white-space: nowrap;
}

.actions {
	display: flex;
	gap: var(--spacing-2xs);
	justify-content: flex-end;
}
</style>
