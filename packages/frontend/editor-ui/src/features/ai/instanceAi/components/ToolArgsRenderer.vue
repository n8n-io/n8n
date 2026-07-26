<script lang="ts" setup>
import { computed } from 'vue';
import {
	extractStrReplaceDiff,
	extractWriteFileView,
	writeFileToDiffView,
} from '../toolArgsDiff.utils';
import { extractExecuteCommandArgs } from '../toolCommand.utils';
import ToolArgsDiff from './ToolArgsDiff.vue';
import ToolCommandView from './ToolCommandView.vue';
import ToolResultJson from './ToolResultJson.vue';

const props = defineProps<{
	toolName: string;
	args: Record<string, unknown>;
}>();

const diffView = computed(() => {
	const strReplace = extractStrReplaceDiff(props.toolName, props.args);
	if (strReplace) return strReplace;

	const writeFile = extractWriteFileView(props.toolName, props.args);
	if (writeFile) return writeFileToDiffView(writeFile);

	return undefined;
});

const commandView = computed(() => extractExecuteCommandArgs(props.toolName, props.args));
</script>

<template>
	<ToolArgsDiff v-if="diffView" :diff="diffView" />
	<ToolCommandView v-else-if="commandView" :command="commandView" />
	<ToolResultJson v-else :value="props.args" />
</template>
