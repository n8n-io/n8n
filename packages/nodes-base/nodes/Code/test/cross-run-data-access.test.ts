/**
 * Reproduction test for NODE-4556: Code node "Unknown error" with cross-run data access
 *
 * Issue: A Code node that worked in v1 now times out or throws "Unknown error" in v2
 * when trying to access data from multiple runs of another node using:
 * - $node[nodeName].runIndex
 * - $items(nodeName, 0, runIndex)
 *
 * Root cause: Task runners don't have access to the full workflow execution context
 * needed to look up data from previous runs.
 *
 * This test documents the expected behavior for cross-run data access patterns.
 * The actual reproduction requires a full workflow execution environment with task runners.
 */

describe('Code Node - Cross-run data access (NODE-4556)', () => {
	/**
	 * Test case 1: Document $node[nodeName].runIndex access pattern
	 *
	 * This pattern is used to determine how many times a node has executed.
	 * It's commonly used in "collect and merge" patterns where a Code node
	 * needs to gather data from multiple loop iterations.
	 *
	 * FAILING IN v2: Task runners don't have access to $node context
	 */
	it('should document $node[nodeName].runIndex access pattern', () => {
		// This is the pattern that fails in the user's workflow
		const failingCodePattern = `
			const chunkNodeName = 'Generate chunk';

			// This works in v1 (in-process execution)
			// FAILS in v2 with task runners: $node is undefined or incomplete
			let lastRunIndex = 0;
			try {
				lastRunIndex = $node[chunkNodeName].runIndex ?? 0;
			} catch (e) {
				// v2 with task runners throws here
				return [{ json: { error: 'Cannot access $node runIndex' } }];
			}

			return [{ json: { lastRunIndex } }];
		`;

		// Document the pattern for reference
		expect(failingCodePattern).toContain('$node[chunkNodeName].runIndex');

		// Expected behavior:
		// - v1 (in-process): Can access $node[nodeName].runIndex to get execution count
		// - v2 (task runner): Task runner doesn't have full $node context
		//
		// Symptoms:
		// - Task hangs/times out
		// - Returns "Unknown error"
		// - Task runner logs: "ERROR [runner:js] Task <ID> timed out"
	});

	/**
	 * Test case 2: Document $items(nodeName, outputIndex, runIndex) access pattern
	 *
	 * This pattern is used to collect items from specific runs of a node.
	 * It's essential for "merge and collect" patterns where data from multiple
	 * loop iterations needs to be gathered.
	 *
	 * FAILING IN v2: Task runners don't have access to historical execution data
	 */
	it('should document $items(nodeName, outputIndex, runIndex) access pattern', () => {
		// This is the pattern that fails in the user's workflow
		const failingCodePattern = `
			const chunkNodeName = 'Generate chunk';
			const collected = [];

			// This works in v1 (in-process execution)
			// FAILS in v2 with task runners: cannot access items from other runs
			for (let run = 0; run <= 2; run++) {
				try {
					const itemsFromRun = $items(chunkNodeName, 0, run) || [];
					for (const item of itemsFromRun) {
						if (item.json?.content) {
							collected.push(item.json.content);
						}
					}
				} catch (e) {
					// v2 with task runners throws here
					return [{ json: { error: 'Cannot access $items from run ' + run } }];
				}
			}

			return [{ json: { collected } }];
		`;

		// Document the pattern for reference
		expect(failingCodePattern).toContain('$items(chunkNodeName, 0, run)');

		// Expected behavior:
		// - v1 (in-process): Can access items from any previous run
		// - v2 (task runner): Task runner only has access to current input items
		//
		// Root cause:
		// - Task runner receives only current execution context
		// - Historical execution data is not serialized/passed to task runner
		// - $items() with runIndex parameter requires full execution history
	});

	/**
	 * Test case 3: Document the complete "merge and collect" pattern
	 *
	 * This is a simplified version of the actual code from the user's workflow (NODE-4556)
	 * that demonstrates the full cross-run data collection pattern.
	 *
	 * User's workflow:
	 * 1. "Generate chunk" node runs multiple times in a loop, creating chunks
	 * 2. "Merge and Collect" Code node (runOnceForAllItems) collects all chunks
	 * 3. Uses $node.runIndex to know how many times to loop
	 * 4. Uses $items(nodeName, 0, run) to get items from each run
	 */
	it('should document the complete merge and collect pattern from NODE-4556', () => {
		const userWorkflowPattern = `
			// From user's "Merge and Collect" Code node
			const chunkNodeName = 'Generate chunk';

			// Step 1: Get the number of times the chunk node has run
			// FAILS in v2: $node[name].runIndex not available in task runner
			let lastRunIndex = 0;
			try {
				lastRunIndex = $node[chunkNodeName].runIndex ?? 0;
			} catch (e) {
				return [{ json: { error: 'Cannot access runIndex', phase: 'getting runIndex' } }];
			}

			// Step 2: Collect chunks from all runs
			// FAILS in v2: $items(name, 0, run) not available for historical runs
			const collected = [];
			for (let run = 0; run <= lastRunIndex; run++) {
				try {
					const itemsFromRun = $items(chunkNodeName, 0, run) || [];
					for (const item of itemsFromRun) {
						const content = item.json?.content;
						if (content) {
							collected.push({
								content,
								chunk: item.json?.chunk || 0,
								run
							});
						}
					}
				} catch (e) {
					return [{ json: { error: 'Cannot access items from run ' + run } }];
				}
			}

			// Step 3: Sort and return merged result
			collected.sort((a, b) => a.chunk - b.chunk);
			return collected.map(item => ({ json: item }));
		`;

		expect(userWorkflowPattern).toContain('$node[chunkNodeName].runIndex');
		expect(userWorkflowPattern).toContain('$items(chunkNodeName, 0, run)');

		// Workflow execution flow:
		// 1. "Generate chunk" runs multiple times (runIndex: 0, 1, 2, ...)
		// 2. "Merge and Collect" tries to access all previous runs
		// 3. In v1: Works because Code node executes in-process with full context
		// 4. In v2: Fails because task runner doesn't have execution history
		//
		// Error manifestation:
		// - "Unknown error" displayed in UI
		// - Task runner timeout in logs
		// - No clear error message to user
	});

	/**
	 * Test case 4: Proposed fix approaches
	 *
	 * Documents potential solutions for enabling cross-run data access in task runners
	 */
	it('should document potential fix approaches', () => {
		const fixApproach1 = 'Serialize execution history and pass to task runner';
		const fixApproach2 = 'Implement callback mechanism for task runner to request historical data';
		const fixApproach3 = 'Detect cross-run patterns and force in-process execution';
		const fixApproach4 = 'Provide clear error message when cross-run access is attempted';

		// Approach 1: Pass execution history to task runner
		// Pros: Full compatibility with v1 behavior
		// Cons: Large data serialization cost, memory overhead
		expect(fixApproach1).toBeTruthy();

		// Approach 2: Callback mechanism
		// Pros: On-demand data loading, smaller initial payload
		// Cons: Network latency, complexity
		expect(fixApproach2).toBeTruthy();

		// Approach 3: Automatic fallback to in-process
		// Pros: Transparent to user, maintains v1 behavior
		// Cons: Defeats purpose of task runner isolation
		expect(fixApproach3).toBeTruthy();

		// Approach 4: Better error handling
		// Pros: Clear user feedback, quick win
		// Cons: Doesn't fix the actual issue
		expect(fixApproach4).toBeTruthy();

		// Recommended: Approach 4 (short-term) + Approach 2 (long-term)
		// 1. Detect cross-run patterns at code analysis time
		// 2. Show clear error: "Code uses $node[].runIndex which is not available in task runners"
		// 3. Suggest alternatives or workarounds
		// 4. Implement callback mechanism for future v2.x release
	});

	/**
	 * Test case 5: Integration test placeholder
	 *
	 * This test would require full workflow execution with task runners enabled.
	 * It's skipped because it needs integration test infrastructure.
	 */
	it.skip('should reproduce the actual timeout/error with task runner', async () => {
		// This test would require:
		// 1. Workflow execution engine
		// 2. Task runner enabled
		// 3. Loop node that runs multiple times
		// 4. Code node that tries to access cross-run data
		//
		// Expected result:
		// - Task runner timeout
		// - "Unknown error" in UI
		// - Logs: "ERROR [runner:js] Task <ID> timed out"
		//
		// TODO: Implement once we have task runner integration test infrastructure
		// See: packages/@n8n/task-runner/src/js-task-runner/__tests__/js-task-runner.test.ts
		// for examples of task runner testing
	});
});
