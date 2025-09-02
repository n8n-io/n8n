<script lang="ts" setup>
import type { FormFieldsParameter } from 'n8n-workflow';
import Handlebars from 'handlebars';
import FormTemplate from '@/assets/templates/form-trigger.handlebars?raw';
import { useTemplateRef, onMounted, onBeforeUnmount } from 'vue';
import { formPreviewEventBus } from '@/event-bus';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { prepareFormData } from '@/utils/formUtils';
import { useNDVStore } from '@/stores/ndv.store';
import { FORM_NODE_TYPE, FORM_TRIGGER_NODE_TYPE } from '@/constants';

const iframeRef = useTemplateRef('formIframe');
const ndvStore = useNDVStore();
const workflowsStore = useWorkflowsStore();

const compileTemplate = (context: unknown) => {
	return Handlebars.compile(FormTemplate)(context);
};

const renderTemplate = (html: string) => {
	if (!iframeRef.value) return;
	iframeRef.value.srcdoc = html;

	// Wait for iframe to load, then initialize form
	iframeRef.value.onload = () => {
		console.log('Iframe loaded');
	};
};

function onFormUpdate({ nodeId }: { nodeId: string }) {
	const node = workflowsStore.getNodeById(nodeId);
	const fields = node?.parameters?.formFields as { values?: FormFieldsParameter };
	const data = prepareFormData({
		formTitle: 'Custom title',
		formDescription: 'Custom description',
		formSubmittedText: 'Custom submitted text',
		redirectUrl: 'Custom redirect url',
		formFields: fields.values ?? [],
		testRun: true,
		query: {},
		buttonLabel: 'Submit',
	});
	const html = compileTemplate(data);
	renderTemplate(html);
}

// Set the initial output mode when the component is mounted
onMounted(() => {
	formPreviewEventBus.on('parameter-updated', onFormUpdate);
});

onBeforeUnmount(() => {
	formPreviewEventBus.off('parameter-updated', onFormUpdate);
});

onMounted(() => {
	const activeNode = ndvStore.activeNode;
	if (activeNode?.type === FORM_NODE_TYPE || activeNode?.type === FORM_TRIGGER_NODE_TYPE) {
		onFormUpdate({ nodeId: activeNode.id });
	}
});
</script>
<template>
	<div :class="$style.iframeContainer">
		<iframe id="formIframe" :class="$style.formIframe" src="about:blank" ref="formIframe"></iframe>
	</div>
</template>

<style lang="scss" module>
.iframeContainer {
	position: relative;
	width: 100%;
	height: 100%;
}
.formIframe {
	width: 100%;
	height: 99%;
}
</style>
