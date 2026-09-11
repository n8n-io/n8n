import type { INodeTypeDescription } from 'n8n-workflow';
import { jsonParse } from 'n8n-workflow';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * A node's `credentials[].name` is never checked against the credentials n8n
 * actually loads. When it does not resolve, the node still loads and shows up in
 * the UI, `supportsProxyAuth` logs "Unknown credential name" on every boot, the
 * node gets no Custom API Call option, and it cannot authenticate.
 *
 * Two unremarkable PRs are enough to ship that state: one adds the node that
 * references the credential, the other registers the credential in
 * `package.json`, and a release can be cut in between.
 *
 * Cross-package references are legitimate (nodes-base's Mistral AI node uses
 * `mistralCloudApi` from nodes-langchain), so the check is over the union of the
 * packages n8n loads, matching `LoadNodesAndCredentials`.
 */

// `dist/**` is generated, so this needs a built repo (as node tests do anyway).
const PACKAGE_DIRS = ['../../../nodes-base', '../../../@n8n/nodes-langchain'].map((dir) =>
	path.resolve(__dirname, dir),
);

const readGenerated = <T>(packageDir: string, file: string): T =>
	jsonParse<T>(readFileSync(path.join(packageDir, 'dist', file), 'utf8'));

test('every credential a node references is registered by a loaded package', () => {
	const registered = new Set(
		PACKAGE_DIRS.flatMap((dir) =>
			Object.keys(readGenerated<Record<string, unknown>>(dir, 'known/credentials.json')),
		),
	);

	const unresolved = PACKAGE_DIRS.flatMap((dir) =>
		readGenerated<INodeTypeDescription[]>(dir, 'types/nodes.json').flatMap((node) =>
			(node.credentials ?? [])
				.filter(({ name }) => !registered.has(name))
				.map(({ name }) => `${node.name} -> ${name}`),
		),
	);

	expect(unresolved).toEqual([]);
});
