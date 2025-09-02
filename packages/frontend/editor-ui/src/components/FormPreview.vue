<script lang="ts" setup>
import type { FormFieldsParameter, INode } from 'n8n-workflow';
import Handlebars from 'handlebars';
import FormTemplate from '@/assets/templates/form-trigger.handlebars?raw';
import { useTemplateRef, onMounted, onBeforeUnmount, watch } from 'vue';
import { formPreviewEventBus } from '@/event-bus';
import { prepareFormData } from '@/utils/formUtils';

const props = defineProps<{ selectedNode: INode }>();

const iframeRef = useTemplateRef('formIframe');

const compileTemplate = (context: unknown) => {
	return Handlebars.compile(FormTemplate)(context);
};

const renderTemplate = (html: string) => {
	console.log('render', iframeRef.value);
	if (!iframeRef.value) return;
	iframeRef.value.srcdoc = html;

	// Wait for iframe to load, then initialize form
	iframeRef.value.onload = () => {
		console.log('Iframe loaded');
	};
};

function onFormUpdate() {
	const fields = props.selectedNode.parameters?.formFields as { values?: FormFieldsParameter };
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

onMounted(() => {
	formPreviewEventBus.on('parameter-updated', onFormUpdate);
	onFormUpdate();
});

onBeforeUnmount(() => {
	formPreviewEventBus.off('parameter-updated', onFormUpdate);
});

watch(() => props.selectedNode, onFormUpdate);
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
