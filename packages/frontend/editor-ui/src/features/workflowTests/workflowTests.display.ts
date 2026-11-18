import type { WorkflowTestResult } from '@n8n/api-types';
import type { IconName } from '@n8n/design-system/components/N8nIcon/icons';
import type { BaseTextKey } from '@n8n/i18n';

import type { TestFileNode, TestNodeMark } from './workflowTests.utils';

export type WorkflowTestRowStatus = WorkflowTestResult['status'] | 'running' | 'notRun';

/** One test as the Tests tab shows it: from the file, with its result if it ran. */
export type WorkflowTestRow = {
	kind: 'test';
	/** The name in its `describe` block. */
	name: string;
	/** The name that the runner reports, with the `describe` names before it. */
	fullName: string;
	status: WorkflowTestRowStatus;
	durationMs?: number;
	error?: WorkflowTestResult['error'];
	/** The 1-based line of the test call, when the file still has it. */
	line?: number;
	marks: TestNodeMark[];
	httpMocks: number;
};

export type WorkflowTestCounts = Record<WorkflowTestRowStatus, number> & { total: number };

/** A `describe` block with the status of all the tests in it. */
export type WorkflowTestGroup = {
	kind: 'group';
	name: string;
	fullName: string;
	status: WorkflowTestRowStatus;
	counts: WorkflowTestCounts;
	children: WorkflowTestTreeItem[];
};

export type WorkflowTestTreeItem = WorkflowTestRow | WorkflowTestGroup;

export function countTests(items: WorkflowTestTreeItem[]): WorkflowTestCounts {
	const counts: WorkflowTestCounts = {
		passed: 0,
		failed: 0,
		skipped: 0,
		running: 0,
		notRun: 0,
		total: 0,
	};
	for (const item of items) {
		if (item.kind === 'group') {
			for (const status of Object.keys(counts) as Array<keyof WorkflowTestCounts>) {
				counts[status] += item.counts[status];
			}
		} else {
			counts[item.status]++;
			counts.total++;
		}
	}
	return counts;
}

/** A group fails if one test fails. It passes only if no test is pending. */
function groupStatus(counts: WorkflowTestCounts): WorkflowTestRowStatus {
	if (counts.failed > 0) return 'failed';
	if (counts.running > 0) return 'running';
	if (counts.notRun > 0) return 'notRun';
	if (counts.passed > 0) return 'passed';
	return counts.skipped > 0 ? 'skipped' : 'notRun';
}

/**
 * Merges the tests of the file with the results of a run. A result whose name
 * the file does not declare (for example a name built with a template) is
 * listed at the end with its full name.
 */
export function buildTestTree(
	nodes: TestFileNode[],
	results: WorkflowTestResult[],
	isRunning: boolean,
): WorkflowTestTreeItem[] {
	const byName = new Map(results.map((result) => [result.name, result]));
	const used = new Set<string>();

	const toRow = (
		name: string,
		fullName: string,
		declared?: Extract<TestFileNode, { kind: 'test' }>,
	): WorkflowTestRow => {
		const result = byName.get(fullName);
		if (result) used.add(fullName);
		return {
			kind: 'test',
			name,
			fullName,
			line: declared?.line,
			marks: declared?.marks ?? [],
			httpMocks: declared?.httpMocks ?? 0,
			// While the run is live, a test without a result is running or waiting for its turn.
			status: result?.status ?? (isRunning ? 'running' : 'notRun'),
			durationMs: result?.durationMs,
			error: result?.error,
		};
	};

	const build = (items: TestFileNode[]): WorkflowTestTreeItem[] =>
		items.map((node) => {
			if (node.kind === 'test') return toRow(node.name, node.fullName, node);
			const children = build(node.children);
			const counts = countTests(children);
			return {
				kind: 'group',
				name: node.name,
				fullName: node.fullName,
				status: groupStatus(counts),
				counts,
				children,
			};
		});

	const tree = build(nodes);
	for (const result of results) {
		if (!used.has(result.name)) tree.push(toRow(result.name, result.name));
	}
	return tree;
}

export function flattenTests(items: WorkflowTestTreeItem[]): WorkflowTestRow[] {
	return items.flatMap((item) => (item.kind === 'group' ? flattenTests(item.children) : [item]));
}

/** What a set of tests does to one node of the workflow. */
export type NodeTestMarks = Record<
	TestNodeMark['kind'],
	{ marks: TestNodeMark[] /** The number of tests with this mark. */; tests: number }
> & {
	/** A test failed at this node. */
	failed: boolean;
	/** Each test that asserts on this node passed. */
	assertionsPassed: boolean;
};

/**
 * Groups the marks of the tests by node name. An input mark without a node
 * name belongs to `defaultTrigger`.
 */
export function collectNodeMarks(
	rows: WorkflowTestRow[],
	defaultTrigger: string | undefined,
): Map<string, NodeTestMarks> {
	const byNode = new Map<string, NodeTestMarks>();
	const entryOf = (node: string) => {
		const existing = byNode.get(node);
		if (existing) return existing;
		const created: NodeTestMarks = {
			input: { marks: [], tests: 0 },
			mocked: { marks: [], tests: 0 },
			asserted: { marks: [], tests: 0 },
			failed: false,
			assertionsPassed: true,
		};
		byNode.set(node, created);
		return created;
	};

	for (const row of rows) {
		const counted = new Set<string>();
		for (const mark of row.marks) {
			const node = mark.node ?? defaultTrigger;
			if (!node) continue;
			const entry = entryOf(node);
			entry[mark.kind].marks.push(mark);
			if (mark.kind === 'asserted' && row.status !== 'passed') entry.assertionsPassed = false;
			const key = `${mark.kind}:${node}`;
			if (!counted.has(key)) entry[mark.kind].tests++;
			counted.add(key);
		}
		if (row.error?.node) entryOf(row.error.node).failed = true;
	}
	return byNode;
}

/** The runner does not report the active test, so a test that waits has no spinner. */
export const TEST_STATUS_DISPLAY: Record<
	WorkflowTestRowStatus,
	{ icon: IconName; label: BaseTextKey }
> = {
	passed: { icon: 'circle-check', label: 'workflowTests.status.passed' },
	failed: { icon: 'circle-x', label: 'workflowTests.status.failed' },
	skipped: { icon: 'circle-minus', label: 'workflowTests.status.skipped' },
	running: { icon: 'circle-dashed-filled', label: 'workflowTests.status.running' },
	notRun: { icon: 'circle-dashed-filled', label: 'workflowTests.status.notRun' },
};

export function formatTestDuration(durationMs: number): string {
	return durationMs < 1000 ? `${Math.round(durationMs)} ms` : `${(durationMs / 1000).toFixed(1)} s`;
}
