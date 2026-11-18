// Loads the demo of the page module into a local n8n instance.
// It creates a credential, a data table, the workflows and the pages in the personal project of the user.
// A resource whose name already exists is kept, so a second run adds nothing.

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEMO_DIR = dirname(fileURLToPath(import.meta.url));
const BASE_URL = process.env.N8N_BASE_URL ?? 'http://localhost:5678';
const REST_URL = `${BASE_URL}/rest`;
const DEMO_CREDENTIAL_DATA = { name: 'X-Api-Key', value: 'demo-value' };

const readJson = (path) => JSON.parse(readFileSync(join(DEMO_DIR, path), 'utf8'));
const readText = (path) => readFileSync(join(DEMO_DIR, path), 'utf8');

/** Returns the value of a required environment variable. Stops the script when it is not set. */
function requireEnv(name) {
	const value = process.env[name];
	if (!value) {
		console.error(`Set ${name} before you run this script.`);
		process.exit(1);
	}
	return value;
}

/** Signs in and returns a function that calls the REST API as that user and returns the `data` of the answer. */
async function createApi(email, password) {
	const login = await fetch(`${REST_URL}/login`, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ emailOrLdapLoginId: email, password }),
	});
	if (!login.ok) {
		throw new Error(`Login failed with status ${login.status}`);
	}
	const cookie = login.headers
		.getSetCookie()
		.map((entry) => entry.split(';')[0])
		.join('; ');
	const headers = { cookie, 'content-type': 'application/json', 'browser-id': 'page-demo' };

	return async (method, path, body) => {
		const response = await fetch(`${REST_URL}${path}`, {
			method,
			headers,
			body: body ? JSON.stringify(body) : undefined,
		});
		if (!response.ok) {
			throw new Error(
				`${method} ${path} failed with status ${response.status}: ${await response.text()}`,
			);
		}
		return (await response.json()).data;
	};
}

/** Replaces each source id in the text with the id of its copy in the target instance. */
function remapIds(text, idMap) {
	return Object.entries(idMap).reduce((result, [from, to]) => result.replaceAll(from, to), text);
}

/** Returns the item with this name, or creates it. The result always has an `id`. */
async function findOrCreate(existing, name, create) {
	const found = existing.find((item) => (item.name ?? item.title) === name);
	if (found) {
		console.log(`kept     ${name}`);
		return found;
	}
	const created = await create();
	console.log(`created  ${name}`);
	return created;
}

async function seedCredential(api, projectId, credential) {
	return await findOrCreate(
		await api('GET', '/credentials'),
		credential.name,
		async () =>
			await api('POST', '/credentials', {
				name: credential.name,
				type: credential.type,
				data: DEMO_CREDENTIAL_DATA,
				projectId,
			}),
	);
}

async function seedDataTable(api, projectId, dataTable) {
	const existing = await api('GET', `/projects/${projectId}/data-tables`);
	return await findOrCreate(
		existing.data,
		dataTable.name,
		async () =>
			await api('POST', `/projects/${projectId}/data-tables`, {
				name: dataTable.name,
				columns: dataTable.columns,
			}),
	);
}

/** Creates the pages without content, because the content needs the ids of the workflows. */
async function seedEmptyPages(api, projectId, pages) {
	const existing = await api('GET', `/projects/${projectId}/pages`);
	const targets = [];
	for (const page of pages) {
		targets.push(
			await findOrCreate(
				existing,
				page.title,
				async () => await api('POST', `/projects/${projectId}/pages`, { title: page.title }),
			),
		);
	}
	return targets;
}

async function seedWorkflows(api, projectId, idMap) {
	const existing = await api('GET', '/workflows');
	const files = readdirSync(join(DEMO_DIR, 'workflows')).filter((file) => file.endsWith('.json'));
	const workflowIdMap = {};
	for (const file of files) {
		const source = readJson(join('workflows', file));
		const { id: sourceId, ...workflow } = JSON.parse(remapIds(JSON.stringify(source), idMap));
		const target = await findOrCreate(
			existing,
			source.name,
			async () => await api('POST', '/workflows', { ...workflow, projectId }),
		);
		workflowIdMap[sourceId] = target.id;
	}
	return workflowIdMap;
}

async function writePageContent(api, projectId, pages, targets, idMap) {
	for (const [index, page] of pages.entries()) {
		const current = await api('GET', `/projects/${projectId}/pages/${targets[index].id}`);
		await api('PATCH', `/projects/${projectId}/pages/${current.id}`, {
			content: remapIds(readText(join('pages', page.file)), idMap),
			baseVersion: current.version,
		});
		console.log(`written  ${page.title}`);
	}
}

const mapIds = (sources, targets) =>
	Object.fromEntries(sources.map((source, index) => [source.id, targets[index].id]));

async function main() {
	const api = await createApi(requireEnv('N8N_EMAIL'), requireEnv('N8N_PASSWORD'));
	const manifest = readJson('manifest.json');
	const project = await api('GET', '/projects/personal');

	const credential = await seedCredential(api, project.id, manifest.credential);
	const dataTable = await seedDataTable(api, project.id, manifest.dataTable);
	const pages = await seedEmptyPages(api, project.id, manifest.pages);

	const resourceIdMap = {
		[manifest.projectId]: project.id,
		[manifest.credential.id]: credential.id,
		[manifest.dataTable.id]: dataTable.id,
		...mapIds(manifest.pages, pages),
	};
	const workflowIdMap = await seedWorkflows(api, project.id, resourceIdMap);
	await writePageContent(api, project.id, manifest.pages, pages, {
		...resourceIdMap,
		...workflowIdMap,
	});

	console.log(`\nDone. Open ${BASE_URL}/page/${pages[0].id}`);
}

await main();
