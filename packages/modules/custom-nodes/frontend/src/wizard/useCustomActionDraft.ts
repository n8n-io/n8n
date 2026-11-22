import type { CustomActionEditKind, CustomActionResponse } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import type { INodeProperties } from 'n8n-workflow';
import { computed, ref } from 'vue';

import { useCustomNodesStore } from '../custom-nodes.store';
import {
	buildDraft,
	createInput,
	draftToSource,
	emptyRequest,
	syncUrlInputs,
	type DraftSource,
} from './draftMapping';
import { mapHttpRequestParameters } from './httpRequestMapping';
import { ISSUE_MESSAGES, stepOfIssue } from './wizardIssues';
import type {
	EditableInput,
	EditableRequest,
	LocalIssue,
	NewNodeFields,
	WizardIssue,
	WizardStep,
	WizardTarget,
} from './wizard.types';

const ABSOLUTE_URL_PATTERN = /^https?:\/\//i;

function isHttpUrl(text: string): boolean {
	try {
		const url = new URL(text);
		return url.protocol === 'http:' || url.protocol === 'https:';
	} catch {
		return false;
	}
}

/** Holds the custom action that the wizard edits, its target, and the issues of the draft. */
export function useCustomActionDraft() {
	const store = useCustomNodesStore();
	const i18n = useI18n();

	const target = ref<WizardTarget | null>({ kind: 'newNode' });
	const node = ref<NewNodeFields>({
		displayName: '',
		description: '',
		baseUrl: '',
		auth: { kind: 'none' },
	});
	const name = ref('');
	const description = ref('');
	const request = ref<EditableRequest>(emptyRequest());
	const inputs = ref<EditableInput[]>([]);
	const changeNote = ref('');
	/** The action that the wizard edits. Unset when the wizard creates an action. */
	const editingAction = ref<CustomActionResponse | null>(null);
	/** Headers and query parameters that the wizard did not copy from an HTTP Request node. */
	const droppedSecrets = ref<string[]>([]);

	const previewIssues = ref<WizardIssue[]>([]);
	const previewProperties = ref<INodeProperties[]>([]);
	const previewDone = ref(false);
	const previewLoading = ref(false);
	const previewFailed = ref(false);

	const targetNode = computed(() => {
		const current = target.value;
		return current?.kind === 'node'
			? store.nodes.find((candidate) => candidate.id === current.customNodeId)
			: undefined;
	});

	/** The base URL that a path of the request starts from. A parent node has none. */
	const baseUrl = computed(() => {
		if (target.value?.kind === 'newNode') return node.value.baseUrl.trim();
		return targetNode.value?.baseUrl;
	});

	const auth = computed(() =>
		target.value?.kind === 'newNode' ? node.value.auth : targetNode.value?.auth,
	);

	/** A parent node and a predefined credential can block a host. See decision 7 of the plan. */
	const usesCredentialDomains = computed(
		() => target.value?.kind === 'parent' || auth.value?.kind === 'predefined',
	);

	const built = computed(() =>
		buildDraft({
			name: name.value,
			description: description.value,
			request: request.value,
			inputs: inputs.value,
		}),
	);

	const draft = computed(() => built.value.draft);

	const localIssues = computed((): LocalIssue[] => {
		const issues = [...built.value.issues];
		const current = target.value;
		if (!current) issues.push({ path: 'target', code: 'target_required' });
		if (current?.kind === 'newNode') {
			if (node.value.displayName.trim() === '') {
				issues.push({ path: 'node.displayName', code: 'required' });
			}
			if (!isHttpUrl(node.value.baseUrl.trim())) {
				issues.push({ path: 'node.baseUrl', code: 'invalid_base_url' });
			}
			if (node.value.auth.kind === 'predefined' && node.value.auth.credentialType.trim() === '') {
				issues.push({ path: 'node.auth', code: 'required' });
			}
		}
		const url = request.value.url.trim();
		if (current?.kind === 'parent' && url !== '' && !ABSOLUTE_URL_PATTERN.test(url)) {
			issues.push({ path: 'request.url', code: 'absolute_url_required' });
		}
		return issues;
	});

	/** The local issues and, after a preview, the issues of the server. */
	const issues = computed((): WizardIssue[] => [
		...localIssues.value.map(({ path, code }) => ({
			path,
			code,
			message: i18n.baseText(ISSUE_MESSAGES[code]),
		})),
		...previewIssues.value,
	]);

	const issuesAt = (path: string) => issues.value.filter((issue) => issue.path === path);
	const issuesOfStep = (step: WizardStep) =>
		issues.value.filter((issue) => stepOfIssue(issue.path) === step);

	/** The host that the request goes to, or `undefined` when the URL is not complete. */
	const requestHost = computed(() => {
		const url = request.value.url.trim();
		let host: string | undefined;
		try {
			if (ABSOLUTE_URL_PATTERN.test(url)) host = new URL(url).host;
			else if (baseUrl.value && url.startsWith('/')) {
				host = new URL(`${baseUrl.value.replace(/\/+$/, '')}${url}`).host;
			}
		} catch {
			return undefined;
		}
		// A placeholder in the host is not allowed, so such a host is not the real one.
		return host && !/[{}]/.test(host) ? host : undefined;
	});

	function resetPreview() {
		previewIssues.value = [];
		previewProperties.value = [];
		previewDone.value = false;
		previewFailed.value = false;
	}

	function apply(source: DraftSource) {
		name.value = source.name;
		description.value = source.description;
		request.value = source.request;
		inputs.value = source.inputs;
		resetPreview();
	}

	/** Changes the request. A new URL placeholder adds a URL input, a removed one removes it. */
	function updateRequest(next: EditableRequest) {
		if (next.url !== request.value.url) inputs.value = syncUrlInputs(next.url, inputs.value);
		request.value = next;
		resetPreview();
	}

	function updateInputs(next: EditableInput[]) {
		inputs.value = next;
		resetPreview();
	}

	function addInput(inputTarget: EditableInput['target'] = 'body') {
		updateInputs([...inputs.value, createInput({ target: inputTarget })]);
	}

	function removeInput(id: string) {
		updateInputs(inputs.value.filter((input) => input.id !== id));
	}

	/** Fills the request from an HTTP Request node. Returns the names that it did not copy. */
	function fromHttpRequestParameters(params: Record<string, unknown>): string[] {
		const mapped = mapHttpRequestParameters(params);
		request.value = mapped.request;
		inputs.value = mapped.inputs;
		node.value = { ...node.value, auth: mapped.auth };
		droppedSecrets.value = mapped.dropped;
		resetPreview();
		return mapped.dropped;
	}

	/** Loads a stored action for an edit. Returns `false` when the action does not exist. */
	function loadAction(actionId: string): boolean {
		const parentAction = store.parentActions.find((action) => action.id === actionId);
		const nodeAction = store.nodes
			.flatMap((candidate) => candidate.actions)
			.find((action) => action.id === actionId);
		const action = parentAction ?? nodeAction;
		if (!action) return false;
		editingAction.value = action;
		if (action.parentNodeType) {
			target.value = { kind: 'parent', parentNodeType: action.parentNodeType };
		} else if (action.customNodeId) {
			target.value = { kind: 'node', customNodeId: action.customNodeId };
		}
		apply(draftToSource(action.draft));
		return true;
	}

	/** Asks the server for the issues and the generated fields. Skips it while local issues exist. */
	async function runPreview() {
		resetPreview();
		if (localIssues.value.length > 0) return;
		previewLoading.value = true;
		try {
			const result = await store.preview(draft.value);
			previewIssues.value = result.issues;
			previewProperties.value = result.properties;
			previewDone.value = true;
		} catch {
			previewFailed.value = true;
		} finally {
			previewLoading.value = false;
		}
	}

	const canSave = computed(
		() => previewDone.value && !previewLoading.value && issues.value.length === 0,
	);

	/** Saves the draft for its target. Returns the kind of the edit for an existing action. */
	async function save(): Promise<{ kind?: CustomActionEditKind }> {
		const current = target.value;
		const note = changeNote.value.trim() || undefined;
		if (editingAction.value) {
			const result = await store.saveAction(editingAction.value.id, {
				draft: draft.value,
				changeNote: note,
			});
			return { kind: result.kind };
		}
		if (current?.kind === 'newNode') {
			await store.createNode({
				displayName: node.value.displayName.trim(),
				description: node.value.description.trim() || undefined,
				baseUrl: node.value.baseUrl.trim(),
				auth: node.value.auth,
				actions: [draft.value],
			});
		} else if (current?.kind === 'node') {
			await store.addActionToNode(current.customNodeId, { draft: draft.value, changeNote: note });
		} else if (current?.kind === 'parent') {
			await store.addParentAction({
				parentNodeType: current.parentNodeType,
				draft: draft.value,
				changeNote: note,
			});
		}
		return {};
	}

	return {
		target,
		node,
		name,
		description,
		request,
		inputs,
		changeNote,
		editingAction,
		droppedSecrets,
		previewProperties,
		previewLoading,
		previewFailed,
		baseUrl,
		usesCredentialDomains,
		draft,
		issues,
		issuesAt,
		issuesOfStep,
		requestHost,
		canSave,
		updateRequest,
		updateInputs,
		addInput,
		removeInput,
		fromHttpRequestParameters,
		loadAction,
		runPreview,
		save,
	};
}

export type CustomActionDraftState = ReturnType<typeof useCustomActionDraft>;
