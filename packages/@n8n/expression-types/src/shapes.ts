// Runtime-independent shapes of the n8n expression environment. Global so that
// types the service prints (e.g. `N8nItem<{ id: number }, "data">`) resolve in any
// project that includes this file. Sources: packages/workflow/src/workflow-data-proxy.ts,
// packages/core/.../get-additional-keys.ts.
import type { DateTime as LuxonDateTime } from 'luxon';

declare global {
	type DateTime = LuxonDateTime;

	interface N8nBinaryData {
		data: string;
		mimeType: string;
		fileType?: string;
		fileName?: string;
		directory?: string;
		fileExtension?: string;
		fileSize?: string;
		id?: string;
	}
	interface N8nItem<J, B extends string> {
		json: J;
		binary: Record<B, N8nBinaryData>;
		pairedItem?: { item: number; input?: number } | Array<{ item: number; input?: number }>;
	}
	interface N8nNodeData<J, B extends string, P> {
		item: N8nItem<J, B>;
		itemMatching(itemIndex: number): N8nItem<J, B>;
		pairedItem(itemIndex?: number): N8nItem<J, B>;
		first(branchIndex?: number, runIndex?: number): N8nItem<J, B>;
		last(branchIndex?: number, runIndex?: number): N8nItem<J, B>;
		all(branchIndex?: number, runIndex?: number): Array<N8nItem<J, B>>;
		context: Record<string, N8nLooseJson>;
		params: P;
		isExecuted: boolean;
	}
	type N8nAnyNodeData = N8nNodeData<
		Record<string, N8nLooseJson>,
		string,
		Record<string, N8nLooseJson>
	>;
	interface N8nInput<J, B extends string, P> {
		item: N8nItem<J, B>;
		first(branchIndex?: number, runIndex?: number): N8nItem<J, B>;
		last(branchIndex?: number, runIndex?: number): N8nItem<J, B>;
		all(branchIndex?: number, runIndex?: number): Array<N8nItem<J, B>>;
		context: Record<string, N8nLooseJson>;
		params: P;
	}
	type N8nLegacyNode<J, B extends string, P> = N8nItem<J, B> & {
		parameter: P;
		context: Record<string, N8nLooseJson>;
		runIndex: number;
	};
	interface N8nExecution {
		id: string;
		mode: 'test' | 'production';
		resumeUrl: string;
		resumeFormUrl: string;
		customData?: {
			set(key: string, value: string): void;
			get(key: string): string;
			getAll(): Record<string, string>;
			setAll(values: Record<string, string>): void;
		};
	}
	type N8nMode =
		| 'cli'
		| 'error'
		| 'integrated'
		| 'internal'
		| 'manual'
		| 'retry'
		| 'trigger'
		| 'webhook'
		| 'evaluation'
		| 'chat';
	interface N8nPrevNode {
		name: string;
		outputIndex: number;
		runIndex: number;
	}
	interface N8nWorkflow {
		id: string;
		name: string;
		active: boolean;
	}
	interface N8nAgentInfo {
		memoryConnectedToAgent: boolean;
		tools: Array<{
			connected: boolean;
			name: string;
			type: string;
			resource?: string;
			operation?: string;
			hasCredentials?: boolean;
		}>;
	}
	type N8nFromAIType = 'string' | 'number' | 'boolean' | 'json';

	/** A runtime value with no known shape: JSON-legal, unchecked. */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- gradual typing: data with no known shape must never block a check
	type N8nLooseJson = any;

	interface N8nHttpResponse<Body> {
		body: Body;
		headers: Record<string, N8nLooseJson>;
		statusCode: number;
		statusMessage?: string;
	}
	interface N8nHttpRequest<Body> {
		url: string;
		baseURL?: string;
		method?: 'DELETE' | 'GET' | 'HEAD' | 'PATCH' | 'POST' | 'PUT';
		headers?: Record<string, N8nLooseJson>;
		qs?: Record<string, N8nLooseJson>;
		body?: Body;
		json?: boolean;
		[key: string]: N8nLooseJson;
	}

	/** The expression text is wrong on its own, in its context. The plugin or `check` says why. */
	interface N8nInvalidExpression {
		readonly __n8nInvalidExpression: true;
	}
	/** The expression is fine, but the data it was resolved against does not fit. */
	interface N8nResolveError {
		readonly __n8nResolveError: true;
	}
}

export {};
