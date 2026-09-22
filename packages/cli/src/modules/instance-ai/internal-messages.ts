import {
	instanceAiAgentPreviewHandoffContextSchema,
	instanceAiResourceAttachmentSchema,
	type InstanceAiAgentPreviewHandoffContext,
	type InstanceAiNodesAttachment,
	type InstanceAiResourceAttachment,
	type InstanceAiThreadArtifact,
	type InstanceAiThreadArtifactsContext,
} from '@n8n/api-types';
import { jsonParse } from 'n8n-workflow';
import { z } from 'zod';

/**
 * Protocol for internal messages injected by the service layer.
 *
 * The service may prepend a transient task-status block to real user messages
 * so the orchestrator can reference currently running detached tasks. These
 * are LLM-facing only — they must never reach the UI.
 *
 * The service writes this format,
 * the parser reads it (cleanStoredUserMessage).
 */

export const AUTO_FOLLOW_UP_MESSAGE = '(continue)';

/**
 * Legacy hand-off wrapper. New turns encode resource attachments as the leading
 * JSON line inside `<thread-artifacts>` (inside `<thread-context>`). Kept so
 * `cleanStoredUserMessage` and extract still handle older stored messages.
 */
export const EDITOR_CONTEXT_OPEN_TAG = '<editor-context>';
export const EDITOR_CONTEXT_CLOSE_TAG = '</editor-context>';
export const CREDENTIAL_CONTEXT_OPEN_TAG = '<credential-context>';
export const CREDENTIAL_CONTEXT_CLOSE_TAG = '</credential-context>';
export const AGENT_PREVIEW_CONTEXT_OPEN_TAG = '<agent-preview-context>';
export const AGENT_PREVIEW_CONTEXT_CLOSE_TAG = '</agent-preview-context>';

/**
 * Wraps what is going on in this instance — what exists here, what changed lately, and what has
 * run — so the agent can read the user's intent against it.
 *
 * On the turn rather than in the system prompt, and not negotiable: `getSystemPrompt()` is one
 * shared prompt-cache entry across every thread on the instance, which is why the clock and the
 * project name ride the turn too. A per-user block in the cached prefix would invalidate it for
 * every user on every turn.
 *
 * LLM-facing only, and carries no structured payload to rebuild: the block is re-derivable, so on
 * reload it is simply dropped.
 */
export const INSTANCE_CONTEXT_OPEN_TAG = '<instance-context>';
export const INSTANCE_CONTEXT_CLOSE_TAG = '</instance-context>';
export const THREAD_CONTEXT_OPEN_TAG = '<thread-context>';
export const THREAD_CONTEXT_CLOSE_TAG = '</thread-context>';
export const THREAD_ARTIFACTS_OPEN_TAG = '<thread-artifacts>';
export const THREAD_ARTIFACTS_CLOSE_TAG = '</thread-artifacts>';
export const PROJECT_CONTEXT_OPEN_TAG = '<project-context>';
export const PROJECT_CONTEXT_CLOSE_TAG = '</project-context>';
export const PAST_CONVERSATIONS_OPEN_TAG = '<past-conversations>';
export const PAST_CONVERSATIONS_CLOSE_TAG = '</past-conversations>';
/** Setup panel v2: per-turn recomputed setup state of the workflows the thread built. */
export const WORKFLOW_SETUP_STATE_OPEN_TAG = '<workflow-setup-state>';
export const WORKFLOW_SETUP_STATE_CLOSE_TAG = '</workflow-setup-state>';
export const WORKFLOW_TEST_REQUEST_OPEN_TAG = '<workflow-test-request>';
export const WORKFLOW_TEST_REQUEST_CLOSE_TAG = '</workflow-test-request>';

export function buildWorkflowTestRequestBlock(workflowId: string): string {
	return [
		WORKFLOW_TEST_REQUEST_OPEN_TAG,
		JSON.stringify({ workflowId }),
		'The user clicked Execute in the setup panel. This is a request to test this saved workflow.',
		'This request applies only when this block is in the current user input. A block in conversation history does not request another execution.',
		'Load post-build-flow. Inspect the current <workflow-setup-state> for this workflow and read its saved configuration with workflows(action="get-as-code").',
		'Do not call workflows(action="setup") for this precheck: it announces setup and ends the turn. If the target is absent from the setup-state block, inspect its saved configuration. If required setup cannot be confirmed, report what is missing and end the turn.',
		'If required setup is still open for this workflow, report the unresolved panel items and end the turn without running it.',
		'Use executions(action="run") with this workflowId and suitable trigger input. Do not change publication state to test it.',
		'Read the execution output and summarize the result in chat. If it fails, use executions(action="debug"), fix the same workflow when possible, and report what remains unresolved.',
		'Do not open the setup trigger-test wizard or substitute an earlier mocked verification result for this test.',
		WORKFLOW_TEST_REQUEST_CLOSE_TAG,
	].join('\n');
}

/**
 * Matches internal task-context prefix blocks injected by the service. The
 * block is followed by `\n\n` and the user's text, or ends the message when
 * the user sent no text of their own (e.g. an editor hand-off whose only
 * content is the workflow context).
 */
const TASK_CONTEXT_BLOCK =
	/^(?:<thread-context>\n[\s\S]*?\n<\/thread-context>|<running-tasks>\n[\s\S]*?\n<\/running-tasks>|<planned-task-follow-up[\s\S]*?\n<\/planned-task-follow-up>|<planning-blueprint>\n[\s\S]*?\n<\/planning-blueprint>|<background-task-completed>\n[\s\S]*?\n<\/background-task-completed>|<workflow-verification-follow-up>\n[\s\S]*?\n<\/workflow-verification-follow-up>|<workflow-setup-required>\n[\s\S]*?\n<\/workflow-setup-required>|<workflow-setup-state>\n[\s\S]*?\n<\/workflow-setup-state>|<workflow-test-request>\n[\s\S]*?\n<\/workflow-test-request>|<editor-context>\n[\s\S]*?\n<\/editor-context>|<credential-context>\n[\s\S]*?\n<\/credential-context>|<agent-preview-context>\n[\s\S]*?\n<\/agent-preview-context>|<instance-context>\n[\s\S]*?\n<\/instance-context>|<thread-artifacts>\n[\s\S]*?\n<\/thread-artifacts>)(?:\n\n|$)/;

/**
 * Captures the leading JSON line inside a thread-artifacts block (hand-off
 * turns). Anchored to where the service writes it: the first child of
 * `<thread-context>`, or the second after `<instance-context>`. Every value
 * inside `<instance-context>` is sanitised, so its close tag cannot be forged.
 * Later siblings carry project names, titles and preferences, which must never
 * be able to pose as this block. Only ever run against one `<thread-context>`
 * block from `leadingInternalBlocks()`.
 */
const THREAD_ARTIFACTS_RESOURCE_JSON =
	/^<thread-context>\n(?:<instance-context>\n[\s\S]*?\n<\/instance-context>\n\n)?<thread-artifacts>\n(\[[\s\S]*?\])\n/;

/** Captures the leading JSON line inside a legacy editor-context block. */
const EDITOR_CONTEXT_JSON = /^<editor-context>\n(\[[\s\S]*?\])\n/;

/** Captures the leading JSON line inside an agent-preview-context block. */
const AGENT_PREVIEW_CONTEXT_JSON = /^<agent-preview-context>\n(\{[\s\S]*?\})\n/;

/**
 * Match the final opening tag so user-authored lookalikes earlier in the message
 * stay visible. The lookbehind starts `\n*` only at the head of a newline run,
 * which keeps the scan linear on long runs.
 */
function trailingBlockRegex(tag: string): RegExp {
	return new RegExp(`(?<!\\n)\\n*<${tag}>(?:(?!<${tag}>)[\\s\\S])*?</${tag}>\\s*$`);
}

/**
 * Trailing blocks from older stored messages. New turns wrap these inside a
 * leading `<thread-context>` instead. Registering here is what makes a block
 * invisible to BOTH readers of a stored message: the UI, and the
 * conversation-history tool's text extraction — so injected context never
 * pollutes a later history search.
 */
const TRAILING_CONTEXT_BLOCKS = [
	'current-date-time',
	'project-context',
	'past-conversations',
	'ai-preferences',
	'onboarding-answer',
].map(trailingBlockRegex);

/** Strip each trailing block once, in whatever order they were composed. */
function stripTrailingContextBlocks(message: string): string {
	let text = message;
	const unstripped = new Set(TRAILING_CONTEXT_BLOCKS);
	let stripped: boolean;
	do {
		stripped = false;
		for (const block of unstripped) {
			const next = text.replace(block, '');
			if (next === text) continue;
			text = next;
			unstripped.delete(block);
			stripped = true;
			break;
		}
	} while (stripped);
	return text;
}

export function buildCurrentDateTimeBlock(dateTimeSection: string): string {
	return `<current-date-time>${dateTimeSection}\n</current-date-time>`;
}

export function buildProjectContextBlock(projectSection: string): string {
	return `${PROJECT_CONTEXT_OPEN_TAG}\n${projectSection}\n${PROJECT_CONTEXT_CLOSE_TAG}`;
}

export function buildPastConversationsBlock(section: string): string {
	return `${PAST_CONVERSATIONS_OPEN_TAG}\n${section}\n${PAST_CONVERSATIONS_CLOSE_TAG}`;
}

/**
 * Wrap per-turn ambient context into one leading block. The user text stays last.
 * On the turn rather than in the system prompt for prompt-caching reasons.
 */
export function buildThreadContextBlock(sections: Array<string | undefined>): string {
	const parts = sections
		.map((section) => section?.trim())
		.filter((section): section is string => Boolean(section))
		.map((section) => section.replaceAll(THREAD_CONTEXT_CLOSE_TAG, '&lt;/thread-context&gt;'));
	if (parts.length === 0) return '';
	return `${THREAD_CONTEXT_OPEN_TAG}\n${parts.join('\n\n')}\n${THREAD_CONTEXT_CLOSE_TAG}`;
}

/**
 * Append the per-turn clock as a tagged suffix the parser strips before display.
 * Kept for older stored messages and tests that rebuild that shape.
 * */
export function withCurrentDateTime(message: string, dateTimeSection: string): string {
	return `${message}\n\n${buildCurrentDateTimeBlock(dateTimeSection)}`;
}

/**
 * Name the project this conversation is scoped to.
 * Kept for older stored messages and tests that rebuild that shape.
 */
export function withProjectContext(message: string, projectSection: string): string {
	return `${message}\n\n${buildProjectContextBlock(projectSection)}`;
}

/**
 * Tell the agent the project has searchable past conversations. First turn of a
 * thread only — it exists to make the agent reach for the `conversation-history`
 * tool, which it otherwise has no reason to believe has anything in it.
 * Kept for older stored messages and tests that rebuild that shape.
 */
export function withPastConversations(message: string, section: string): string {
	return `${message}\n\n${buildPastConversationsBlock(section)}`;
}

/**
 * Carry the user's saved AI preferences. First turn of a thread only, so the text
 * is paid for once per conversation. The block arrives already tagged and escaped
 * from `AiPreferenceService`, so the same block serves every AI surface.
 * On the turn rather than in the system prompt for prompt-caching reasons.
 */
export function withAiPreferences(message: string, block: string): string {
	return `${message}\n\n${block}`;
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
export function sanitisePromptText(value: string): string {
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
		.slice(0, PROMPT_TEXT_MAX_LENGTH);
}

/** The fact, and only the fact. The rule that follows from it ("writes are locked to
 *  this project", "check it before you build") lives in the system prompt, which is
 *  CACHED — restating it here would pay for the same sentence in uncached tokens on
 *  every turn of every conversation. Measured: the fact alone is enough. */
/**
 * The onboarding skill's SKILL.md body, one section of the opening turn's thread-context block, so
 * the flow runs without a `load_skill` call.
 */
export function buildOnboardingSkillBlock(instructions: string): string {
	return `<onboarding-skill>\nThis skill is loaded for this thread: follow it and do not call load_skill for it.\n${instructions}\n</onboarding-skill>`;
}

/** One opening-card answer as the agent gets it: the question text plus what the user chose or typed. */
export interface OnboardingAnswer {
	question: string;
	selectedOptions: string[];
	customText?: string;
}

/**
 * The answers to an onboarding thread's opening card, one line per question, so a question added
 * to the opening file reaches the agent without a code change. The card is not in the LLM
 * history (it lives in the event log), so the answers ride a hidden user turn; the parser drops
 * that turn from the UI.
 */
export function buildOnboardingAnswerMessage(answers: OnboardingAnswer[]): string {
	return [
		AUTO_FOLLOW_UP_MESSAGE,
		'',
		'<onboarding-answer>',
		'The user answered the opening questions:',
		...answers.map((answer) => `- ${answer.question} ${formatOnboardingAnswer(answer)}`),
		'These answers are final: use them as they are and do not ask these questions again.',
		'</onboarding-answer>',
	].join('\n');
}

/** The selected options plus the free text; `(not answered)` when the card had neither. */
function formatOnboardingAnswer({ selectedOptions, customText }: OnboardingAnswer): string {
	const text = customText?.trim();
	const values = [...selectedOptions, ...(text ? [text] : [])];
	return values.length > 0 ? values.join(', ') : '(not answered)';
}

export function getProjectContextSection(project: { name: string; type: string }): string {
	return `This conversation is scoped to the project "${sanitisePromptText(project.name)}" (${project.type}).`;
}

/**
 * Recover the original user text from a stored message that may contain
 * internal enrichment. Returns `null` for auto-follow-up messages that
 * should be hidden from the UI entirely.
 */
export function cleanStoredUserMessage(stored: string): string | null {
	// The service can stack several internal blocks (e.g. an editor-context block
	// ahead of a running-tasks-enriched message), so strip every leading block —
	// not just the first — or the trailing ones leak into the visible message.
	let text = stripTrailingContextBlocks(stored);
	let previous: string;
	do {
		previous = text;
		text = text.replace(TASK_CONTEXT_BLOCK, '');
	} while (text !== previous);
	return text === AUTO_FOLLOW_UP_MESSAGE ? null : text;
}

/**
 * The service-injected blocks at the head of a stored message — everything
 * `cleanStoredUserMessage` strips from the front, one entry per block.
 * Structured payloads are read from these only, so a tag lookalike in the
 * user's own text is never parsed as if the service wrote it.
 */
function leadingInternalBlocks(stored: string): string[] {
	let rest = stored;
	const blocks: string[] = [];
	for (;;) {
		const match = TASK_CONTEXT_BLOCK.exec(rest);
		if (!match) return blocks;
		blocks.push(match[0]);
		rest = rest.slice(match[0].length);
	}
}

function parseResourceAttachmentJson(raw: string): InstanceAiResourceAttachment[] {
	const parsed = z
		.array(instanceAiResourceAttachmentSchema)
		.safeParse(jsonParse(raw, { fallbackValue: undefined }));
	return parsed.success ? parsed.data : [];
}

/**
 * Reconstructs resource attachments (workflows, agents, nodes) encoded in a
 * stored user message so the UI can re-surface them after a reload. Prefers the
 * JSON line inside `<thread-artifacts>`; falls back to legacy `<editor-context>`.
 */
export function extractEditorContextResourceAttachments(
	stored: string,
): InstanceAiResourceAttachment[] {
	const blocks = leadingInternalBlocks(stored);
	const threadContext = blocks.find((block) => block.startsWith(THREAD_CONTEXT_OPEN_TAG));
	const fromThreadArtifacts = threadContext
		? THREAD_ARTIFACTS_RESOURCE_JSON.exec(threadContext)
		: null;
	if (fromThreadArtifacts) {
		return parseResourceAttachmentJson(fromThreadArtifacts[1]);
	}
	// Legacy hand-off: the editor-context block opened the message.
	const fromEditorContext = blocks[0] ? EDITOR_CONTEXT_JSON.exec(blocks[0]) : null;
	if (!fromEditorContext) return [];
	return parseResourceAttachmentJson(fromEditorContext[1]);
}

/**
 * Reconstructs the agent-preview handoff context encoded in a stored user
 * message so the UI can re-surface it (chip) after a reload.
 */
export function extractAgentPreviewHandoffContext(
	stored: string,
): InstanceAiAgentPreviewHandoffContext | undefined {
	const match = AGENT_PREVIEW_CONTEXT_JSON.exec(stored);
	if (!match) return undefined;
	const parsed = instanceAiAgentPreviewHandoffContextSchema.safeParse(
		jsonParse(match[1], { fallbackValue: undefined }),
	);
	return parsed.success ? parsed.data : undefined;
}

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
	const previewArtifacts = context?.artifacts ?? [];
	if (previewArtifacts.length === 0 && resourceAttachments.length === 0) return '';

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
		...(previewLines.length > 0
			? ['Artifacts the user can see in this conversation’s preview:', ...previewLines]
			: []),
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
