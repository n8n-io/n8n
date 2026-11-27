#!/usr/bin/env node
// Sends the corpus to one running n8n instance and writes a JSON result file.
// Usage: node run.mjs <baseUrl|port> <outFile>
// For an instance that already has an owner, set PARITY_API_KEY (and
// PARITY_PROJECT_ID if needed) to skip owner and API key setup.

import { writeFileSync } from 'node:fs';

import { bodyCases, minimalWorkflow } from './corpus.mjs';

const [target, outFile] = process.argv.slice(2);
if (!target || !outFile) {
	console.error('Usage: node run.mjs <baseUrl|port> <outFile>');
	process.exit(2);
}
const base = /^\d+$/.test(target) ? `http://localhost:${target}` : target.replace(/\/$/, '');

const OWNER = {
	email: 'test@example.com',
	firstName: 'Test',
	lastName: 'User',
	password: 'TestPassword123',
};

async function setup() {
	if (process.env.PARITY_API_KEY) {
		if (!process.env.PARITY_PROJECT_ID) {
			console.warn(
				'PARITY_PROJECT_ID is not set: cases that send a projectId will differ from a run that has one.',
			);
		}
		return { apiKey: process.env.PARITY_API_KEY, projectId: process.env.PARITY_PROJECT_ID ?? '' };
	}

	const res = await fetch(`${base}/rest/owner/setup`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(OWNER),
	});
	if (!res.ok) throw new Error(`owner setup failed: ${res.status} ${await res.text()}`);
	const cookie = res.headers.get('set-cookie')?.split(';')[0];

	const keyRes = await fetch(`${base}/rest/api-keys`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', cookie },
		body: JSON.stringify({
			label: 'parity',
			scopes: [
				'workflow:create',
				'workflow:read',
				'workflow:update',
				'workflow:delete',
				'workflow:list',
			],
			expiresAt: null,
		}),
	});
	const keyBody = await keyRes.json();
	const apiKey = keyBody?.data?.rawApiKey;
	if (!apiKey) throw new Error(`api key failed: ${keyRes.status} ${JSON.stringify(keyBody)}`);

	const projRes = await fetch(`${base}/rest/projects/my-projects`, { headers: { cookie } });
	const projects = await projRes.json();
	const personal = projects?.data?.find((p) => p.type === 'personal') ?? projects?.data?.[0];

	const projectId = personal?.id ?? personal?.project?.id;
	if (!projectId) throw new Error(`personal project not found: ${projRes.status}`);

	return { apiKey, projectId };
}

async function api(apiKey, method, path, body) {
	const init = { method, headers: { 'X-N8N-API-KEY': apiKey } };
	if (body !== undefined) {
		init.headers['Content-Type'] = 'application/json';
		init.body = JSON.stringify(body);
	}
	const res = await fetch(`${base}${path}`, init);
	const text = await res.text();
	let parsed;
	try {
		parsed = JSON.parse(text);
	} catch {
		parsed = text;
	}
	return { status: res.status, body: parsed };
}

function substituteProjectId(value, projectId) {
	return JSON.parse(JSON.stringify(value ?? null).replaceAll('REPLACE_PROJECT_ID', projectId));
}

async function main() {
	const { apiKey, projectId } = await setup();
	const results = {};
	const createdIds = [];
	const track = (response) => {
		const id = response.body?.id;
		if (response.status >= 200 && response.status < 300 && typeof id === 'string')
			createdIds.push(id);
		return id;
	};

	try {
		// POST
		for (const testCase of bodyCases) {
			const body = substituteProjectId(testCase.body, projectId);
			const response = await api(apiKey, 'POST', '/api/v1/workflows', body);
			track(response);
			results[`POST:${testCase.name}`] = response;
		}

		// If the valid case fails, both sides can fail the same way and the diff passes falsely.
		const baseline = results['POST:minimal'];
		if (baseline.status < 200 || baseline.status >= 300) {
			throw new Error(
				`baseline create failed, results are not comparable: ${baseline.status} ${JSON.stringify(baseline.body)}`,
			);
		}

		// PUT — each case needs its own fresh workflow so ordering cannot leak state.
		for (const testCase of bodyCases) {
			const created = await api(apiKey, 'POST', '/api/v1/workflows', minimalWorkflow);
			const id = track(created);
			if (!id) {
				throw new Error(
					`PUT setup failed for ${testCase.name}, results are not comparable: ${created.status} ${JSON.stringify(created.body)}`,
				);
			}
			const body = substituteProjectId(testCase.body, projectId);
			results[`PUT:${testCase.name}`] = await api(apiKey, 'PUT', `/api/v1/workflows/${id}`, body);
		}

		// DELETE
		{
			const created = await api(apiKey, 'POST', '/api/v1/workflows', minimalWorkflow);
			results['DELETE:existing'] = await api(
				apiKey,
				'DELETE',
				`/api/v1/workflows/${created.body?.id}`,
			);
			results['DELETE:again'] = await api(
				apiKey,
				'DELETE',
				`/api/v1/workflows/${created.body?.id}`,
			);
		}
		results['DELETE:unknown-id'] = await api(apiKey, 'DELETE', '/api/v1/workflows/doesnotexist1');
		results['PUT:unknown-id'] = await api(
			apiKey,
			'PUT',
			'/api/v1/workflows/doesnotexist1',
			minimalWorkflow,
		);
		results['GET:unknown-id'] = await api(apiKey, 'GET', '/api/v1/workflows/doesnotexist1');

		writeFileSync(outFile, JSON.stringify(results, null, 2));
		console.log(`wrote ${Object.keys(results).length} results to ${outFile}`);
	} finally {
		// A shared instance, such as a Nathan preview, must not keep the test workflows.
		const failed = [];
		for (const id of createdIds) {
			const response = await api(apiKey, 'DELETE', `/api/v1/workflows/${id}`);
			if (response.status < 200 || response.status >= 300) failed.push(`${id}: ${response.status}`);
		}
		console.log(`deleted ${createdIds.length - failed.length} test workflows`);
		if (failed.length) console.warn(`not deleted: ${failed.join(', ')}`);
	}
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
