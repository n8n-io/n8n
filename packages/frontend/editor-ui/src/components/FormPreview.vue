<script lang="ts" setup>
import type { FormFieldsParameter, INode } from 'n8n-workflow';
import Handlebars from 'handlebars';
import FormTemplate from '@/assets/templates/form-trigger.handlebars?raw';
import FormCompletionTemplate from '@/assets/templates/form-trigger-completion.handlebars?raw';
import { useTemplateRef, onMounted, onBeforeUnmount, watch, computed } from 'vue';
import { formPreviewEventBus } from '@/event-bus';
import { prepareFormData, tryToParseJsonToFormFields } from '@/utils/formUtils';
import { FORM_NODE_TYPE, FORM_TRIGGER_NODE_TYPE } from '@/constants';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';

interface BaseFormParameters {
	operation: 'page' | 'completion';
}

interface PageOperationParameters extends BaseFormParameters {
	operation: 'page';
	defineForm: 'fields' | 'json';
	jsonOutput?: string;
	formFields?: { values: FormFieldsParameter };
	options?: {
		formTitle?: string;
		formDescription?: string;
		buttonLabel?: string;
		customCss?: string;
		appendAttribution?: boolean;
	};
}

interface CompletionOperationParameters extends BaseFormParameters {
	operation: 'completion';
	respondWith: 'text' | 'redirect' | 'showText' | 'returnBinary';
	redirectUrl?: string;
	completionTitle?: string;
	completionMessage?: string;
	responseText?: string;
	inputDataFieldName?: string;
	options?: {
		formTitle?: string;
		appendAttribution?: boolean;
		customCss?: string;
	};
}

type FormNodeParameters = PageOperationParameters | CompletionOperationParameters;

interface FormTriggerNodeParameters {
	formTitle?: string;
	formDescription?: string;
	formFields: {
		values: FormFieldsParameter;
	};
	responseMode: 'onReceived' | 'lastNode' | 'responseNode';
	options?: {
		buttonLabel?: string;
		respondWith?: 'text' | 'redirect';
		completionTitle?: string;
		completionMessage?: string;
		redirectUrl?: string;
		appendAttribution?: boolean;
		customCss?: string;
	};
}

const props = defineProps<{ selectedNode: INode }>();

const iframeRef = useTemplateRef('formIframe');
const nodeTypesStore = useNodeTypesStore();

const renderFormTemplate = computed(() => Handlebars.compile(FormTemplate));
const renderFormCompletionTemplate = computed(() => Handlebars.compile(FormCompletionTemplate));

const renderTemplate = (html: string) => {
	if (!iframeRef.value) return;
	iframeRef.value.srcdoc = html;

	// Wait for iframe to load, then initialize form
	iframeRef.value.onload = () => {
		console.log('Iframe loaded');
	};
};

function isFormTriggerParameters(
	params: FormNodeParameters | FormTriggerNodeParameters,
): params is FormTriggerNodeParameters {
	return 'formTitle' in params;
}

function renderFormPage(params: PageOperationParameters | FormTriggerNodeParameters) {
	let fields: { values?: FormFieldsParameter } = {};
	if (props.selectedNode.parameters.jsonOutput) {
		fields = { values: tryToParseJsonToFormFields(props.selectedNode.parameters.jsonOutput) };
	} else {
		fields = props.selectedNode.parameters?.formFields as { values?: FormFieldsParameter };
	}

	const data = prepareFormData({
		formTitle:
			(isFormTriggerParameters(params) ? params.formTitle : params.options?.formTitle) ?? '',
		formDescription:
			(isFormTriggerParameters(params)
				? params.formDescription
				: params.options?.formDescription) ?? '',
		formSubmittedText: 'Custom submitted text',
		redirectUrl: 'Custom redirect url',
		formFields: fields.values ?? [],
		testRun: true,
		query: {},
		buttonLabel: params.options?.buttonLabel ?? 'Submit',
		appendAttribution: params.options?.appendAttribution,
		customCss: params.options?.customCss,
	});
	const html = renderFormTemplate.value(data);
	renderTemplate(html);
}

function renderFormCompletion(params: CompletionOperationParameters) {
	const data = {
		title: params.completionTitle,
		formTitle: params.options?.formTitle,
		message: params.completionMessage,
		appendAttribution: params.options?.appendAttribution,
		responseText: params.responseText,
		// TODO: sanitize
		dangerousCustomCss: params.options?.customCss,
		redirectUrl: params.redirectUrl,
	};
	const html = renderFormCompletionTemplate.value(data);
	renderTemplate(html);
}

function onFormUpdate() {
	if (props.selectedNode.type === FORM_NODE_TYPE) {
		const params = props.selectedNode.parameters as unknown as FormNodeParameters;
		if (params.operation === 'page') {
			renderFormPage(params);
		} else if (params.operation === 'completion') {
			renderFormCompletion(params);
		}
	} else if (props.selectedNode.type === FORM_TRIGGER_NODE_TYPE) {
		const params = props.selectedNode.parameters as unknown as FormTriggerNodeParameters;
		renderFormPage(params);
	}
}

function onParameterFocused({ fieldId }: { fieldId: string }) {
	if (!iframeRef.value?.contentWindow) return;

	// Send focusElement message to iframe
	iframeRef.value.contentWindow.postMessage(
		{
			type: 'focusElement',
			elementId: fieldId,
		},
		'*',
	);
}

async function renderPreview() {
	console.log('node preview', props.selectedNode);
	const response = await nodeTypesStore.getNodeParameterPreview({
		nodeTypeAndVersion: {
			name: props.selectedNode.type,
			version: props.selectedNode.typeVersion,
		},
		path: 'parameters',
		currentNodeParameters: props.selectedNode.parameters,
	});
	console.log('node preview response', response);
}

// Set the initial output mode when the component is mounted
onMounted(async () => {
	formPreviewEventBus.on('parameter-updated', onFormUpdate);
	formPreviewEventBus.on('parameter-focused', onParameterFocused);
	onFormUpdate();
	await renderPreview();
});

onBeforeUnmount(() => {
	formPreviewEventBus.off('parameter-updated', onFormUpdate);
	formPreviewEventBus.off('parameter-focused', onParameterFocused);
});

watch(() => props.selectedNode, onFormUpdate);
</script>
<template>
	<div :class="$style.iframeContainer">
		<iframe id="formIframe" ref="formIframe" :class="$style.formIframe" src="about:blank"></iframe>
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
