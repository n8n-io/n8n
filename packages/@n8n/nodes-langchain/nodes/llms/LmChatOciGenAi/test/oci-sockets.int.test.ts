import { HumanMessage } from '@langchain/core/messages';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { lookup } from 'node:dns/promises';
import process from 'node:process';
import { Region } from 'oci-common';
import { describe, it } from 'vitest';

import type { OciGenAiGenericChat } from '@oracle/langchain-oci';
import type { OciGenAiCredentials } from '../../../../utils/ociGenAi';

import {
	createOciTestChatModel,
	getOciTestCompartmentId,
	getOciTestCredentials,
	getOciTestModelId,
	runOciIntegrationTests,
} from './oci-test-utils';

function getIdleObservationDurationMs(name: string, defaultSeconds: number): number {
	const configuredSeconds = process.env[name];
	if (configuredSeconds === undefined) return defaultSeconds * 1_000;

	const seconds = Number(configuredSeconds);
	if (!Number.isFinite(seconds) || seconds < 0) {
		throw new Error(`${name} must be a non-negative number of seconds`);
	}

	return seconds * 1_000;
}

function getCommandOutput(command: string, args: string[]): string {
	try {
		return execFileSync(command, args, {
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'pipe'],
		});
	} catch (error) {
		// lsof uses exit code 1 when no matching files exist, which means no sockets are open.
		if (typeof error === 'object' && error !== null && 'status' in error && error.status === 1) {
			return '';
		}

		throw new Error(
			`Failed to execute "${command}": ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

function getEstablishedTcpConnections(): string[] {
	const pid = String(process.pid);

	/*
	 * macOS/Linux:
	 *
	 * lsof columns include:
	 * COMMAND PID USER FD TYPE DEVICE SIZE/OFF NODE NAME
	 *
	 * We deliberately use -nP here:
	 *   -n = don't do DNS resolution
	 *   -P = don't resolve ports
	 *
	 * This makes the output deterministic and lets us inspect the
	 * actual remote IP addresses.
	 */
	const output = getCommandOutput('lsof', [
		'-nP',
		'-a',
		'-p',
		pid,
		'-iTCP:443',
		'-sTCP:ESTABLISHED',
	]);

	return output
		.split('\n')
		.slice(1)
		.map((line) => line.trim())
		.filter(Boolean);
}

function printSocketSnapshot(label: string): void {
	const connections = getEstablishedTcpConnections();

	console.log(`\n[OCI INT TEST] ${label}`);
	console.log(`[OCI INT TEST] PID: ${process.pid}`);
	console.log(`[OCI INT TEST] Established TCP/443 connections: ${connections.length}`);

	for (const connection of connections) {
		console.log(`[OCI INT TEST] ${connection}`);
	}
}

async function getOciEndpointIp(credentials: OciGenAiCredentials): Promise<string | undefined> {
	/*
	 * If you're using the default regional endpoint, resolve the
	 * hostname derived from Region. If you supplied an endpoint,
	 * resolve that instead.
	 */
	const region = Region.fromRegionId(credentials.regionId);
	const endpoint =
		credentials.serviceEndpoint ??
		`https://inference.generativeai.${region.regionId}.oci.${region.realm.secondLevelDomain}`;

	const url = new URL(endpoint);

	const result = await lookup(url.hostname, {
		family: 4,
	});

	return result.address;
}

function printOciConnections(ociIp: string, label: string): string[] {
	const connections = getEstablishedTcpConnections();

	const ociConnections = connections.filter((connection) => connection.includes(ociIp));

	console.log(`\n[OCI INT TEST] ${label}`);
	console.log(`[OCI INT TEST] OCI endpoint IP: ${ociIp}`);
	console.log(`[OCI INT TEST] OCI TCP/443 connections: ${ociConnections.length}`);

	for (const connection of ociConnections) {
		console.log(`[OCI INT TEST] ${connection}`);
	}

	return ociConnections;
}

function getLocalConnectionEndpoint(connection: string): string | undefined {
	const fields = connection.split(/\s+/);
	const tcpFieldIndex = fields.indexOf('TCP');
	const endpoint = tcpFieldIndex === -1 ? undefined : fields[tcpFieldIndex + 1];
	return endpoint?.split('->')[0];
}

function printConnectionTransition(
	previousConnections: string[],
	currentConnections: string[],
	label: string,
): void {
	const previousEndpoints = new Set(
		previousConnections
			.map(getLocalConnectionEndpoint)
			.filter((endpoint) => endpoint !== undefined),
	);
	const currentEndpoints = new Set(
		currentConnections.map(getLocalConnectionEndpoint).filter((endpoint) => endpoint !== undefined),
	);
	const reused = [...currentEndpoints].filter((endpoint) => previousEndpoints.has(endpoint));
	const newConnections = [...currentEndpoints].filter(
		(endpoint) => !previousEndpoints.has(endpoint),
	);
	const retired = [...previousEndpoints].filter((endpoint) => !currentEndpoints.has(endpoint));

	console.log(`\n[OCI INT TEST] ${label}`);
	console.log(`[OCI INT TEST] Reused local connections: ${reused.length}`);
	console.log(`[OCI INT TEST] New local connections: ${newConnections.length}`);
	console.log(`[OCI INT TEST] Retired local connections: ${retired.length}`);
}

async function waitForIdleObservation(durationMs: number): Promise<void> {
	console.log(
		`[OCI INT TEST] Waiting ${durationMs / 1_000} seconds for idle connection behavior...`,
	);
	await new Promise<void>((resolve) => {
		setTimeout(resolve, durationMs);
	});
}

async function runConcurrentBatch(
	models: OciGenAiGenericChat[],
	batchNumber: number,
): Promise<Array<{ content: unknown }>> {
	return await Promise.all(
		models.map(async (chatModel, index) => {
			return await chatModel.invoke([
				new HumanMessage(`Reply with exactly: batch ${batchNumber}, wrapper ${index + 1} passed`),
			]);
		}),
	);
}

async function run(): Promise<void> {
	const credentials = getOciTestCredentials();
	const model = getOciTestModelId();
	const compartmentId = getOciTestCompartmentId();
	const firstIdleObservationMs = getIdleObservationDurationMs('OCI_SOCKET_IDLE_SECONDS', 5);
	const extendedIdleObservationMs = getIdleObservationDurationMs(
		'OCI_SOCKET_EXTENDED_IDLE_SECONDS',
		25,
	);
	const ociIp = await getOciEndpointIp(credentials);

	console.log(`\n[OCI INT TEST] Current PID: ${process.pid}`);
	printSocketSnapshot('before OCI chat-model creation');

	if (ociIp) {
		printOciConnections(ociIp, 'before OCI chat-model creation');
	}

	const firstModel = await createOciTestChatModel(credentials, model, compartmentId);

	console.log('[OCI INT TEST] Created OCI chat model');
	printSocketSnapshot('after OCI chat-model creation');

	if (ociIp) {
		printOciConnections(ociIp, 'after OCI chat-model creation');
	}

	const firstResponse = await firstModel.invoke([
		new HumanMessage('Reply with exactly: OCI connectivity test passed'),
	]);

	console.log('[OCI INT TEST] First response:', firstResponse.content);
	printSocketSnapshot('after first OCI chat-model request');

	if (ociIp) {
		printOciConnections(ociIp, 'after first OCI chat-model request');
	}

	// Reuse the same wrapper after its OCI SDK client has been initialized.
	const secondResponseSameWrapper = await firstModel.invoke([
		new HumanMessage('Reply with exactly: same wrapper reuse passed'),
	]);

	console.log(
		'[OCI INT TEST] Second response using same wrapper:',
		secondResponseSameWrapper.content,
	);
	printSocketSnapshot('after second request using same chat wrapper');

	if (ociIp) {
		printOciConnections(ociIp, 'after second request using same chat wrapper');
	}

	// New wrappers begin uninitialized but receive the cached OCI inference client.
	const wrapperCount = 10;
	const models = [] as Array<typeof firstModel>;

	for (let i = 0; i < wrapperCount; i++) {
		models.push(await createOciTestChatModel(credentials, model, compartmentId));
		console.log(`[OCI INT TEST] Created OCI chat model #${i + 2}`);
	}

	printSocketSnapshot('after creating additional OCI chat models');

	if (ociIp) {
		printOciConnections(ociIp, 'after creating additional OCI chat models');
	}

	for (let i = 0; i < models.length; i++) {
		const response = await models[i].invoke([
			new HumanMessage(`Reply with exactly: wrapper ${i + 1} passed`),
		]);
		console.log(`[OCI INT TEST] wrapper #${i + 2} response:`, response.content);
	}

	printSocketSnapshot('after all OCI chat-model requests');

	if (ociIp) {
		printOciConnections(ociIp, 'after all OCI chat-model requests');
	}

	// This is a diagnostic, not a transport contract: OCI, proxies, and the runtime may each
	// choose different connection-pool sizes and idle-retirement timings.
	// Record snapshots across repeated concurrent batches for manual lifecycle investigation.
	const concurrentResponses = await runConcurrentBatch(models, 1);

	console.log(`[OCI INT TEST] Completed ${concurrentResponses.length} concurrent batch 1 requests`);
	printSocketSnapshot('after concurrent OCI chat-model requests');
	let firstBatchConnections: string[] = [];

	if (ociIp) {
		firstBatchConnections = printOciConnections(ociIp, 'after concurrent batch 1');
	}

	await waitForIdleObservation(firstIdleObservationMs);
	if (ociIp) {
		const idleConnections = printOciConnections(
			ociIp,
			`${firstIdleObservationMs / 1_000} seconds after concurrent batch 1`,
		);
		printConnectionTransition(
			firstBatchConnections,
			idleConnections,
			`idle behavior after ${firstIdleObservationMs / 1_000} seconds`,
		);
	}

	await waitForIdleObservation(extendedIdleObservationMs);
	let idleConnectionsAfterObservation: string[] = [];
	if (ociIp) {
		idleConnectionsAfterObservation = printOciConnections(
			ociIp,
			`${(firstIdleObservationMs + extendedIdleObservationMs) / 1_000} seconds after concurrent batch 1`,
		);
		printConnectionTransition(
			firstBatchConnections,
			idleConnectionsAfterObservation,
			`idle behavior after ${(firstIdleObservationMs + extendedIdleObservationMs) / 1_000} seconds`,
		);
	}

	const secondBatchResponses = await runConcurrentBatch(models, 2);
	let secondBatchConnections: string[] = [];
	if (ociIp) {
		secondBatchConnections = printOciConnections(ociIp, 'after concurrent batch 2');
		printConnectionTransition(
			idleConnectionsAfterObservation,
			secondBatchConnections,
			'connection reuse from idle state to batch 2',
		);
	}

	const thirdBatchResponses = await runConcurrentBatch(models, 3);
	if (ociIp) {
		const thirdBatchConnections = printOciConnections(ociIp, 'after concurrent batch 3');
		printConnectionTransition(
			secondBatchConnections,
			thirdBatchConnections,
			'connection reuse from batch 2 to batch 3',
		);
	}

	assert.ok(firstResponse);
	assert.ok(secondResponseSameWrapper);
	assert.equal(concurrentResponses.length, wrapperCount);
	assert.equal(secondBatchResponses.length, wrapperCount);
	assert.equal(thirdBatchResponses.length, wrapperCount);
}

describe.skipIf(!runOciIntegrationTests)('OCI Generative AI socket diagnostics', () => {
	it('reports socket snapshots for repeated OCI requests', run, 120_000);
});
