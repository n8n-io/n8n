import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';

import buildTrivyBlocks from './build-trivy-blocks.mjs';

const ENV = {
	GITHUB_REPOSITORY: 'n8n-io/n8n',
	GITHUB_SERVER_URL: 'https://github.com',
	GITHUB_RUN_ID: '1',
};

function build(report) {
	const dir = mkdtempSync(join(tmpdir(), 'trivy-blocks-'));
	const path = join(dir, 'trivy-results.json');
	writeFileSync(path, JSON.stringify(report));
	return buildTrivyBlocks({
		results: path,
		imageRef: 'ghcr.io/n8n-io/n8n:nightly',
		env: ENV,
	});
}

test('counts vulnerabilities by severity', () => {
	const blocks = build({
		Results: [{
			Vulnerabilities: [
				{ VulnerabilityID: 'CVE-1', Severity: 'CRITICAL', PkgName: 'a', InstalledVersion: '1' },
				{ VulnerabilityID: 'CVE-2', Severity: 'HIGH', PkgName: 'b', InstalledVersion: '2' },
				{ VulnerabilityID: 'CVE-3', Severity: 'HIGH', PkgName: 'c', InstalledVersion: '3' },
				{ VulnerabilityID: 'CVE-4', Severity: 'MEDIUM', PkgName: 'd', InstalledVersion: '4' },
				{ VulnerabilityID: 'CVE-5', Severity: 'LOW', PkgName: 'e', InstalledVersion: '5' },
			],
		}],
	});
	const counts = blocks.find((b) => b.type === 'section' && b.fields);
	const fields = Object.fromEntries(
		counts.fields.map((f) => f.text.split('\n')).map(([k, v]) => [k, v]),
	);
	assert.equal(fields['*Critical:*'], ':red_circle: 1');
	assert.equal(fields['*High:*'], ':large_orange_circle: 2');
	assert.equal(fields['*Medium:*'], ':large_yellow_circle: 1');
	assert.equal(fields['*Low:*'], ':large_green_circle: 1');
});

test('dedupes vulnerabilities by CVE id', () => {
	const blocks = build({
		Results: [{
			Vulnerabilities: [
				{ VulnerabilityID: 'CVE-1', Severity: 'HIGH', PkgName: 'a', InstalledVersion: '1' },
				{ VulnerabilityID: 'CVE-1', Severity: 'HIGH', PkgName: 'a', InstalledVersion: '1' },
				{ VulnerabilityID: 'CVE-2', Severity: 'HIGH', PkgName: 'b', InstalledVersion: '2' },
			],
		}],
	});
	const ctx = blocks.find((b) => b.type === 'context');
	assert.match(ctx.elements[0].text, /2 unique CVEs/);
});

test('sorts by severity then CVSS', () => {
	const blocks = build({
		Results: [{
			Vulnerabilities: [
				{ VulnerabilityID: 'CVE-LOW-1', Severity: 'LOW', PkgName: 'a', InstalledVersion: '1' },
				{ VulnerabilityID: 'CVE-HIGH-LOWCVSS', Severity: 'HIGH', PkgName: 'b', InstalledVersion: '2', CVSS: { nvd: { V3Score: 5 } } },
				{ VulnerabilityID: 'CVE-HIGH-HIGHCVSS', Severity: 'HIGH', PkgName: 'c', InstalledVersion: '3', CVSS: { nvd: { V3Score: 9 } } },
				{ VulnerabilityID: 'CVE-CRIT-1', Severity: 'CRITICAL', PkgName: 'd', InstalledVersion: '4' },
			],
		}],
	});
	const cveSections = blocks.filter((b) => b.type === 'section' && b.text?.type === 'mrkdwn');
	const ids = cveSections.map((b) => b.text.text.match(/CVE-[A-Z0-9-]+/)?.[0]);
	assert.deepEqual(ids, ['CVE-CRIT-1', 'CVE-HIGH-HIGHCVSS', 'CVE-HIGH-LOWCVSS', 'CVE-LOW-1']);
});

test('caps CVE detail blocks at 8', () => {
	const vulns = Array.from({ length: 20 }, (_, i) => ({
		VulnerabilityID: `CVE-${i}`,
		Severity: 'HIGH',
		PkgName: `p${i}`,
		InstalledVersion: '1',
	}));
	const blocks = build({ Results: [{ Vulnerabilities: vulns }] });
	const cveSections = blocks.filter((b) => b.type === 'section' && b.text?.type === 'mrkdwn');
	assert.equal(cveSections.length, 8);
});

test('emits view-report button with run url from GH env', () => {
	const blocks = build({ Results: [{ Vulnerabilities: [
		{ VulnerabilityID: 'CVE-1', Severity: 'HIGH', PkgName: 'a', InstalledVersion: '1' },
	] }] });
	const actions = blocks.find((b) => b.type === 'actions');
	assert.equal(actions.elements[0].url, 'https://github.com/n8n-io/n8n/actions/runs/1');
});
