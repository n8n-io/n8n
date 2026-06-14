import { describe, it, expect } from 'vitest';
import { computed, defineComponent, h } from 'vue';
import { mount } from '@vue/test-utils';
import { createRouter, createWebHistory } from 'vue-router';
import type { ITaskData } from 'n8n-workflow';

import { MESSAGE_AN_AGENT_NODE_TYPE } from '@/app/constants/nodeTypes';
import { AGENT_SESSION_DETAIL_VIEW } from '@/features/agents/constants';
import type { LogEntry } from '@/features/execution/logs/logs.types';

import { useMessageAgentSessionLink } from '../composables/useMessageAgentSessionLink';

function makeLogEntry(overrides: Partial<LogEntry> = {}): LogEntry {
	// Only the fields the composable reads matter; the rest is cast through to
	// keep this fixture small and avoid pulling in a real Workflow factory.
	const base = {
		id: 'log-1',
		runIndex: 0,
		children: [],
		consumedTokens: {
			completionTokens: 0,
			isEstimate: false,
			promptTokens: 0,
			totalTokens: 0,
		},
		executionId: 'exec-1',
		execution: { resultData: { runData: {} } },
		isSubExecution: false,
		node: {
			id: 'node-1',
			name: 'Message an Agent',
			type: MESSAGE_AN_AGENT_NODE_TYPE,
			typeVersion: 1,
			parameters: {},
			position: [0, 0],
		},
		runData: undefined,
		workflow: {},
	};
	return { ...base, ...overrides } as unknown as LogEntry;
}

function runWithRouter(
	logEntry: { value: LogEntry | undefined },
	registerSessionRoute: boolean,
): { link: () => ReturnType<typeof useMessageAgentSessionLink>['link']['value'] } {
	const router = createRouter({
		history: createWebHistory(),
		routes: registerSessionRoute
			? [
					{
						name: AGENT_SESSION_DETAIL_VIEW,
						path: '/projects/:projectId/agents/:agentId/sessions/:threadId',
						component: () => h('div'),
					},
				]
			: [{ path: '/', component: () => h('div') }],
	});

	let captured: ReturnType<typeof useMessageAgentSessionLink>['link'] | null = null;

	const Harness = defineComponent({
		setup() {
			captured = useMessageAgentSessionLink(computed(() => logEntry.value)).link;
			return () => h('div');
		},
	});

	mount(Harness, { global: { plugins: [router] } });
	return { link: () => captured!.value };
}

const sessionRunData = {
	executionStatus: 'success',
	startTime: 0,
	executionTime: 1,
	source: [],
	data: {
		main: [
			[
				{
					json: {
						response: 'hi',
						session: {
							agentId: 'agent-1',
							projectId: 'project-1',
							sessionId: 'thread-1',
						},
					},
				},
			],
		],
	},
} as unknown as ITaskData;

describe('useMessageAgentSessionLink', () => {
	it('returns a resolved href + open() for a messageAnAgent run with a session block', () => {
		const logEntry = { value: makeLogEntry({ runData: sessionRunData }) };
		const { link } = runWithRouter(logEntry, true);

		const value = link();
		expect(value).not.toBeNull();
		expect(value!.href).toBe('/projects/project-1/agents/agent-1/sessions/thread-1');
		expect(typeof value!.open).toBe('function');
	});

	it('returns null when the node-type is not messageAnAgent', () => {
		const logEntry = {
			value: makeLogEntry({
				node: {
					id: 'n',
					name: 'Other',
					type: 'n8n-nodes-base.set',
					typeVersion: 1,
					parameters: {},
					position: [0, 0],
				} as LogEntry['node'],
				runData: sessionRunData,
			}),
		};
		const { link } = runWithRouter(logEntry, true);
		expect(link()).toBeNull();
	});

	it('returns null when run output has no session block', () => {
		const noSession = {
			...sessionRunData,
			data: { main: [[{ json: { response: 'hi' } }]] },
		} as unknown as ITaskData;
		const logEntry = { value: makeLogEntry({ runData: noSession }) };
		const { link } = runWithRouter(logEntry, true);
		expect(link()).toBeNull();
	});

	it('returns null when the session route is not registered (graceful fallback)', () => {
		const logEntry = { value: makeLogEntry({ runData: sessionRunData }) };
		const { link } = runWithRouter(logEntry, false);
		expect(link()).toBeNull();
	});
});
