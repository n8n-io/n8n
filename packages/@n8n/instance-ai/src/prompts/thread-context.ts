import type {
	InstanceAiNodesAttachment,
	InstanceAiResourceAttachment,
	InstanceAiThreadArtifact,
	InstanceAiThreadArtifactsContext,
} from '@n8n/api-types';

/**
 * The per-turn `<thread-context>` block and its `<thread-artifacts>` section.
 *
 * Exposed as its own `@n8n/instance-ai/thread-context` entry point: the
 * functions are pure, so the backend and the evals render the same block, and
 * suites that mock the agent-tainted barrel still run the real code.
 */

export const THREAD_CONTEXT_OPEN_TAG = '<thread-context>';
export const THREAD_CONTEXT_CLOSE_TAG = '</thread-context>';
export const THREAD_ARTIFACTS_OPEN_TAG = '<thread-artifacts>';
export const THREAD_ARTIFACTS_CLOSE_TAG = '</thread-artifacts>';

/**
 * How one section reads once `buildThreadContextBlock` stores it. A freshly rendered
 * section must pass through this before it is compared against a copy extracted from a
 * persisted message, or a section containing the close tag never compares equal.
 */
export function asStoredThreadContextSection(section: string): string {
	return section.trim().replaceAll(THREAD_CONTEXT_CLOSE_TAG, '&lt;/thread-context&gt;');
}

/**
 * Wrap per-turn ambient context into one leading block. The user text stays last.
 * On the turn rather than in the system prompt for prompt-caching reasons.
 */
export function buildThreadContextBlock(sections: Array<string | undefined>): string {
	const parts = sections
		.map((section) => section?.trim())
		.filter((section): section is string => Boolean(section))
		.map(asStoredThreadContextSection);
	if (parts.length === 0) return '';
	return `${THREAD_CONTEXT_OPEN_TAG}\n${parts.join('\n\n')}\n${THREAD_CONTEXT_CLOSE_TAG}`;
}

/** Longest a user-supplied value may be inside a block. Matches the instance-context bound. */
const PROMPT_TEXT_MAX_LENGTH = 128;

/**
 * Neutralise user-supplied text (names, ids, titles) before it enters a block.
 * A block is prose the model reads as trusted, and the hand-off parser scans
 * the same prefix, so a value must not be able to close a block, open another,
 * or start a new line. Angle brackets are escaped rather than dropped, so a
 * name that legitimately contains one still reads as itself.
 */
export function sanitisePromptText(value: string, maxLength = PROMPT_TEXT_MAX_LENGTH): string {
	const printable = Array.from(value)
		.map((character) => {
			const code = character.codePointAt(0) ?? 0;
			return code < 0x20 || code === 0x7f ? ' ' : character;
		})
		.join('');

	return printable
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, maxLength);
}

const PREVIEW_TABS_HEADER =
	'Tabs the user has open in this conversation’s preview, as of this message:';

const THREAD_ARTIFACT_KIND: Record<InstanceAiThreadArtifact['type'], string> = {
	workflow: 'Workflow',
	agent: 'Agent',
	'data-table': 'Data table',
};

function formatThreadArtifactLine(
	artifact: InstanceAiThreadArtifact,
	current: boolean,
	executionId?: string,
): string {
	const pendingAgent = artifact.type === 'agent' && artifact.pending;
	const kind = pendingAgent ? 'New unsaved Agent' : THREAD_ARTIFACT_KIND[artifact.type];
	const name = artifact.name ? ` "${sanitisePromptText(artifact.name)}"` : '';
	const idLabel = pendingAgent ? 'pending id' : 'id';
	const project = artifact.projectId
		? `, in project \`${sanitisePromptText(artifact.projectId)}\``
		: '';
	const flags = [current ? 'current' : '', artifact.archived ? 'archived' : '']
		.filter(Boolean)
		.join(', ');
	const flagSuffix = flags ? ` [${flags}]` : '';
	const execution =
		artifact.type === 'workflow' && executionId
			? `, currently viewing its execution \`${sanitisePromptText(executionId)}\``
			: '';
	return `  - ${kind}${name} (${idLabel}: \`${sanitisePromptText(artifact.id)}\`${project})${flagSuffix}${execution}`;
}

/** Renders one canvas node-selection attachment as one line per set. */
function buildNodesAttachmentLine(attachment: InstanceAiNodesAttachment): string {
	const label = (ref: { id: string; name?: string }) => sanitisePromptText(ref.name ?? ref.id);

	const setLines = attachment.sets.map((set) => {
		const names = set.nodes.map(label);

		const head =
			names.length === 1
				? `Node "${names[0]}"`
				: `A chain of connected nodes: ${names.join(' → ')}`;

		const input = set.inputNode ? `, receiving input from "${label(set.inputNode)}"` : '';

		const output = set.outputNode ? `, sending output to "${label(set.outputNode)}"` : '';

		const group = set.canvasGroupName
			? `, part of canvas group "${sanitisePromptText(set.canvasGroupName)}"`
			: set.canvasGroupId
				? `, part of canvas group \`${sanitisePromptText(set.canvasGroupId)}\``
				: '';

		return `    - ${head}${input}${output}${group}.`;
	});

	const hasBoundary = attachment.sets.some((set) => set.inputNode ?? set.outputNode);
	const boundaryNote = hasBoundary
		? '\n  The "receiving input from"/"sending output to" nodes show only where the selection connects; they are not part of the selection. Do not describe, inspect, or make claims about them — scope your answer to the selected nodes.'
		: '';

	return `  - Selected nodes in workflow \`${sanitisePromptText(attachment.workflowId)}\`:\n${setLines.join('\n')}${boundaryNote}`;
}

/**
 * JSON that cannot hold a literal tag: `<` and `>` become `\u003c` / `\u003e`,
 * which `JSON.parse` maps back to the original characters. Keeps a name like
 * `</thread-artifacts>` from closing the block and from being rewritten by the
 * `<thread-context>` wrapper's escaping, so reload restores the exact name.
 */
function toTagSafeJson(value: unknown): string {
	return JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
}

function attachmentToThreadArtifact(
	attachment: Exclude<InstanceAiResourceAttachment, InstanceAiNodesAttachment>,
): InstanceAiThreadArtifact {
	return {
		type: attachment.type,
		id: attachment.id,
		...(attachment.name ? { name: attachment.name } : {}),
		...(attachment.type === 'agent' ? { projectId: attachment.projectId } : {}),
		...(attachment.type === 'agent' && attachment.pending ? { pending: true as const } : {}),
	};
}

/**
 * Preview-tab index plus any editor hand-off resources for this turn. Ids and
 * names for the ambient list; when resource attachments are present, a leading
 * JSON line keeps them durable for reload (replacing the old `<editor-context>`
 * block). Lives inside `<thread-context>` for prompt-caching reasons.
 */
export function buildThreadArtifactsBlock(
	context: InstanceAiThreadArtifactsContext | undefined,
	resourceAttachments: InstanceAiResourceAttachment[] = [],
): string {
	// A fixed order, so reordering tabs does not change the block and re-send it.
	const previewArtifacts = [...(context?.artifacts ?? [])].sort((a, b) =>
		`${a.type}:${a.id}`.localeCompare(`${b.type}:${b.id}`),
	);
	if (previewArtifacts.length === 0 && resourceAttachments.length === 0) {
		// An empty list that the client sent means no tabs are open. The wording holds
		// whether the user closed tabs or never had any.
		return context
			? `${THREAD_ARTIFACTS_OPEN_TAG}\nThe user has no tabs open in this conversation’s preview.\n${THREAD_ARTIFACTS_CLOSE_TAG}`
			: '';
	}

	const executionByWorkflowId = new Map<string, string>();
	for (const attachment of resourceAttachments) {
		if (attachment.type === 'workflow' && attachment.executionId) {
			executionByWorkflowId.set(attachment.id, attachment.executionId);
		}
	}

	const activeId =
		context?.activeId && previewArtifacts.some((artifact) => artifact.id === context.activeId)
			? context.activeId
			: undefined;

	// Section 1: the preview tabs. A handed-off execution enriches its tab's line.
	const previewLines = previewArtifacts.map((artifact) =>
		formatThreadArtifactLine(
			artifact,
			artifact.id === activeId,
			executionByWorkflowId.get(artifact.id),
		),
	);

	// Section 2: what the editor handed off that is not already a tab — a node
	// selection is never a tab, so it always lands here.
	const listedKeys = new Set(previewArtifacts.map((artifact) => `${artifact.type}:${artifact.id}`));
	const handoffLines: string[] = [];
	for (const attachment of resourceAttachments) {
		if (attachment.type === 'nodes') {
			handoffLines.push(buildNodesAttachmentLine(attachment));
			continue;
		}
		if (listedKeys.has(`${attachment.type}:${attachment.id}`)) continue;
		handoffLines.push(
			formatThreadArtifactLine(
				attachmentToThreadArtifact(attachment),
				false,
				attachment.type === 'workflow' ? attachment.executionId : undefined,
			),
		);
	}

	const pendingAgentGuidance = resourceAttachments.some(
		(attachment) => attachment.type === 'agent' && attachment.pending,
	)
		? "Treat references such as “the agent” as this pending artifact. It has no persisted agent row yet. When the user asks to build or change it, use `build-agent`'s new-agent path with a name; do not pass its pending id as an existing `agentId`. The thread's pending target will make creation reuse that id."
		: '';

	const currentGuidance = activeId
		? 'Treat “this workflow”, “the agent”, “the data table”, or “it” as the item marked current.'
		: 'When the user refers to an artifact in this conversation, match it against this list.';

	// The hand-off rides the user's own request, so the agent acts on that request;
	// it must not treat the list itself as a prompt to go and look at everything.
	const inspectGuidance =
		'Use these ids when you act on the user’s request. Do not inspect, run, or describe their contents beyond what that request needs.';

	const prose = [
		...(previewLines.length > 0 ? [PREVIEW_TABS_HEADER, ...previewLines] : []),
		...(handoffLines.length > 0
			? [
					'The user opened this conversation from the editor, where they are looking at:',
					...handoffLines,
				]
			: []),
		currentGuidance,
		pendingAgentGuidance,
		inspectGuidance,
	]
		.filter(Boolean)
		.join('\n');

	// Leading JSON line: the parser rebuilds `message.attachments` from it on reload.
	const durableJson =
		resourceAttachments.length > 0 ? `${toTagSafeJson(resourceAttachments)}\n\n` : '';

	return `${THREAD_ARTIFACTS_OPEN_TAG}\n${durableJson}${prose}\n${THREAD_ARTIFACTS_CLOSE_TAG}`;
}
