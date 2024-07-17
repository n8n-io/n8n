<template>
	<div class="item">
		<div v-if="item.options" class="options">
			<div v-if="item.options.length" class="headline clickable" @click="extended = !extended">
				<div v-if="extendAll !== true" class="options-toggle">
					<font-awesome-icon v-if="extended" icon="angle-down" />
					<font-awesome-icon v-else icon="angle-right" />
				</div>
				<div class="option-title" :title="item.key">
					{{ item.name }}

					<el-dropdown
						v-if="allowParentSelect === true"
						trigger="click"
						@click.stop
						@command="optionSelected($event, item)"
					>
						<span class="el-dropdown-link clickable" @click.stop>
							<font-awesome-icon
								icon="dot-circle"
								:title="$locale.baseText('variableSelectorItem.selectItem')"
							/>
						</span>
						<template #dropdown>
							<el-dropdown-menu>
								<el-dropdown-item
									v-for="operation in itemAddOperations"
									:key="operation.command"
									:command="operation.command"
									>{{ operation.displayName }}</el-dropdown-item
								>
							</el-dropdown-menu>
						</template>
					</el-dropdown>
				</div>
			</div>
			<div v-if="item.options && (extended === true || extendAll === true)">
				<variable-selector-item
					v-for="option in item.options"
					:key="option.key"
					:item="option"
					:extend-all="extendAll"
					:allow-parent-select="option.allowParentSelect"
					:redact-values="redactValues"
					class="sub-level"
					@item-selected="forwardItemSelected"
				></variable-selector-item>
			</div>
		</div>
		<div v-else class="value clickable" @click="selectItem(item)">
			<div class="item-title" :title="item.key">
				{{ item.name }}:
				<font-awesome-icon icon="dot-circle" title="Select Item" />
			</div>
			<div :class="{ 'ph-no-capture': redactValues, 'item-value': true }">
				{{ item.value !== undefined ? item.value : $locale.baseText('variableSelectorItem.empty') }}
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import type { IVariableSelectorOption, IVariableItemSelected } from '@/Interface';

const props = defineProps<{
	allowParentSelect?: boolean;
	extendAll?: boolean;
	item: IVariableSelectorOption;
	redactValues?: boolean;
}>();

const emit = defineEmits<{
	itemSelected: [value: IVariableItemSelected];
}>();

const extended = ref(false);

const itemAddOperations = computed(() => {
	const returnOptions = [
		{
			command: 'raw',
			displayName: 'Raw value',
		},
	];
	if (props.item.dataType === 'array') {
		returnOptions.push(
			{
				command: 'arrayLength',
				displayName: 'Length',
			},
			{
				command: 'arrayValues',
				displayName: 'Values',
			},
		);
	} else if (props.item.dataType === 'object') {
		returnOptions.push(
			{
				command: 'objectKeys',
				displayName: 'Keys',
			},
			{
				command: 'objectValues',
				displayName: 'Values',
			},
		);
	}
	return returnOptions;
});

onMounted(() => {
	if (extended.value) return;

	const shouldAutoExtend =
		['Current Node', 'Input Data', 'Binary', 'JSON'].includes(props.item.name) &&
		props.item.key === undefined;

	if (shouldAutoExtend) {
		extended.value = true;
	}
});

const optionSelected = (command: string, item: IVariableSelectorOption) => {
	let variable = item.key ?? '';
	if (command === 'arrayValues') {
		variable = `${item.key}.join(', ')`;
	} else if (command === 'arrayLength') {
		variable = `${item.key}.length`;
	} else if (command === 'objectKeys') {
		variable = `Object.keys(${item.key}).join(', ')`;
	} else if (command === 'objectValues') {
		variable = `Object.values(${item.key}).join(', ')`;
	}
	emit('itemSelected', { variable });
};

const selectItem = (item: IVariableSelectorOption) => {
	emit('itemSelected', { variable: item.key ?? '' });
};

const forwardItemSelected = (eventData: IVariableItemSelected) => {
	emit('itemSelected', eventData);
};
</script>

<style scoped lang="scss">
.option-title {
	position: relative;
	display: inline-block;
	font-size: 0.9em;
	font-weight: 600;
	padding: 0.2em 1em 0.2em 0.4em;
}
.item-title {
	font-weight: 600;
	font-size: 0.8em;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
.headline {
	position: relative;
	margin: 2px;
	margin-top: 10px;
	color: $color-primary;
}
.options-toggle {
	position: relative;
	top: 1px;
	margin: 0 3px 0 8px;
	display: inline;
}
.value {
	margin: 0.2em;
	padding: 0.1em 0.3em;
}
.item-value {
	font-size: 0.6em;
	overflow-x: auto;
}
.sub-level {
	padding-left: 20px;
}
</style>
