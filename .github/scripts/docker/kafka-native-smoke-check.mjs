#!/usr/bin/env node

// Verifies the @confluentinc/kafka-javascript native binding (librdkafka) loads
// correctly inside a built n8n image. Resolves the module the same way n8n's
// runtime would - from within n8n-nodes-base, not via a hardcoded pnpm store path,
// since that path's hash suffix depends on the exact dependency graph.

import { createRequire } from 'node:module';
import { realpathSync } from 'node:fs';
import path from 'node:path';

// The features our existing Kafka credential depends on (TLS + SASL SCRAM auth).
const REQUIRED_FEATURES = ['ssl', 'sasl_scram'];
const COMPRESSION_CODECS = ['gzip', 'snappy', 'lz4', 'zstd'];

const n8nInstallDir = process.env.N8N_INSTALL_DIR || '/usr/local/lib/node_modules/n8n';
const nodesBasePackageJson =
	process.env.NODES_BASE_PACKAGE_JSON ||
	path.join(n8nInstallDir, 'node_modules/n8n-nodes-base/package.json');
// n8n-nodes-base is a pnpm symlink; resolve it so require() walks up from its real
// location in the pnpm virtual store, where its dependencies actually live.
const require = createRequire(realpathSync(nodesBasePackageJson));

const kafka = require('@confluentinc/kafka-javascript');

// Construct a client object (no broker connection attempted) to prove the native
// binding is fully usable, not just importable.
new kafka.KafkaJS.Kafka({
	kafkaJS: { brokers: ['localhost:9092'], clientId: 'ent-216-smoke-check' },
});

console.log(`librdkafka version: ${kafka.librdkafkaVersion}`);
console.log(`Reported features: ${kafka.features.join(', ')}`);

const missingFeatures = REQUIRED_FEATURES.filter((feature) => !kafka.features.includes(feature));
if (missingFeatures.length > 0) {
	console.error(`Missing required librdkafka features: ${missingFeatures.join(', ')}`);
	process.exit(1);
}

const supportedCodecs = COMPRESSION_CODECS.filter((codec) => kafka.features.includes(codec));
console.log(`Supported compression codecs: ${supportedCodecs.join(', ') || 'none'}`);

console.log('Kafka native smoke check passed.');
