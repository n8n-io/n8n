#!/usr/bin/env node

/**
 * Aggregate benchmark results from JSONL file
 * Usage: node aggregate-benchmarks.js benchmark-results-child-process.jsonl
 */

const fs = require('fs');
const path = require('path');

function formatBytes(bytes) {
	return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function formatMs(ms) {
	return `${ms.toFixed(0)} ms`;
}

function aggregate(filePath) {
	const content = fs.readFileSync(filePath, 'utf-8');
	const lines = content.trim().split('\n').filter(Boolean);

	if (lines.length === 0) {
		console.log('No benchmark data found');
		return;
	}

	const measurements = lines.map(line => JSON.parse(line));

	// Detect benchmark type
	const firstMeasurement = measurements[0];
	const isSynchronous = !('workerMemoryPeak' in firstMeasurement) && !('childMemoryPeak' in firstMeasurement);
	const isWorkerThreads = firstMeasurement && 'workerMemoryPeak' in firstMeasurement;
	const memoryField = isWorkerThreads ? 'workerMemoryPeak' : 'childMemoryPeak';
	const processIdField = isWorkerThreads ? 'workerNumber' : 'processId';
	const reuseField = isWorkerThreads ? 'workerNumber' : 'reuseCount';
	const benchmarkType = isSynchronous ? 'Synchronous (Main Thread)' : isWorkerThreads ? 'Worker Thread' : 'Child Process';

	// Separate cold and warm starts (only relevant for worker/child process)
	const coldStarts = measurements.filter(m => m.isColdStart);
	const warmStarts = measurements.filter(m => !m.isColdStart);

	// Calculate statistics
	function stats(array, field) {
		if (array.length === 0) return { min: 0, max: 0, avg: 0, p50: 0, p95: 0, p99: 0 };

		const values = array.map(m => {
			// Handle nested fields like childMemoryPeak.heapUsed
			if (field.includes('.')) {
				const [parent, child] = field.split('.');
				return m[parent]?.[child] ?? 0;
			}
			return m[field];
		}).sort((a, b) => a - b);

		const sum = values.reduce((a, b) => a + b, 0);
		const avg = sum / values.length;
		const min = values[0];
		const max = values[values.length - 1];
		const p50 = values[Math.floor(values.length * 0.5)];
		const p95 = values[Math.floor(values.length * 0.95)];
		const p99 = values[Math.floor(values.length * 0.99)];

		return { min, max, avg, p50, p95, p99 };
	}

	console.log(`# ${benchmarkType} Benchmark Results\n`);
	console.log(`**Total Executions:** ${measurements.length}`);

	if (!isSynchronous) {
		console.log(`**Cold Starts:** ${coldStarts.length}`);
		console.log(`**Warm Starts:** ${warmStarts.length}\n`);
	} else {
		console.log('');
	}

	// Execution Time
	console.log('## Execution Time\n');

	if (isSynchronous) {
		// For synchronous, all executions are the same
		const allStats = stats(measurements, 'duration');
		console.log('**Execution Time:**');
		console.log(`- Min: ${formatMs(allStats.min)}`);
		console.log(`- Max: ${formatMs(allStats.max)}`);
		console.log(`- Avg: ${formatMs(allStats.avg)}`);
		console.log(`- p50: ${formatMs(allStats.p50)}`);
		console.log(`- p95: ${formatMs(allStats.p95)}`);
		console.log(`- p99: ${formatMs(allStats.p99)}\n`);
	} else {
		if (coldStarts.length > 0) {
			const coldStats = stats(coldStarts, 'duration');
			console.log('**Cold Start (includes process spawn + node loading):**');
			console.log(`- Min: ${formatMs(coldStats.min)}`);
			console.log(`- Max: ${formatMs(coldStats.max)}`);
			console.log(`- Avg: ${formatMs(coldStats.avg)}`);
			console.log(`- p50: ${formatMs(coldStats.p50)}`);
			console.log(`- p95: ${formatMs(coldStats.p95)}`);
			console.log(`- p99: ${formatMs(coldStats.p99)}\n`);
		}

		if (warmStarts.length > 0) {
			const warmStats = stats(warmStarts, 'duration');
			console.log('**Warm Start (reused process):**');
			console.log(`- Min: ${formatMs(warmStats.min)}`);
			console.log(`- Max: ${formatMs(warmStats.max)}`);
			console.log(`- Avg: ${formatMs(warmStats.avg)}`);
			console.log(`- p50: ${formatMs(warmStats.p50)}`);
			console.log(`- p95: ${formatMs(warmStats.p95)}`);
			console.log(`- p99: ${formatMs(warmStats.p99)}\n`);
		}
	}

	// Memory - Main Process
	console.log('## Memory - Main Process\n');

	const memBeforeHeapStats = stats(measurements, 'mainMemoryBefore.heapUsed');
	const memBeforeRssStats = stats(measurements, 'mainMemoryBefore.rss');
	console.log('**Before Execution (Heap):**');
	console.log(`- Min: ${formatBytes(memBeforeHeapStats.min)}`);
	console.log(`- Max: ${formatBytes(memBeforeHeapStats.max)}`);
	console.log(`- Avg: ${formatBytes(memBeforeHeapStats.avg)}`);
	console.log(`- p50: ${formatBytes(memBeforeHeapStats.p50)}\n`);

	console.log('**Before Execution (RSS):**');
	console.log(`- Min: ${formatBytes(memBeforeRssStats.min)}`);
	console.log(`- Max: ${formatBytes(memBeforeRssStats.max)}`);
	console.log(`- Avg: ${formatBytes(memBeforeRssStats.avg)}`);
	console.log(`- p50: ${formatBytes(memBeforeRssStats.p50)}\n`);

	const memAfterHeapStats = stats(measurements, 'mainMemoryAfter.heapUsed');
	const memAfterRssStats = stats(measurements, 'mainMemoryAfter.rss');
	console.log('**After Execution (Heap):**');
	console.log(`- Min: ${formatBytes(memAfterHeapStats.min)}`);
	console.log(`- Max: ${formatBytes(memAfterHeapStats.max)}`);
	console.log(`- Avg: ${formatBytes(memAfterHeapStats.avg)}`);
	console.log(`- p50: ${formatBytes(memAfterHeapStats.p50)}\n`);

	console.log('**After Execution (RSS):**');
	console.log(`- Min: ${formatBytes(memAfterRssStats.min)}`);
	console.log(`- Max: ${formatBytes(memAfterRssStats.max)}`);
	console.log(`- Avg: ${formatBytes(memAfterRssStats.avg)}`);
	console.log(`- p50: ${formatBytes(memAfterRssStats.p50)}\n`);

	// Memory - Worker/Child Process (only for non-synchronous)
	if (!isSynchronous) {
		console.log(`## Memory - ${benchmarkType} Peak\n`);

		const heapUsedStats = stats(measurements, `${memoryField}.heapUsed`);
		console.log('**Heap Used:**');
		console.log(`- Min: ${formatBytes(heapUsedStats.min)}`);
		console.log(`- Max: ${formatBytes(heapUsedStats.max)}`);
		console.log(`- Avg: ${formatBytes(heapUsedStats.avg)}`);
		console.log(`- p50: ${formatBytes(heapUsedStats.p50)}\n`);

		const rssStats = stats(measurements, `${memoryField}.rss`);
		console.log('**RSS (Resident Set Size):**');
		console.log(`- Min: ${formatBytes(rssStats.min)}`);
		console.log(`- Max: ${formatBytes(rssStats.max)}`);
		console.log(`- Avg: ${formatBytes(rssStats.avg)}`);
		console.log(`- p50: ${formatBytes(rssStats.p50)}\n`);
	}

	// Process/Worker Reuse (only for non-synchronous)
	if (!isSynchronous) {
		if (!isWorkerThreads) {
			console.log('## Process Reuse\n');

			const reuseStats = stats(measurements, reuseField);
			console.log('**Reuse Count:**');
			console.log(`- Min: ${reuseStats.min}`);
			console.log(`- Max: ${reuseStats.max}`);
			console.log(`- Avg: ${reuseStats.avg.toFixed(1)}`);
			console.log(`- p50: ${reuseStats.p50}\n`);

			const uniqueProcesses = new Set(measurements.map(m => m[processIdField])).size;
			console.log(`**Unique Processes Used:** ${uniqueProcesses}\n`);
		} else {
			const uniqueWorkers = new Set(measurements.map(m => m[processIdField])).size;
			console.log(`## Worker Info\n`);
			console.log(`**Total Executions Processed:** ${uniqueWorkers}\n`);
		}
	}

	// Detailed breakdown
	console.log('## Raw Data Summary\n');
	console.log('```');

	// Helper to convert bytes object to MB
	function statsToMB(statsObj) {
		return {
			min: parseFloat((statsObj.min / 1024 / 1024).toFixed(2)),
			max: parseFloat((statsObj.max / 1024 / 1024).toFixed(2)),
			avg: parseFloat((statsObj.avg / 1024 / 1024).toFixed(2)),
			p50: parseFloat((statsObj.p50 / 1024 / 1024).toFixed(2)),
			p95: parseFloat((statsObj.p95 / 1024 / 1024).toFixed(2)),
			p99: parseFloat((statsObj.p99 / 1024 / 1024).toFixed(2)),
		};
	}

	const rawData = {
		totalExecutions: measurements.length,
		timing: isSynchronous
			? stats(measurements, 'duration')
			: {
				cold: coldStarts.length > 0 ? stats(coldStarts, 'duration') : null,
				warm: warmStarts.length > 0 ? stats(warmStarts, 'duration') : null,
			},
		memory: {
			mainBeforeHeap: statsToMB(stats(measurements, 'mainMemoryBefore.heapUsed')),
			mainBeforeRss: statsToMB(stats(measurements, 'mainMemoryBefore.rss')),
			mainAfterHeap: statsToMB(stats(measurements, 'mainMemoryAfter.heapUsed')),
			mainAfterRss: statsToMB(stats(measurements, 'mainMemoryAfter.rss')),
		},
	};

	if (!isSynchronous) {
		rawData.coldStarts = coldStarts.length;
		rawData.warmStarts = warmStarts.length;
		rawData.memory.workerHeapUsed = statsToMB(stats(measurements, `${memoryField}.heapUsed`));
		rawData.memory.workerRss = statsToMB(stats(measurements, `${memoryField}.rss`));

		if (!isWorkerThreads) {
			rawData.uniqueProcesses = new Set(measurements.map(m => m[processIdField])).size;
			rawData.processReuse = stats(measurements, reuseField);
		}
	}

	console.log(JSON.stringify(rawData, null, 2));
	console.log('```');
}

// Main
const args = process.argv.slice(2);
const filePath = args[0] || 'benchmark-results-child-process.jsonl';

if (!fs.existsSync(filePath)) {
	console.error(`Error: File not found: ${filePath}`);
	console.error('Usage: node aggregate-benchmarks.js <jsonl-file>');
	process.exit(1);
}

aggregate(filePath);
