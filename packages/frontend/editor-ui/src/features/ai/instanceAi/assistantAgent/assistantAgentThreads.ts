import {
	acceptedMimeTypesFromCapabilities,
	type InstanceAiAttachment,
	type InstanceAiThreadOrigin,
	type InstanceAiThreadSource,
} from '@n8n/api-types';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useRootStore } from '@n8n/stores/useRootStore';
import { isRecord } from '@n8n/utils/is-record';
import { jsonParse } from 'n8n-workflow';
import type { InjectionKey } from 'vue';
import { z } from 'zod';

import type { AssistantMentionCounts } from '@/features/ai/assistant-at-mentions/assistantAtMentions.types';

import type { InstanceAiMessageAuthorship } from '../prefills';

/** Id of the n8n Assistant system agent on the agents runtime. */
export const ASSISTANT_AGENT_ID = 'assistant';

/**
 * The file types that the Assistant agent chat accepts: the images and PDFs
 * that the model reads, and the files that the `parse-file` tool reads.
 * Extensions cover browsers that report another MIME type, such as
 * `application/vnd.ms-excel` for a CSV file.
 */
export const ASSISTANT_AGENT_ACCEPTED_MIME_TYPES = [
	acceptedMimeTypesFromCapabilities({ image: true, pdf: true, audio: false }),
	'text/csv',
	'application/csv',
	'text/tab-separated-values',
	'application/json',
	'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	'text/plain',
	'text/markdown',
	'text/x-markdown',
	'text/html',
	'application/xhtml+xml',
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	'.csv',
	'.tsv',
	'.json',
	'.xlsx',
	'.txt',
	'.md',
	'.markdown',
	'.html',
	'.htm',
	'.pdf',
	'.docx',
].join(',');

/** The id of the open Assistant agent thread, for cards that report it in telemetry. */
export const ASSISTANT_AGENT_THREAD_ID: InjectionKey<string> = Symbol('assistantAgentThreadId');

/** The working project of the open Assistant agent thread, for cards whose payload has none. */
export const ASSISTANT_AGENT_PROJECT_ID: InjectionKey<string> = Symbol('assistantAgentProjectId');

/**
 * Which runtime runs a thread at `/assistant/:threadId`: the current Assistant
 * runtime, or the Assistant agent on the agents runtime with the project of
 * its thread.
 */
export type AssistantThreadRuntime =
	| { kind: 'assistant' }
	| { kind: 'assistant-agent'; projectId: string };

/**
 * Assistant agent threads that this tab created or found, with their project.
 * Module-level state: it saves a lookup when the user opens the thread again.
 */
const knownAgentThreads = new Map<string, string>();

export function rememberAssistantAgentThread(threadId: string, projectId: string): void {
	knownAgentThreads.set(threadId, projectId);
}

/** Drops a deleted thread, so its URL runs the lookup and opens as a missing thread. */
export function forgetAssistantAgentThread(threadId: string): void {
	knownAgentThreads.delete(threadId);
}

export function isKnownAssistantAgentThread(threadId: string): boolean {
	return knownAgentThreads.has(threadId);
}

const launchMarkerSchema = z.object({ projectId: z.string().min(1) });

/** A new Assistant agent thread: its project, and where it came from for telemetry. */
export interface AssistantAgentThreadLaunch {
	projectId: string;
	source: InstanceAiThreadSource;
	origin: InstanceAiThreadOrigin;
	templateId?: string;
}

const launchKey = (threadId: string) => `n8n-assistant-agent-launch:${threadId}`;

/**
 * Marks a new thread as an Assistant agent thread, and tracks its launch. The
 * server knows the thread only after its first message, so the marker is in
 * localStorage: a hand-off can open the thread in a new tab, or before the user
 * sends anything. The launch is tracked here, when the thread is created, as the
 * current runtime does, so both runtimes count the same launches.
 *
 * Temporary: the marker exists because both Assistant runtimes share the thread
 * URL. When the current runtime is removed, move the project and the launch
 * fields into the hand-off stash and remove the marker (AST-1898).
 */
export function stashAssistantAgentLaunch(threadId: string, launch: AssistantAgentThreadLaunch) {
	rememberAssistantAgentThread(threadId, launch.projectId);
	localStorage.setItem(launchKey(threadId), JSON.stringify({ projectId: launch.projectId }));
	useTelemetry().track('User launched Instance AI thread', {
		thread_id: threadId,
		instance_id: useRootStore().instanceId,
		source: launch.source,
		origin: launch.origin,
		...(launch.templateId ? { template_id: launch.templateId } : {}),
		runtime: 'agents',
	});
}

/** The project of a new thread that the server does not know yet. */
export function getAssistantAgentLaunch(threadId: string): { projectId: string } | undefined {
	const raw = localStorage.getItem(launchKey(threadId));
	if (!raw) return undefined;
	const parsed = launchMarkerSchema.safeParse(jsonParse(raw, { fallbackValue: null }));
	return parsed.success ? parsed.data : undefined;
}

/** Clear the marker once the server has the thread, or when the thread is dropped. */
export function clearAssistantAgentLaunch(threadId: string): void {
	localStorage.removeItem(launchKey(threadId));
}

/** The runtime of a thread when it is known without a request, else `undefined`. */
export function knownAssistantThreadRuntime(
	threadId: string,
	options: { assistantAgentEnabled: boolean; isAssistantThread: (threadId: string) => boolean },
): AssistantThreadRuntime | undefined {
	const projectId = knownAgentThreads.get(threadId) ?? getAssistantAgentLaunch(threadId)?.projectId;
	if (projectId) return { kind: 'assistant-agent', projectId };
	if (!options.assistantAgentEnabled || options.isAssistantThread(threadId)) {
		return { kind: 'assistant' };
	}
	return undefined;
}

/**
 * Asks the agents runtime for a thread that is not known yet. A thread that it
 * does not find opens in the current Assistant view, which handles a missing
 * thread. Any other failure rejects, because the thread can still be an
 * Assistant agent thread.
 */
export async function lookUpAssistantThreadRuntime(
	threadId: string,
	fetchAgentThread: (threadId: string) => Promise<{ projectId: string }>,
): Promise<AssistantThreadRuntime> {
	try {
		const { projectId } = await fetchAgentThread(threadId);
		rememberAssistantAgentThread(threadId, projectId);
		return { kind: 'assistant-agent', projectId };
	} catch (error) {
		if (isRecord(error) && error.httpStatusCode === 404) return { kind: 'assistant' };
		throw error;
	}
}

/**
 * The first message of a new Assistant agent thread. The empty view stores it
 * before it opens the thread, and the thread view sends it once its chat panel
 * is ready.
 */
export interface PendingAssistantAgentMessage {
	threadId: string;
	text: string;
	files: File[];
	/** Workflow and other resource references. They go to the agent in the client context. */
	references: InstanceAiAttachment[];
	/** Who wrote the text, for the message telemetry of the thread view. */
	authorship: InstanceAiMessageAuthorship;
	mentionCounts?: AssistantMentionCounts;
}

let pendingMessage: PendingAssistantAgentMessage | undefined;

export function stashPendingAssistantAgentMessage(message: PendingAssistantAgentMessage): void {
	pendingMessage = message;
}

/** One-shot read. It always clears the slot, so a message never reaches another thread. */
export function consumePendingAssistantAgentMessage(
	threadId: string,
): PendingAssistantAgentMessage | undefined {
	const message = pendingMessage;
	pendingMessage = undefined;
	return message?.threadId === threadId ? message : undefined;
}

/** Clears the slot only if it still holds this message, after a failed hand-off. */
export function discardPendingAssistantAgentMessage(
	message: PendingAssistantAgentMessage,
): boolean {
	if (pendingMessage !== message) return false;
	pendingMessage = undefined;
	return true;
}
