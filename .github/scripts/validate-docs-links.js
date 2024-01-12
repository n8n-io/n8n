#!/usr/bin/env node

const packages = ['nodes-base', '@n8n/nodes-langchain'];
const concurrency = 20;
let exitCode = 0;

const debug = require('debug')('n8n');
const path = require('path');
const https = require('https');
const glob = require('glob');
const pLimit = require('p-limit');
const Lookup = require('cacheable-lookup').default;

const agent = new https.Agent({ keepAlive: true, keepAliveMsecs: 5000 });
new Lookup().install(agent);
const limiter = pLimit(concurrency);

const validateUrl = async (kind, name, documentationUrl) =>
	new Promise((resolve, reject) => {
		if (!documentationUrl) resolve([name, null]);
		const url = new URL(
			/^https?:\/\//.test(documentationUrl)
				? documentationUrl
				: `https://docs.n8n.io/integrations/builtin/${kind}/${documentationUrl.toLowerCase()}/`,
		);
		https
			.request(
				{
					hostname: url.hostname,
					port: 443,
					path: url.pathname,
					method: 'HEAD',
					agent,
				},
				(res) => {
					debug('✓', kind, name);
					resolve([name, res.statusCode]);
				},
			)
			.on('error', (e) => reject(e))
			.end();
	});

const checkLinks = async (baseDir, kind) => {
	let types = require(path.join(baseDir, `dist/types/${kind}.json`));
	if (kind === 'nodes')
		types = types.filter(({ codex }) => !!codex?.resources?.primaryDocumentation);
	debug(kind, types.length);

	const statuses = await Promise.all(
		types.map((type) =>
			limiter(() => {
				const documentationUrl =
					kind === 'credentials'
						? type.documentationUrl
						: type.codex?.resources?.primaryDocumentation?.[0]?.url;
				return validateUrl(kind, type.displayName, documentationUrl);
			}),
		),
	);

	const missingDocs = [];
	const invalidUrls = [];
	for (const [name, statusCode] of statuses) {
		if (statusCode === null) missingDocs.push(name);
		if (statusCode !== 200) invalidUrls.push(name);
	}

	if (missingDocs.length) console.log('Documentation URL missing for %s', kind, missingDocs);
	if (invalidUrls.length) console.log('Documentation URL invalid for %s', kind, invalidUrls);
	if (missingDocs.length || invalidUrls.length) exitCode = 1;
};

(async () => {
	for (const packageName of packages) {
		const baseDir = path.resolve(__dirname, '../../packages', packageName);
		await Promise.all([checkLinks(baseDir, 'credentials'), checkLinks(baseDir, 'nodes')]);
		if (exitCode !== 0) process.exit(exitCode);
	}
})();
