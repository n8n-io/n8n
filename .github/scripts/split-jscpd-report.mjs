#!/usr/bin/env node
// Splits a jscpd JSON report's `duplicates` array into N bucket files so a
// caller can download and sample one small file instead of the whole report
// (which can run into tens of MB on a large monorepo). Round-robin, not
// contiguous chunks, so a run of similarly-sized clusters in scan order
// doesn't pile up in one bucket.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

export function splitDuplicates(duplicates, bucketCount) {
	const buckets = Array.from({ length: bucketCount }, () => []);
	duplicates.forEach((dup, i) => buckets[i % bucketCount].push(dup));
	return buckets;
}

export function writeBuckets(buckets, outputDir, deps = {}) {
	const mkdirImpl = deps.mkdir ?? mkdirSync;
	const writeImpl = deps.write ?? writeFileSync;
	mkdirImpl(outputDir, { recursive: true });
	return buckets.map((duplicates, i) => {
		const path = join(outputDir, `bucket-${i}.json`);
		writeImpl(path, JSON.stringify({ duplicates }));
		return path;
	});
}

// Exits non-zero on any failure. The workflow step already runs with
// continue-on-error, so this can't fail the job — it only stops a broken
// split (zero buckets written) from reporting success.
function main() {
	const reportPath = process.env.REPORT_PATH;
	const outputDir = process.env.OUTPUT_DIR;
	const bucketCount = Number(process.env.BUCKET_COUNT ?? 20);
	if (!reportPath || !outputDir) {
		process.stderr.write('split-jscpd-report: REPORT_PATH and OUTPUT_DIR are required\n');
		process.exit(1);
	}
	try {
		const report = JSON.parse(readFileSync(reportPath, 'utf8'));
		if (!Array.isArray(report.duplicates)) {
			throw new Error('report.duplicates must be an array');
		}
		const buckets = splitDuplicates(report.duplicates, bucketCount);
		writeBuckets(buckets, outputDir);
	} catch (err) {
		process.stderr.write(`split-jscpd-report: ${err.message}\n`);
		process.exit(1);
	}
}

if (import.meta.url === `file://${process.argv[1]}`) {
	main();
}
