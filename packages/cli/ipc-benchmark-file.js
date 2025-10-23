const { fork } = require('child_process');
const { resolve } = require('path');
const fs = require('fs');
const path = require('path');
const os = require('os');

const kb = 1024;
const mb = kb * kb;

// Create 200MB string
function create200MBString() {
	const chunkSize = 10 * mb; // 10MB chunks to avoid allocation issues
	let str = '';
	const chunk = 'x'.repeat(chunkSize);
	for (let i = 0; i < 20; i++) {
		str += chunk;
	}
	return str;
}

// Create object that serializes to ~200MB JSON
function create200MBObject() {
	// Each object is roughly 100 bytes when stringified
	// So we need about 2 million objects
	const items = [];
	for (let i = 0; i < 2000000; i++) {
		items.push({
			id: i,
			name: `item-${i}`,
			value: Math.random(),
			timestamp: Date.now(),
		});
	}
	return { items };
}

async function benchmarkFileTransfer() {
	const runs = 10;
	const stringTimings = [];
	const objectTimings = [];

	console.log('Creating 200MB string...');
	const testString = create200MBString();
	console.log(`String size: ${(testString.length / mb).toFixed(2)} MB`);

	console.log('\nCreating 200MB object...');
	const testObject = create200MBObject();
	const objectJson = JSON.stringify(testObject);
	console.log(`Object JSON size: ${(objectJson.length / mb).toFixed(2)} MB`);

	// Fork child process
	const child = fork(resolve(__dirname, 'ipc-benchmark-file-worker.js'));

	// Helper to send message and wait for response
	function sendAndWait(payload) {
		return new Promise((resolve, reject) => {
			const timeout = setTimeout(() => reject(new Error('Timeout')), 60000);

			child.once('message', (response) => {
				clearTimeout(timeout);
				resolve(response);
			});

			child.send(payload);
		});
	}

	console.log(`\n=== Running ${runs} string transfer tests (via file) ===`);
	for (let i = 0; i < runs; i++) {
		const start = Date.now();

		// Write to temp file
		const tmpFile = path.join(os.tmpdir(), `ipc-bench-${Date.now()}-${i}.txt`);
		fs.writeFileSync(tmpFile, testString);

		// Send file path to child
		await sendAndWait({ type: 'string', filePath: tmpFile });

		// Cleanup
		fs.unlinkSync(tmpFile);

		const duration = Date.now() - start;
		stringTimings.push(duration);
		console.log(`Run ${i + 1}: ${duration}ms`);
	}

	console.log(`\n=== Running ${runs} object transfer tests (via file) ===`);
	for (let i = 0; i < runs; i++) {
		const start = Date.now();

		// Write to temp file
		const tmpFile = path.join(os.tmpdir(), `ipc-bench-${Date.now()}-${i}.json`);
		fs.writeFileSync(tmpFile, objectJson);

		// Send file path to child
		await sendAndWait({ type: 'object', filePath: tmpFile });

		// Cleanup
		fs.unlinkSync(tmpFile);

		const duration = Date.now() - start;
		objectTimings.push(duration);
		console.log(`Run ${i + 1}: ${duration}ms`);
	}

	// Calculate statistics
	function stats(timings) {
		const sorted = [...timings].sort((a, b) => a - b);
		return {
			min: sorted[0],
			max: sorted[sorted.length - 1],
			avg: Math.round(timings.reduce((a, b) => a + b, 0) / timings.length),
			p50: sorted[Math.floor(sorted.length * 0.5)],
			p95: sorted[Math.floor(sorted.length * 0.95)],
			p99: sorted[Math.floor(sorted.length * 0.99)],
		};
	}

	const stringStats = stats(stringTimings);
	const objectStats = stats(objectTimings);

	console.log('\n=== Results (File Transfer) ===\n');
	console.log('String Transfer (200MB):');
	console.log(`  Min: ${stringStats.min}ms`);
	console.log(`  Max: ${stringStats.max}ms`);
	console.log(`  Avg: ${stringStats.avg}ms`);
	console.log(`  p50: ${stringStats.p50}ms`);
	console.log(`  p95: ${stringStats.p95}ms`);
	console.log(`  p99: ${stringStats.p99}ms`);

	console.log('\nObject Transfer (~200MB JSON):');
	console.log(`  Min: ${objectStats.min}ms`);
	console.log(`  Max: ${objectStats.max}ms`);
	console.log(`  Avg: ${objectStats.avg}ms`);
	console.log(`  p50: ${objectStats.p50}ms`);
	console.log(`  p95: ${objectStats.p95}ms`);
	console.log(`  p99: ${objectStats.p99}ms`);

	console.log('\nOverhead (Object vs String):');
	console.log(`  Avg overhead: ${objectStats.avg - stringStats.avg}ms`);
	console.log(
		`  Overhead %: ${(((objectStats.avg - stringStats.avg) / stringStats.avg) * 100).toFixed(1)}%`,
	);

	child.kill();
	process.exit(0);
}

benchmarkFileTransfer().catch((err) => {
	console.error('Benchmark failed:', err);
	process.exit(1);
});
