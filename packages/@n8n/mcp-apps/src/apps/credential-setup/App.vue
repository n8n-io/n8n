<script setup lang="ts">
import type { App as McpApp } from '@modelcontextprotocol/ext-apps';
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue';

import type {
	CredentialSetupField,
	CredentialSetupOutput,
	CredentialSetupSafeResult,
} from '../../shared/credential-setup';
import {
	buildCredentialCreateArguments,
	createInitialFormData,
	isCredentialSetupOutput,
	isCredentialSetupSafeResult,
	type CredentialSetupFormData,
} from './credential-setup.utils';

const props = defineProps<{
	mcp: McpApp;
}>();

type SetupStage =
	| 'waiting'
	| 'ready'
	| 'creating'
	| 'authorizing'
	| 'polling'
	| 'complete'
	| 'error';

type SetupCredentialInput = {
	credentialType: string;
	projectId?: string;
	suggestedName?: string;
	nodeType?: string;
	purpose?: string;
};

const setup = shallowRef<CredentialSetupOutput | null>(null);
const setupInput = shallowRef<SetupCredentialInput | null>(null);
const formData = ref<CredentialSetupFormData>({});
const result = shallowRef<CredentialSetupSafeResult | null>(null);
const stage = ref<SetupStage>('waiting');
const errorLabel = ref<string | null>(null);
const pollTimer = ref<number | null>(null);
const pollDeadline = ref<number>(0);
const schemaRetryTimer = ref<number | null>(null);
const schemaRetryCount = ref(0);

const statusText = computed(() => {
	if (errorLabel.value) return errorLabel.value.replaceAll('_', ' ');
	if (stage.value === 'creating') return 'Creating credential';
	if (stage.value === 'authorizing') return 'Opening authorization';
	if (stage.value === 'polling') return 'Waiting for authorization';
	if (stage.value === 'complete') return 'Credential setup complete';
	return '';
});

props.mcp.ontoolresult = (toolResult) => {
	const structuredContent = toolResult.structuredContent;
	if (isCredentialSetupSafeResult(structuredContent)) {
		result.value = structuredContent;
		if (structuredContent.status === 'error') {
			errorLabel.value = structuredContent.error ?? 'credential_setup_failed';
			stage.value = 'error';
			return;
		}

		stage.value = 'complete';
		void props.mcp.requestTeardown();
		return;
	}

	if (!isCredentialSetupOutput(structuredContent)) return;
	stopPolling();
	setup.value = structuredContent;
	formData.value = createInitialFormData(structuredContent.fields);
	result.value = null;
	errorLabel.value = null;
	stage.value = 'ready';
};

props.mcp.ontoolinput = ({ arguments: toolArguments }) => {
	const parsedInput = parseSetupCredentialInput(toolArguments);
	if (parsedInput) setupInput.value = parsedInput;
	if (setup.value) return;

	void loadSetupSchema();
};

props.mcp.ontoolinputpartial = ({ arguments: toolArguments }) => {
	if (setupInput.value) return;

	const parsedInput = parseSetupCredentialInput(toolArguments);
	if (parsedInput) setupInput.value = parsedInput;
	if (setup.value || !setupInput.value) return;

	void loadSetupSchema();
};

onMounted(() => {
	void loadSetupSchema();
});

onBeforeUnmount(() => {
	stopPolling();
	stopSchemaRetry();
	clearForm();
});

async function loadSetupSchema() {
	const describeArguments = getDescribeArguments();
	if (!describeArguments) {
		scheduleSchemaRetry();
		return;
	}

	try {
		const toolResult = await props.mcp.callServerTool({
			name: 'credential_setup_describe',
			arguments: describeArguments,
		});
		const structuredContent = toolResult.structuredContent;
		if (!isCredentialSetupOutput(structuredContent) || toolResult.isError) {
			scheduleSchemaRetry();
			return;
		}

		stopSchemaRetry();
		setup.value = structuredContent;
		formData.value = createInitialFormData(structuredContent.fields);
		result.value = null;
		errorLabel.value = null;
		stage.value = 'ready';
	} catch {
		scheduleSchemaRetry();
	}
}

function scheduleSchemaRetry() {
	if (setup.value || schemaRetryTimer.value !== null) return;

	schemaRetryCount.value += 1;
	if (schemaRetryCount.value > 20) {
		errorLabel.value = 'credential_setup_session_not_found';
		stage.value = 'error';
		return;
	}

	schemaRetryTimer.value = window.setTimeout(() => {
		schemaRetryTimer.value = null;
		void loadSetupSchema();
	}, 500);
}

function stopSchemaRetry() {
	if (schemaRetryTimer.value !== null) {
		window.clearTimeout(schemaRetryTimer.value);
		schemaRetryTimer.value = null;
	}
	schemaRetryCount.value = 0;
}

async function submitCredential() {
	const currentSetup = setup.value;
	if (!currentSetup || currentSetup.hasUnsupportedFields) return;

	stage.value = 'creating';
	errorLabel.value = null;

	const createResult = await callSetupTool('credential_setup_create', {
		arguments: buildCredentialCreateArguments(currentSetup, formData.value),
	});
	if (!createResult?.credentialId) return;

	result.value = createResult;
	clearForm();

	if (!currentSetup.isOAuth) {
		stage.value = 'complete';
		await finishSetup();
		return;
	}

	await authorizeCredential(createResult.credentialId);
}

async function authorizeCredential(credentialId: string) {
	stage.value = 'authorizing';
	const authorizeResult = await callSetupTool('credential_setup_oauth_authorize', {
		arguments: { credentialId, setupSessionId: setup.value?.setupSessionId },
	});
	if (!authorizeResult?.credentialId || !authorizeResult.authorizationUrl) return;

	result.value = authorizeResult;
	await openUrl(authorizeResult.authorizationUrl);
	stage.value = 'polling';
	startPolling(authorizeResult.credentialId);
}

async function testCredential() {
	const credentialId = result.value?.credentialId;
	if (!credentialId) return;

	errorLabel.value = null;
	const testResult = await callSetupTool('credential_setup_test', {
		arguments: { credentialId, setupSessionId: setup.value?.setupSessionId },
	});
	if (testResult) {
		result.value = testResult;
		if (testResult.status === 'tested') stage.value = 'complete';
	}
}

async function cancelSetup() {
	const credentialId = result.value?.credentialId;
	const setupSessionId = setup.value?.setupSessionId;
	if ((credentialId || setupSessionId) && stage.value !== 'complete') {
		await callSetupTool('credential_setup_delete_draft', {
			arguments: { credentialId, setupSessionId },
		});
	}

	stopPolling();
	clearForm();
	result.value = null;
	stage.value = 'ready';
	await props.mcp.requestTeardown();
}

async function openFallback(event?: MouseEvent) {
	event?.preventDefault();
	const url = result.value?.fallbackUrl ?? setup.value?.fallbackUrl;
	if (!url) return;

	await openUrl(url);
}

async function callSetupTool(
	name: string,
	params: { arguments: Record<string, unknown> },
): Promise<CredentialSetupSafeResult | null> {
	try {
		const toolResult = await props.mcp.callServerTool({ name, ...params });
		const safeResult = isCredentialSetupSafeResult(toolResult.structuredContent)
			? toolResult.structuredContent
			: null;

		if (toolResult.isError || !safeResult) {
			errorLabel.value = safeResult?.error ?? 'credential_setup_failed';
			stage.value = 'error';
			return safeResult;
		}

		return safeResult;
	} catch {
		errorLabel.value = 'credential_setup_failed';
		stage.value = 'error';
		return null;
	}
}

function startPolling(credentialId: string) {
	stopPolling();
	pollDeadline.value = Date.now() + 120_000;
	pollTimer.value = window.setInterval(() => {
		void pollCredentialStatus(credentialId);
	}, 2000);
	void pollCredentialStatus(credentialId);
}

async function pollCredentialStatus(credentialId: string) {
	if (Date.now() > pollDeadline.value) {
		stopPolling();
		errorLabel.value = 'oauth_authorization_pending';
		stage.value = 'error';
		return;
	}

	const statusResult = await callSetupTool('credential_setup_status', {
		arguments: { credentialId, setupSessionId: setup.value?.setupSessionId },
	});
	if (!statusResult) return;

	result.value = statusResult;
	if (statusResult.connected) {
		stopPolling();
		stage.value = 'complete';
		await finishSetup();
	}
}

function stopPolling() {
	if (pollTimer.value !== null) {
		window.clearInterval(pollTimer.value);
		pollTimer.value = null;
	}
}

async function openUrl(url: string) {
	try {
		const linkResult = await props.mcp.openLink({ url });
		if (linkResult.isError) {
			errorLabel.value = 'open_link_failed';
			stage.value = 'error';
		}
	} catch {
		errorLabel.value = 'open_link_failed';
		stage.value = 'error';
	}
}

async function finishSetup() {
	await props.mcp.requestTeardown();
}

function clearForm() {
	formData.value = {};
}

function setFieldValue(name: string, value: unknown) {
	formData.value = {
		...formData.value,
		[name]: value,
	};
}

function getFieldValue(name: string): string {
	const value = formData.value[name];
	return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}

function getBooleanValue(name: string): boolean {
	return formData.value[name] === true;
}

function getMultiOptionValue(name: string): string[] {
	const value = formData.value[name];
	return Array.isArray(value) ? value.filter((item) => typeof item === 'string') : [];
}

function getInputValue(event: Event): string {
	const target = event.target;
	return target instanceof HTMLInputElement ||
		target instanceof HTMLTextAreaElement ||
		target instanceof HTMLSelectElement
		? target.value
		: '';
}

function getCheckedValue(event: Event): boolean {
	const target = event.target;
	return target instanceof HTMLInputElement ? target.checked : false;
}

function getSelectedValues(event: Event): string[] {
	const target = event.target;
	if (!(target instanceof HTMLSelectElement)) return [];

	return Array.from(target.selectedOptions, (option) => option.value);
}

function optionValue(value: string | number | boolean): string {
	return String(value);
}

function fieldAutocomplete(field: CredentialSetupField): string {
	return field.password ? 'new-password' : 'off';
}

function getSetupSessionId(): string | undefined {
	const id = props.mcp.getHostContext()?.toolInfo?.id;
	if (typeof id === 'string' || typeof id === 'number') {
		return String(id);
	}

	return setup.value?.setupSessionId;
}

function getDescribeArguments(): Record<string, unknown> | null {
	const setupSessionId = getSetupSessionId();
	const input = setupInput.value ?? findSetupCredentialInput(props.mcp.getHostContext());
	if (setupSessionId) {
		return input ? { ...input, setupSessionId } : { setupSessionId };
	}

	return input ? { ...input } : {};
}

function parseSetupCredentialInput(value: unknown): SetupCredentialInput | null {
	if (!isRecord(value) || typeof value.credentialType !== 'string') {
		return null;
	}

	return {
		credentialType: value.credentialType,
		...(typeof value.projectId === 'string' ? { projectId: value.projectId } : {}),
		...(typeof value.suggestedName === 'string' ? { suggestedName: value.suggestedName } : {}),
		...(typeof value.nodeType === 'string' ? { nodeType: value.nodeType } : {}),
		...(typeof value.purpose === 'string' ? { purpose: value.purpose } : {}),
	};
}

function findSetupCredentialInput(value: unknown, depth = 0): SetupCredentialInput | null {
	const input = parseSetupCredentialInput(value);
	if (input) return input;

	if (depth > 3 || !isRecord(value)) return null;

	for (const child of Object.values(value)) {
		const childInput = findSetupCredentialInput(child, depth + 1);
		if (childInput) return childInput;
	}

	return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
</script>

<template>
	<main class="credential-shell">
		<section v-if="setup" class="credential-panel" aria-live="polite">
			<header class="credential-header">
				<div>
					<p class="credential-eyebrow">n8n credential</p>
					<h1>{{ setup.credentialDisplayName }}</h1>
					<p v-if="setup.purpose" class="credential-purpose">{{ setup.purpose }}</p>
				</div>
				<span v-if="setup.isOAuth" class="credential-mode">OAuth</span>
			</header>

			<div v-if="setup.hasUnsupportedFields" class="fallback-state">
				<p>This credential uses fields that are not available in this setup view.</p>
				<button type="button" class="primary-button" @click="openFallback">Open in n8n</button>
			</div>

			<form v-else class="credential-form" autocomplete="off" @submit.prevent="submitCredential">
				<label class="field">
					<span class="field-label">Name</span>
					<input
						:value="setup.credentialName"
						type="text"
						autocomplete="off"
						@input="setup.credentialName = getInputValue($event)"
					/>
				</label>

				<template v-for="field in setup.fields" :key="field.name">
					<div v-if="field.type === 'notice'" class="notice-field">
						{{ field.description || field.displayName }}
					</div>

					<label v-else-if="field.type === 'boolean'" class="toggle-field">
						<input
							type="checkbox"
							:checked="getBooleanValue(field.name)"
							autocomplete="off"
							@change="setFieldValue(field.name, getCheckedValue($event))"
						/>
						<span>{{ field.displayName }}</span>
					</label>

					<label v-else-if="field.type === 'options'" class="field">
						<span class="field-label">{{ field.displayName }}</span>
						<select
							:value="getFieldValue(field.name)"
							:required="field.required"
							autocomplete="off"
							@change="setFieldValue(field.name, getInputValue($event))"
						>
							<option value=""></option>
							<option
								v-for="option in field.options ?? []"
								:key="optionValue(option.value)"
								:value="optionValue(option.value)"
							>
								{{ option.name }}
							</option>
						</select>
					</label>

					<label v-else-if="field.type === 'multiOptions'" class="field">
						<span class="field-label">{{ field.displayName }}</span>
						<select
							multiple
							:value="getMultiOptionValue(field.name)"
							:required="field.required"
							autocomplete="off"
							@change="setFieldValue(field.name, getSelectedValues($event))"
						>
							<option
								v-for="option in field.options ?? []"
								:key="optionValue(option.value)"
								:value="optionValue(option.value)"
							>
								{{ option.name }}
							</option>
						</select>
					</label>

					<label v-else-if="field.type === 'json'" class="field">
						<span class="field-label">{{ field.displayName }}</span>
						<textarea
							:value="getFieldValue(field.name)"
							:required="field.required"
							spellcheck="false"
							autocomplete="off"
							@input="setFieldValue(field.name, getInputValue($event))"
						></textarea>
					</label>

					<label v-else class="field">
						<span class="field-label">{{ field.displayName }}</span>
						<input
							:value="getFieldValue(field.name)"
							:type="field.password ? 'password' : field.type === 'number' ? 'number' : 'text'"
							:required="field.required"
							:autocomplete="fieldAutocomplete(field)"
							@input="setFieldValue(field.name, getInputValue($event))"
						/>
					</label>
				</template>

				<p v-if="statusText" class="status-line">{{ statusText }}</p>

				<div class="actions">
					<button
						type="submit"
						class="primary-button"
						:disabled="stage === 'creating' || stage === 'authorizing' || stage === 'polling'"
					>
						{{ setup.isOAuth ? 'Create and authorize' : 'Create credential' }}
					</button>
					<button type="button" class="secondary-button" @click="cancelSetup">Cancel</button>
					<button
						v-if="result?.credentialId"
						type="button"
						class="secondary-button"
						@click="testCredential"
					>
						Test
					</button>
					<a
						v-if="result?.fallbackUrl"
						:href="result.fallbackUrl"
						class="link-button"
						target="_blank"
						rel="noopener noreferrer"
						@click="openFallback"
					>
						Open in n8n
					</a>
				</div>
			</form>
		</section>

		<section v-else-if="stage === 'error'" class="error-state" aria-live="polite">
			<p>{{ statusText || 'Credential setup failed' }}</p>
		</section>

		<section v-else class="loading-state" aria-live="polite" aria-busy="true">
			<div class="loading-logo" aria-hidden="true">
				<svg
					class="loading-logo-icon"
					width="32"
					height="26"
					viewBox="0 0 32 26"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path
						class="loading-logo-mark"
						fill-rule="evenodd"
						clip-rule="evenodd"
						d="M27.2 11.3955C26.4903 11.3959 25.8006 11.1603 25.2394 10.7259C24.6783 10.2914 24.2774 9.68271 24.1 8.99555H20.433C20.0543 8.9956 19.6879 9.12999 19.3989 9.3748C19.11 9.61962 18.9173 9.95899 18.855 10.3325L18.723 11.1225C18.6018 11.8478 18.2346 12.5092 17.683 12.9955C18.2348 13.4821 18.6021 14.1439 18.723 14.8695L18.855 15.6585C18.9173 16.0321 19.11 16.3715 19.3989 16.6163C19.6879 16.8611 20.0543 16.9955 20.433 16.9955H20.901C21.0968 16.2424 21.5603 15.5864 22.2047 15.1502C22.8491 14.714 23.6303 14.5275 24.4023 14.6255C25.1743 14.7236 25.8841 15.0995 26.399 15.6829C26.9139 16.2663 27.1987 17.0174 27.2 17.7955C27.2015 18.5755 26.9182 19.3292 26.4031 19.9149C25.8881 20.5006 25.1769 20.8781 24.4031 20.9764C23.6294 21.0746 22.8464 20.8869 22.2013 20.4485C21.5562 20.0101 21.0935 19.3511 20.9 18.5955H20.433C19.6756 18.5954 18.9428 18.3267 18.3649 17.837C17.787 17.3474 17.4015 16.6687 17.277 15.9215L17.145 15.1325C17.0828 14.759 16.89 14.4196 16.6011 14.1748C16.3121 13.93 15.9457 13.7956 15.567 13.7955H14.299C14.1214 14.4823 13.7206 15.0907 13.1596 15.525C12.5987 15.9593 11.9094 16.1949 11.2 16.1949C10.4906 16.1949 9.80129 15.9593 9.24036 15.525C8.67943 15.0907 8.27866 14.4823 8.10101 13.7955H6.29901C6.1032 14.5487 5.63975 15.2047 4.99533 15.6409C4.35091 16.0771 3.56967 16.2636 2.7977 16.1656C2.02573 16.0675 1.31592 15.6916 0.800999 15.1082C0.286083 14.5247 0.00133389 13.7737 6.20563e-06 12.9955C-0.00152906 12.2156 0.281849 11.4619 0.796882 10.8762C1.31191 10.2905 2.02314 9.91299 2.79689 9.81474C3.57064 9.71649 4.35363 9.90421 4.99871 10.3426C5.6438 10.781 6.10655 11.44 6.30001 12.1955H8.10001C8.27697 11.5079 8.67758 10.8985 9.23878 10.4635C9.79998 10.0284 10.4899 9.79229 11.2 9.79229C11.9101 9.79229 12.6 10.0284 13.1612 10.4635C13.7224 10.8985 14.123 11.5079 14.3 12.1955H15.567C15.9457 12.1955 16.3121 12.0611 16.6011 11.8163C16.89 11.5715 17.0828 11.2321 17.145 10.8585L17.277 10.0685C17.4017 9.32161 17.7873 8.64311 18.3652 8.15368C18.943 7.66425 19.6757 7.39562 20.433 7.39555H24.101C24.2968 6.64242 24.7603 5.9864 25.4047 5.5502C26.0491 5.114 26.8303 4.92747 27.6023 5.02552C28.3743 5.12356 29.0841 5.49945 29.599 6.0829C30.1139 6.66634 30.3987 7.41738 30.4 8.19555C30.4 9.04424 30.0629 9.85817 29.4627 10.4583C28.8626 11.0584 28.0487 11.3955 27.2 11.3955ZM27.2 9.79555C27.6244 9.79555 28.0313 9.62698 28.3314 9.32692C28.6314 9.02686 28.8 8.61989 28.8 8.19555C28.8 7.7712 28.6314 7.36423 28.3314 7.06418C28.0313 6.76412 27.6244 6.59555 27.2 6.59555C26.7757 6.59555 26.3687 6.76412 26.0686 7.06418C25.7686 7.36423 25.6 7.7712 25.6 8.19555C25.6 8.61989 25.7686 9.02686 26.0686 9.32692C26.3687 9.62698 26.7757 9.79555 27.2 9.79555ZM3.20001 14.5955C3.62435 14.5955 4.03132 14.427 4.33138 14.1269C4.63144 13.8269 4.80001 13.4199 4.80001 12.9955C4.80001 12.5712 4.63144 12.1642 4.33138 11.8642C4.03132 11.5641 3.62435 11.3955 3.20001 11.3955C2.77566 11.3955 2.36869 11.5641 2.06864 11.8642C1.76858 12.1642 1.60001 12.5712 1.60001 12.9955C1.60001 13.4199 1.76858 13.8269 2.06864 14.1269C2.36869 14.427 2.77566 14.5955 3.20001 14.5955ZM12.8 12.9955C12.8 13.2057 12.7586 13.4137 12.6782 13.6078C12.5978 13.802 12.48 13.9783 12.3314 14.1269C12.1828 14.2755 12.0064 14.3933 11.8123 14.4738C11.6182 14.5542 11.4101 14.5955 11.2 14.5955C10.9899 14.5955 10.7818 14.5542 10.5877 14.4738C10.3936 14.3933 10.2172 14.2755 10.0686 14.1269C9.92006 13.9783 9.80221 13.802 9.7218 13.6078C9.64139 13.4137 9.60001 13.2057 9.60001 12.9955C9.60001 12.5712 9.76858 12.1642 10.0686 11.8642C10.3687 11.5641 10.7757 11.3955 11.2 11.3955C11.6244 11.3955 12.0313 11.5641 12.3314 11.8642C12.6314 12.1642 12.8 12.5712 12.8 12.9955ZM25.6 17.7955C25.6 18.0057 25.5586 18.2137 25.4782 18.4078C25.3978 18.602 25.28 18.7783 25.1314 18.9269C24.9828 19.0755 24.8064 19.1933 24.6123 19.2738C24.4182 19.3542 24.2101 19.3955 24 19.3955C23.7899 19.3955 23.5818 19.3542 23.3877 19.2738C23.1936 19.1933 23.0172 19.0755 22.8686 18.9269C22.7201 18.7783 22.6022 18.602 22.5218 18.4078C22.4414 18.2137 22.4 18.0057 22.4 17.7955C22.4 17.3712 22.5686 16.9642 22.8686 16.6642C23.1687 16.3641 23.5757 16.1955 24 16.1955C24.4244 16.1955 24.8313 16.3641 25.1314 16.6642C25.4314 16.9642 25.6 17.3712 25.6 17.7955Z"
						fill="currentColor"
					/>
				</svg>
			</div>
			<p class="loading-copy">
				Loading credential setup<span aria-hidden="true" class="loading-dots">
					<span></span>
					<span></span>
					<span></span>
				</span>
			</p>
		</section>
	</main>
</template>
