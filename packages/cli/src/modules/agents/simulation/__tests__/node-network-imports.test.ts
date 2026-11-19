import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';

import { nodeSimulationGap } from '../non-http-node-types';

/**
 * A test run lets first-party nodes run because they reach services through the n8n HTTP
 * helpers, which the simulator answers. This test keeps that true: it reads every import in
 * `n8n-nodes-base`, and fails when a node imports a network client without being blocked, or
 * imports a module nobody has classified yet.
 */

const NODES_DIR = join(dirname(require.resolve('n8n-nodes-base/package.json')), 'nodes');

/** Modules that open a connection outside the n8n HTTP helpers. */
const NETWORK_MODULES = [
	'@confluentinc/kafka-javascript',
	'@kafkajs/confluent-schema-registry',
	'@n8n/backend-network',
	'@n8n/imap',
	'amqplib',
	'child_process',
	'eventsource',
	'http',
	'https',
	'kafkajs',
	'ldapts',
	'mongodb',
	'mqtt',
	'mqtt-packet',
	'mssql',
	'mysql2',
	'net',
	'node-ssh',
	'node:child_process',
	'node:dgram',
	'node:http',
	'node:https',
	'node:net',
	'node:tls',
	'nodemailer',
	'oracledb',
	'pg-promise',
	'promise-ftp',
	'redis',
	'rhea',
	'rss-parser',
	'simple-git',
	'snowflake-sdk',
	'ssh2-sftp-client',
	'tls',
];

/** Imports of a network module that open no connection. */
const HARMLESS_SPECIFIERS = new Set([
	'nodemailer/lib/mail-composer',
	'nodemailer/lib/addressparser',
]);

/**
 * Every node folder that imports a network module, and the node types there that a test run
 * must block. An empty list needs a reason.
 */
const REVIEWED_FOLDERS: Record<string, { blocked: string[]; reason?: string }> = {
	Amqp: { blocked: ['n8n-nodes-base.amqp'] },
	CrateDb: { blocked: ['n8n-nodes-base.crateDb'] },
	Databricks: { blocked: [], reason: 'imports only an error helper' },
	EmailReadImap: { blocked: ['n8n-nodes-base.emailReadImap'] },
	EmailSend: { blocked: ['n8n-nodes-base.emailSend'] },
	ExecuteCommand: { blocked: ['n8n-nodes-base.executeCommand'] },
	Ftp: { blocked: ['n8n-nodes-base.ftp'] },
	Git: { blocked: ['n8n-nodes-base.git'] },
	HttpRequest: { blocked: [], reason: 'TLS options for a request the HTTP helpers send' },
	Kafka: { blocked: ['n8n-nodes-base.kafka'] },
	Ldap: { blocked: ['n8n-nodes-base.ldap'] },
	MongoDb: { blocked: ['n8n-nodes-base.mongoDb'] },
	MQTT: { blocked: ['n8n-nodes-base.mqtt'] },
	'Microsoft/OneDrive': { blocked: [], reason: 'type import only' },
	'Microsoft/SharePoint': { blocked: [], reason: 'imports only an error helper' },
	'Microsoft/Sql': { blocked: ['n8n-nodes-base.microsoftSql'] },
	MySql: { blocked: ['n8n-nodes-base.mySql'] },
	Oracle: { blocked: ['n8n-nodes-base.oracleDatabase'] },
	Postgres: { blocked: ['n8n-nodes-base.postgres'] },
	QuestDb: { blocked: ['n8n-nodes-base.questDb'] },
	RabbitMQ: { blocked: ['n8n-nodes-base.rabbitmq'] },
	Redis: { blocked: ['n8n-nodes-base.redis'] },
	RssFeedRead: { blocked: ['n8n-nodes-base.rssFeedRead'] },
	Snowflake: { blocked: ['n8n-nodes-base.snowflake'] },
	Ssh: { blocked: ['n8n-nodes-base.ssh'] },
	SseTrigger: { blocked: [], reason: 'trigger, never a tool' },
	TimescaleDb: { blocked: ['n8n-nodes-base.timescaleDb'] },
	Webhook: { blocked: [], reason: 'trigger, never a tool' },
};

/** External modules that open no connection: parsing, formatting, crypto, local files. */
const LOCAL_MODULES = new Set([
	'@e965/xlsx',
	'@langchain/core',
	'@mozilla/readability',
	'@n8n/config',
	'@n8n/di',
	'@n8n/errors',
	'@n8n/utils',
	'@napi-rs/canvas',
	'@napi-rs/image',
	'aws4',
	'basic-auth',
	'buffer',
	'change-case',
	'cheerio',
	'chokidar',
	'cron',
	'crypto',
	'csv-parse',
	'currency-codes',
	'events',
	'express',
	'fast-glob',
	'fastest-levenshtein',
	'fflate',
	'form-data',
	'fs',
	'get-system-fonts',
	'gm',
	'html-to-text',
	'iconv-lite',
	'ics',
	'isbot',
	'iso-639-1',
	'isolated-vm',
	'js-nacl',
	'jsdom',
	'json-schema',
	'jsonwebtoken',
	'lodash',
	'lossless-json',
	'luxon',
	'mailparser',
	'mime-types',
	'minifaker',
	'moment-timezone',
	'node-html-markdown',
	'node:assert',
	'node:crypto',
	'node:fs',
	'node:os',
	'node:path',
	'node:querystring',
	'node:stream',
	'node:string_decoder',
	'node:util',
	'node:worker_threads',
	'node:zlib',
	'otpauth',
	'path',
	'qs',
	'rrule',
	'sanitize-html',
	'semver',
	'showdown',
	'stream',
	'tar',
	'tmp-promise',
	'ts-ics',
	'url',
	'util',
	'uuid',
	'v8',
	'vm',
	'vm2',
	'xml2js',
	'zod',
]);

const INTERNAL_PREFIXES = ['@utils/', '@credentials/', '@test/', '@nodes-testing', 'n8n-'];

const IMPORT_PATTERNS = [
	/^\s*(?:import|export)\b[^'"]*?\bfrom\s+['"]([^'"]+)['"]/gm,
	/^\s*import\s+['"]([^'"]+)['"]/gm,
	/\brequire\(\s*['"]([^'"]+)['"]\s*\)/g,
	/\bimport\(\s*['"]([^'"]+)['"]\s*\)/g,
];

function sourceFiles(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) {
			return entry.name === '__tests__' || entry.name === 'test' ? [] : sourceFiles(path);
		}
		return entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts') ? [path] : [];
	});
}

function moduleName(specifier: string): string {
	const parts = specifier.split('/');
	return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

function importsOf(file: string): string[] {
	const text = readFileSync(file, 'utf8');
	return IMPORT_PATTERNS.flatMap((pattern) => [...text.matchAll(pattern)].map((match) => match[1]))
		.filter((specifier) => !specifier.startsWith('.'))
		.filter((specifier) => !INTERNAL_PREFIXES.some((prefix) => specifier.startsWith(prefix)));
}

function reviewedFolder(file: string): string | undefined {
	const path = relative(NODES_DIR, file).split(sep).join('/');
	return Object.keys(REVIEWED_FOLDERS)
		.sort((a, b) => b.length - a.length)
		.find((folder) => path.startsWith(`${folder}/`));
}

describe('n8n-nodes-base network imports', () => {
	const files = sourceFiles(NODES_DIR);
	const imports = files.flatMap((file) =>
		importsOf(file).map((specifier) => ({ file: relative(NODES_DIR, file), specifier })),
	);

	it('finds the node sources', () => {
		expect(files.length).toBeGreaterThan(500);
	});

	it('knows every external module that a node imports', () => {
		const unknown = imports.filter(
			({ specifier }) =>
				!LOCAL_MODULES.has(moduleName(specifier)) &&
				!NETWORK_MODULES.includes(moduleName(specifier)),
		);
		// A new module: add it to LOCAL_MODULES, or to NETWORK_MODULES and block its nodes.
		expect(unknown).toEqual([]);
	});

	it('has a review for every node folder that imports a network module', () => {
		const unreviewed = imports.filter(
			({ file, specifier }) =>
				NETWORK_MODULES.includes(moduleName(specifier)) &&
				!HARMLESS_SPECIFIERS.has(specifier) &&
				!reviewedFolder(join(NODES_DIR, file)),
		);
		expect(unreviewed).toEqual([]);
	});

	it.each(Object.entries(REVIEWED_FOLDERS))('blocks the network nodes in %s', (_folder, review) => {
		if (review.blocked.length === 0) expect(review.reason).toEqual(expect.any(String));
		for (const nodeType of review.blocked) {
			expect(nodeSimulationGap(nodeType)).toEqual(expect.any(String));
		}
	});
});
