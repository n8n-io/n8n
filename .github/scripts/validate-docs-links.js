#!/usr/bin/env node

const packages = ['nodes-base', '@n8n/nodes-langchain'];
const concurrency = 20;
let exitCode = 0;

const debug = require('debug')('n8n');
const path = require('path');
const https = require('https');
const glob = require('glob');
const pLimit = require('p-limit');
const picocolors = require('picocolors');
const Lookup = require('cacheable-lookup').default;

const agent = new https.Agent({ keepAlive: true, keepAliveMsecs: 5000 });
new Lookup().install(agent);
const limiter = pLimit(concurrency);

const validateUrl = async (packageName, kind, type) =>
	new Promise((resolve, reject) => {
		const name = type.displayName;
		const documentationUrl =
			kind === 'credentials'
				? type.documentationUrl
				: type.codex?.resources?.primaryDocumentation?.[0]?.url;
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
					debug(picocolors.green('✓'), packageName, kind, name);
					resolve([name, res.statusCode]);
				},
			)
			.on('error', (e) => {
				debug(picocolors.red('✘'), packageName, kind, name);
				reject(e);
			})
			.end();
	});

const checkLinks = async (packageName, kind) => {
	const baseDir = path.resolve(__dirname, '../../packages', packageName);
	let types = require(path.join(baseDir, `dist/types/${kind}.json`));
	if (kind === 'nodes')
		types = types.filter(
			({ codex, hidden }) => !!codex?.resources?.primaryDocumentation && !hidden,
		);
	debug(packageName, kind, types.length);

	const statuses = await Promise.all(
		types.map((type) =>
			limiter(() => {
				return validateUrl(packageName, kind, type);
			}),
		),
	);

	const missingDocs = [];
	const invalidUrls = [];
	for (const [name, statusCode] of statuses) {
		if (statusCode === null) missingDocs.push(name);
		if (statusCode !== 200) invalidUrls.push(name);
	}

	if (missingDocs.length)
		console.log('Documentation URL missing in %s for %s', packageName, kind, missingDocs);
	if (invalidUrls.length)
		console.log('Documentation URL invalid in %s for %s', packageName, kind, invalidUrls);
	if (missingDocs.length || invalidUrls.length) exitCode = 1;
};

(async () => {
	for (const packageName of packages) {
		await Promise.all([checkLinks(packageName, 'credentials'), checkLinks(packageName, 'nodes')]);
		if (exitCode !== 0) process.exit(exitCode);
	}
})();
