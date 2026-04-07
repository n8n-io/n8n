import { describe, it, expect, beforeEach } from 'vitest';

import {
	ToolSearchProcessor,
	type ToolDescriptor,
	type ToolRepository,
} from '../../sdk/tool-search-processor';
import type { BuiltTool } from '../../types/sdk/tool';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTool(name: string, description: string): BuiltTool {
	return {
		name,
		description,
		handler: async () => ({ ok: true }),
	};
}

function makeDescriptor(name: string, description: string, hasCredentials = true): ToolDescriptor {
	return { name, description, hasCredentials };
}

/**
 * A simple in-memory ToolRepository for use in tests.
 */
class InMemoryToolRepository implements ToolRepository {
	private readonly tools: Map<string, { descriptor: ToolDescriptor; tool: BuiltTool }> = new Map();

	add(descriptor: ToolDescriptor, tool: BuiltTool): this {
		this.tools.set(descriptor.name, { descriptor, tool });
		return this;
	}

	async listTools(): Promise<ToolDescriptor[]> {
		return Array.from(this.tools.values()).map((e) => e.descriptor);
	}

	async getTool(name: string): Promise<BuiltTool | undefined> {
		return this.tools.get(name)?.tool;
	}
}

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const GOOGLE_CALENDAR = makeDescriptor(
	'google_calendar_create_event',
	'Create a new event in Google Calendar with a title, date, and optional attendees.',
);
const GOOGLE_CALENDAR_LIST = makeDescriptor(
	'google_calendar_list_events',
	'List upcoming events from a Google Calendar.',
);
const SLACK_SEND = makeDescriptor(
	'slack_send_message',
	'Send a message to a Slack channel or direct message.',
);
const GITHUB_CREATE_ISSUE = makeDescriptor(
	'github_create_issue',
	'Create a new GitHub issue in a repository with a title and description.',
);
const NO_CRED_TOOL = makeDescriptor(
	'unconfigured_tool',
	'A tool whose credentials are not configured.',
	false, // hasCredentials = false
);

function buildRepository(): InMemoryToolRepository {
	const repo = new InMemoryToolRepository();
	repo.add(GOOGLE_CALENDAR, makeTool(GOOGLE_CALENDAR.name, GOOGLE_CALENDAR.description));
	repo.add(
		GOOGLE_CALENDAR_LIST,
		makeTool(GOOGLE_CALENDAR_LIST.name, GOOGLE_CALENDAR_LIST.description),
	);
	repo.add(SLACK_SEND, makeTool(SLACK_SEND.name, SLACK_SEND.description));
	repo.add(
		GITHUB_CREATE_ISSUE,
		makeTool(GITHUB_CREATE_ISSUE.name, GITHUB_CREATE_ISSUE.description),
	);
	repo.add(NO_CRED_TOOL, makeTool(NO_CRED_TOOL.name, NO_CRED_TOOL.description));
	return repo;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ToolSearchProcessor — meta-tools', () => {
	it('exposes exactly two meta-tools', () => {
		const processor = new ToolSearchProcessor({ repository: buildRepository() });
		const [search, load] = processor.metaTools;
		expect(processor.metaTools).toHaveLength(2);
		expect(search.name).toBe('search_tools');
		expect(load.name).toBe('load_tool');
	});

	it('meta-tools have descriptions', () => {
		const processor = new ToolSearchProcessor({ repository: buildRepository() });
		const [search, load] = processor.metaTools;
		expect(search.description.length).toBeGreaterThan(0);
		expect(load.description.length).toBeGreaterThan(0);
	});

	it('meta-tools have handlers', () => {
		const processor = new ToolSearchProcessor({ repository: buildRepository() });
		const [search, load] = processor.metaTools;
		expect(typeof search.handler).toBe('function');
		expect(typeof load.handler).toBe('function');
	});

	it('meta-tools have input schemas', () => {
		const processor = new ToolSearchProcessor({ repository: buildRepository() });
		const [search, load] = processor.metaTools;
		expect(search.inputSchema).toBeDefined();
		expect(load.inputSchema).toBeDefined();
	});
});

describe('ToolSearchProcessor — getLoadedTools / reset', () => {
	it('starts with no loaded tools', () => {
		const processor = new ToolSearchProcessor({ repository: buildRepository() });
		expect(processor.getLoadedTools()).toEqual([]);
	});

	it('reset clears loaded tools', async () => {
		const processor = new ToolSearchProcessor({ repository: buildRepository() });
		const [, load] = processor.metaTools;

		await load.handler!({ name: SLACK_SEND.name }, {});
		expect(processor.getLoadedTools()).toHaveLength(1);

		processor.reset();
		expect(processor.getLoadedTools()).toEqual([]);
	});
});

describe('ToolSearchProcessor — search_tools', () => {
	let processor: ToolSearchProcessor;

	beforeEach(() => {
		processor = new ToolSearchProcessor({ repository: buildRepository() });
	});

	it('returns tools matching keyword in description', async () => {
		const [search] = processor.metaTools;
		const result = await search.handler!({ query: 'calendar' }, {});
		const { results } = result as { results: Array<{ name: string; score: number }> };

		const names = results.map((r) => r.name);
		expect(names).toContain(GOOGLE_CALENDAR.name);
		expect(names).toContain(GOOGLE_CALENDAR_LIST.name);
	});

	it('returns tools matching keyword in name', async () => {
		const [search] = processor.metaTools;
		const result = await search.handler!({ query: 'slack' }, {});
		const { results } = result as { results: Array<{ name: string }> };

		expect(results.map((r) => r.name)).toContain(SLACK_SEND.name);
	});

	it('excludes tools without configured credentials', async () => {
		const [search] = processor.metaTools;
		const result = await search.handler!({ query: 'unconfigured' }, {});
		const { results } = result as { results: Array<{ name: string }> };

		expect(results.map((r) => r.name)).not.toContain(NO_CRED_TOOL.name);
	});

	it('ranks more relevant tools higher', async () => {
		const [search] = processor.metaTools;
		// "calendar" appears in both calendar tools; the one with "create" in description
		// should rank alongside the list tool — both must be present and score > 0
		const result = await search.handler!({ query: 'calendar create' }, {});
		const { results } = result as { results: Array<{ name: string; score: number }> };

		const createEntry = results.find((r) => r.name === GOOGLE_CALENDAR.name);
		const listEntry = results.find((r) => r.name === GOOGLE_CALENDAR_LIST.name);

		expect(createEntry).toBeDefined();
		expect(listEntry).toBeDefined();
		// The "create event" tool should score >= the "list events" tool for "create calendar"
		expect(createEntry!.score).toBeGreaterThanOrEqual(listEntry!.score);
	});

	it('returns an empty results array when no tools match', async () => {
		const [search] = processor.metaTools;
		const result = await search.handler!({ query: 'xyzzy_no_match_at_all' }, {});
		const { results } = result as { results: unknown[] };

		expect(results).toEqual([]);
	});

	it('respects maxResults cap', async () => {
		// Build a repo with many tools to exceed the cap
		const repo = new InMemoryToolRepository();
		for (let i = 0; i < 20; i++) {
			const d = makeDescriptor(`tool_${i}`, `A tool that does something useful for task ${i}`);
			repo.add(d, makeTool(d.name, d.description));
		}
		const capped = new ToolSearchProcessor({ repository: repo, maxResults: 5 });
		const [search] = capped.metaTools;

		const result = await search.handler!({ query: 'tool' }, {});
		const { results } = result as { results: unknown[] };

		expect(results.length).toBeLessThanOrEqual(5);
	});

	it('includes name, description, and score in each result', async () => {
		const [search] = processor.metaTools;
		const result = await search.handler!({ query: 'github' }, {});
		const { results } = result as {
			results: Array<{ name: string; description: string; score: number }>;
		};

		expect(results.length).toBeGreaterThan(0);
		for (const r of results) {
			expect(typeof r.name).toBe('string');
			expect(typeof r.description).toBe('string');
			expect(typeof r.score).toBe('number');
			expect(r.score).toBeGreaterThan(0);
			expect(r.score).toBeLessThanOrEqual(1);
		}
	});

	it('returns results sorted by score descending', async () => {
		const [search] = processor.metaTools;
		const result = await search.handler!({ query: 'google calendar' }, {});
		const { results } = result as { results: Array<{ score: number }> };

		for (let i = 1; i < results.length; i++) {
			expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
		}
	});
});

describe('ToolSearchProcessor — load_tool', () => {
	let processor: ToolSearchProcessor;

	beforeEach(() => {
		processor = new ToolSearchProcessor({ repository: buildRepository() });
	});

	it('loads a tool and makes it available via getLoadedTools', async () => {
		const [, load] = processor.metaTools;
		const result = await load.handler!({ name: SLACK_SEND.name }, {});
		const { success } = result as { success: boolean };

		expect(success).toBe(true);
		const loaded = processor.getLoadedTools();
		expect(loaded).toHaveLength(1);
		expect(loaded[0].name).toBe(SLACK_SEND.name);
	});

	it('returns failure for an unknown tool name', async () => {
		const [, load] = processor.metaTools;
		const result = await load.handler!({ name: 'nonexistent_tool' }, {});
		const { success } = result as { success: boolean };

		expect(success).toBe(false);
		expect(processor.getLoadedTools()).toHaveLength(0);
	});

	it('rejects tools without configured credentials', async () => {
		const [, load] = processor.metaTools;
		const result = await load.handler!({ name: NO_CRED_TOOL.name }, {});
		const { success } = result as { success: boolean };

		expect(success).toBe(false);
		expect(processor.getLoadedTools()).toHaveLength(0);
	});

	it('rejects duplicate tool names', async () => {
		const [, load] = processor.metaTools;

		const first = await load.handler!({ name: SLACK_SEND.name }, {});
		expect((first as { success: boolean }).success).toBe(true);

		const second = await load.handler!({ name: SLACK_SEND.name }, {});
		expect((second as { success: boolean }).success).toBe(false);

		// Still only one copy in the loaded set
		expect(processor.getLoadedTools()).toHaveLength(1);
	});

	it('can load multiple different tools in the same session', async () => {
		const [, load] = processor.metaTools;

		await load.handler!({ name: SLACK_SEND.name }, {});
		await load.handler!({ name: GITHUB_CREATE_ISSUE.name }, {});
		await load.handler!({ name: GOOGLE_CALENDAR.name }, {});

		const loaded = processor.getLoadedTools();
		expect(loaded).toHaveLength(3);
		const names = loaded.map((t) => t.name);
		expect(names).toContain(SLACK_SEND.name);
		expect(names).toContain(GITHUB_CREATE_ISSUE.name);
		expect(names).toContain(GOOGLE_CALENDAR.name);
	});

	it('returns a message string in both success and failure responses', async () => {
		const [, load] = processor.metaTools;

		const ok = (await load.handler!({ name: SLACK_SEND.name }, {})) as {
			success: boolean;
			message: string;
		};
		const fail = (await load.handler!({ name: 'ghost' }, {})) as {
			success: boolean;
			message: string;
		};

		expect(typeof ok.message).toBe('string');
		expect(ok.message.length).toBeGreaterThan(0);
		expect(typeof fail.message).toBe('string');
		expect(fail.message.length).toBeGreaterThan(0);
	});
});
