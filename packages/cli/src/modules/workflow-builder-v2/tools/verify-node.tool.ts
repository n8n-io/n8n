import { Tool } from '@n8n/agents';
import type { BuiltTool } from '@n8n/agents';
import type { INodeTypeDescription } from 'n8n-workflow';
import { z } from 'zod';

import type { LookupNodeDescription } from '../utils/node-filter';
import { checkStandalone } from '../utils/node-filter';
import type { ResolveNodeVersion } from './propose-nodes.tool';

const inputSchema = z.object({
	nodeType: z.string().min(1).describe('Canonical node id to verify, e.g. `n8n-nodes-base.gmail`'),
	version: z
		.number()
		.min(1)
		.optional()
		.describe('Optional node version to validate. Omit to get the current installed version.'),
});

export function createVerifyNodeTool(
	lookupNodeDescription: LookupNodeDescription,
	resolveNodeVersion: ResolveNodeVersion,
): BuiltTool {
	return new Tool('verify_node')
		.description(
			'Verify that a node id exists in this n8n instance, find its current installed version, ' +
				'check whether a requested version is valid/current, and learn whether it is a standalone workflow node or an AI sub-node. ' +
				'Use this before `propose_nodes` when you are uncertain about a node id or version.',
		)
		.input(inputSchema)
		.handler(async (input) => {
			const currentVersion = resolveNodeVersion(input.nodeType);
			if (currentVersion === null) {
				return {
					ok: false,
					error: 'unknown-node-type',
					nodeType: input.nodeType,
					hint:
						'This node type is not installed or not recognized by this n8n instance. ' +
						'Do not propose or commit it. Use a canonical node id from the node catalog instead.',
				};
			}

			const requestedVersion = input.version;
			const effectiveVersion = requestedVersion ?? currentVersion;
			const description = lookupNodeDescription(input.nodeType, effectiveVersion);

			if (!description) {
				return {
					ok: false,
					error: 'invalid-node-version',
					nodeType: input.nodeType,
					requestedVersion: effectiveVersion,
					currentVersion,
					hint: `Use ${input.nodeType}@${currentVersion}.`,
				};
			}

			const standalone = checkStandalone(input.nodeType, effectiveVersion, () => description);
			const aiRole = getAiNodeRole(input.nodeType, description);

			return {
				ok: true,
				nodeType: input.nodeType,
				displayName: description.displayName,
				requestedVersion: requestedVersion ?? null,
				version: effectiveVersion,
				currentVersion,
				isCurrentVersion: effectiveVersion === currentVersion,
				isStandalone: standalone.allowed,
				...(standalone.allowed ? {} : { standaloneRejectionReason: standalone.reason }),
				...(aiRole ? { aiRole } : {}),
				hint: buildHint({
					nodeType: input.nodeType,
					effectiveVersion,
					currentVersion,
					isStandalone: standalone.allowed,
				}),
			};
		})
		.build();
}

function buildHint(input: {
	nodeType: string;
	effectiveVersion: number;
	currentVersion: number;
	isStandalone: boolean;
}): string {
	if (!input.isStandalone) {
		return (
			'Do not propose this as a normal ghost. It is an AI sub-node and must only ' +
			'be used as a specialized connection to an AI root node.'
		);
	}

	if (input.effectiveVersion !== input.currentVersion) {
		return (
			`This version exists but is not current. Use ${input.nodeType}@${input.currentVersion} ` +
			'unless the user explicitly requested the older version.'
		);
	}

	return 'This can be proposed as a normal ghost node.';
}

function getAiNodeRole(
	nodeType: string,
	description: INodeTypeDescription,
): { kind: string; purpose: string } | null {
	if (!nodeType.startsWith('@n8n/n8n-nodes-langchain.')) return null;
	const lowerNodeType = nodeType.toLowerCase();

	if (lowerNodeType.includes('.lmchat') || lowerNodeType.includes('.lm')) {
		return {
			kind: 'language-model-sub-node',
			purpose:
				'Provides the model connection for an AI root node. It is required by most AI Agent/Chain flows and is not a main-chain workflow step.',
		};
	}

	if (lowerNodeType.includes('.memory')) {
		return {
			kind: 'memory-sub-node',
			purpose:
				'Adds conversational memory to an AI root node. Use only when the workflow needs conversation history.',
		};
	}

	if (lowerNodeType.includes('tool')) {
		return {
			kind: 'tool-sub-node',
			purpose:
				'Gives an AI Agent a callable tool. It connects to the Agent tool input and is not a main-chain workflow step.',
		};
	}

	if (lowerNodeType.includes('.outputparser')) {
		return {
			kind: 'output-parser-sub-node',
			purpose:
				'Constrains or parses AI output. Connect it to an AI root node when downstream nodes need structured data.',
		};
	}

	if (description.outputs) {
		return {
			kind: 'ai-root-node',
			purpose:
				'Top-level AI node. It can appear in the main workflow chain, but it usually needs a language-model sub-node connection before it can run.',
		};
	}

	return null;
}
