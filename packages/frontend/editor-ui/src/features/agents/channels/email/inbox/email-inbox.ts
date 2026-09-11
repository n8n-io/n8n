import type { AgentSessionStatus } from '@n8n/api-types';
import { formatThreadTitle } from '../../../utils/thread-title';
import { flattenExecutionsToTimelineItems } from '../../../session-timeline.utils';
import type { AgentExecutionThread, ThreadDetail } from '../../../composables/useAgentThreadsApi';

export const EMAIL_INBOX_PAGE_SIZE = 100;
export const EMAIL_INBOX_CHART_DAYS = 14;

export type InboxFolder = 'inbox' | 'needsAttention';

export interface InboxThread {
	id: string;
	subject: string;
	preview: string;
	updatedAt: string;
	createdAt: string;
	status: AgentSessionStatus | null;
	durationMs: number;
	needsAttention: boolean;
	replied: boolean;
}

export interface InboxMessage {
	id: string;
	role: 'inbound' | 'agent';
	content: string;
	timestamp: number;
	attachments: Array<{ id: string; fileName: string }>;
}

export interface InboxDayBucket {
	date: string;
	received: number;
	replied: number;
}

export interface InboxStatusBucket {
	status: AgentSessionStatus;
	count: number;
}

export interface InboxAnalytics {
	received: number;
	replies: number;
	replyRate: number;
	errors: number;
	avgResponseMs: number;
	byDay: InboxDayBucket[];
	byStatus: InboxStatusBucket[];
}

const ATTENTION_STATUSES = new Set<AgentSessionStatus>(['running', 'error', 'interrupted']);

export function threadNeedsAttention(status: AgentSessionStatus | null | undefined): boolean {
	return status != null && ATTENTION_STATUSES.has(status);
}

export function toInboxThread(thread: AgentExecutionThread, untitled: string): InboxThread {
	const subject = formatThreadTitle(thread, untitled);
	const preview = (thread.firstMessage ?? '').replace(/\s+/g, ' ').trim();
	return {
		id: thread.id,
		subject,
		preview: preview === subject ? '' : preview,
		updatedAt: thread.updatedAt,
		createdAt: thread.createdAt,
		status: thread.status ?? null,
		durationMs: thread.totalDuration,
		needsAttention: threadNeedsAttention(thread.status),
		replied: thread.status === 'succeeded',
	};
}

export function filterInboxThreads(
	threads: InboxThread[],
	folder: InboxFolder,
	query: string,
): InboxThread[] {
	const needle = query.trim().toLowerCase();
	return threads.filter((thread) => {
		if (folder === 'needsAttention' && !thread.needsAttention) return false;
		if (!needle) return true;
		return (
			thread.subject.toLowerCase().includes(needle) || thread.preview.toLowerCase().includes(needle)
		);
	});
}

export function conversationFromDetail(detail: ThreadDetail): InboxMessage[] {
	return flattenExecutionsToTimelineItems(detail.executions)
		.filter((item) => item.kind === 'user' || item.kind === 'agent')
		.map((item) => ({
			id: `${item.executionId}:${item.kind}:${item.timestamp}`,
			role: item.kind === 'user' ? 'inbound' : 'agent',
			content: item.content?.trim() || '',
			timestamp: item.timestamp,
			attachments: (item.attachments ?? []).map((file) => ({
				id: file.id,
				fileName: file.fileName,
			})),
		}))
		.filter((message) => message.content.length > 0 || message.attachments.length > 0);
}

function localDayKey(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

function dayKey(iso: string, start: Date): string {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime()) || date < start) return '';
	return localDayKey(date);
}

export function buildInboxAnalytics(threads: InboxThread[], now = new Date()): InboxAnalytics {
	const byStatus = new Map<AgentSessionStatus, number>();
	const byDay = new Map<string, InboxDayBucket>();
	const start = new Date(now);
	start.setHours(0, 0, 0, 0);
	start.setDate(start.getDate() - (EMAIL_INBOX_CHART_DAYS - 1));
	for (let i = 0; i < EMAIL_INBOX_CHART_DAYS; i++) {
		const day = new Date(start);
		day.setDate(start.getDate() + i);
		const key = localDayKey(day);
		byDay.set(key, { date: key, received: 0, replied: 0 });
	}

	let replies = 0;
	let errors = 0;
	let responseTotal = 0;
	let responseCount = 0;

	for (const thread of threads) {
		if (thread.status) byStatus.set(thread.status, (byStatus.get(thread.status) ?? 0) + 1);
		if (thread.replied) replies += 1;
		if (thread.status === 'error') errors += 1;
		if (thread.durationMs > 0) {
			responseTotal += thread.durationMs;
			responseCount += 1;
		}
		const key = dayKey(thread.createdAt, start);
		const bucket = key ? byDay.get(key) : undefined;
		if (bucket) {
			bucket.received += 1;
			if (thread.replied) bucket.replied += 1;
		}
	}

	return {
		received: threads.length,
		replies,
		replyRate: threads.length === 0 ? 0 : replies / threads.length,
		errors,
		avgResponseMs: responseCount === 0 ? 0 : Math.round(responseTotal / responseCount),
		byDay: [...byDay.values()],
		byStatus: [...byStatus.entries()].map(([status, count]) => ({ status, count })),
	};
}

export function formatInboxTime(iso: string, now = new Date()): string {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return '';
	const sameDay =
		date.getFullYear() === now.getFullYear() &&
		date.getMonth() === now.getMonth() &&
		date.getDate() === now.getDate();
	if (sameDay) {
		return date.toLocaleTimeString(undefined, {
			hour: '2-digit',
			minute: '2-digit',
			hour12: false,
		});
	}
	return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
