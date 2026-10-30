/**
 * Run-time mock for nodes the HTTP mock cannot reach (SMTP, databases, queues,
 * file servers). The engine calls it in place of the node's own run, with the
 * real input items, so the output follows the input and pairs with it.
 * Pinning these nodes instead gave the same invented output on every run,
 * with no `pairedItem`.
 */

import { Tool } from '@n8n/agents/tool';
import { createEvalAgent } from '@n8n/instance-ai';
import type { OutputSchemaLookup } from '@n8n/workflow-sdk';
import type { EvalNodeMockHandler } from 'n8n-core';
import type { IDataObject, IExecuteFunctions, INode, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError, OperationalError } from 'n8n-workflow';
import { z } from 'zod';

import { buildDateAnchors } from './date-anchors';
import { redactSecretKeys, redactSecretValuePatterns, truncateForLlm } from './request-sanitizer';

const NODE_MOCK_PROMPT = `You produce the output of ONE run of an n8n node in a workflow evaluation. The node talks to a service the evaluation cannot reach: a database, an SMTP server, a message queue or a file server.

The user message gives the node type, the input items with the node parameters resolved for each item, and the test context. Submit the items the real node outputs for this run through submit_output.

Rules:
- Copy the behavior of the real node. A write (insert, update, delete, send, publish, upload) gives one result item for each input item. A read (select, get, list, download) gives the rows or records the service holds, so the item count can differ from the input count.
- Set inputIndex on every output item to the index of the input item it comes from. For a read, use the index of the input item whose parameters selected the rows.
- Take the item layout from the output schema when the message has one. Otherwise use your knowledge of the n8n node.
- Take data values from the scenario, the hints and the input items. When the scenario states a value or a count, use it exactly. When a hint and the scenario disagree, the scenario wins.
- Return an empty items list when the scenario says the service holds nothing that matches.
- When the scenario says the service fails for this run, set error to the message the service returns and leave items empty.
- A send-and-wait node (operation sendAndWait) sends a message and waits for a person to answer. Return ONE item with inputIndex 0, in the layout the node emits when the answer arrives: {"data": {"approved": true, "respondedAt": "<ISO date>"}} for responseType approval (the default), {"data": {"text": "<the answer>", "respondedAt": "<ISO date>"}} for freeText, and the form fields with respondedAt inside data for customForm. The person approves, or answers in favor, unless the scenario says otherwise. When the parameters turn on responder capture (captureResponder), add data.responder: {"id", "name", "source": "<service, e.g. slack>"} for a person from the scenario.
- The Chat node (@n8n/n8n-nodes-langchain.chat) with operation sendAndWait waits for the person's next chat message, so the layout above does not apply. Return ONE item with inputIndex 0 that carries the reply at the top level for version 1.2 or later: {"chatInput": "<the message>", "sessionId": "<id>"}. For version 1.1, nest the same fields under data. When responseType is not freeText, a typed reply means the person did not approve: add "approved": false under data.
- Derive every date from the Date anchors.`;

const submitOutputSchema = z.object({
	items: z
		.array(
			z.object({
				inputIndex: z
					.number()
					.int()
					.describe('Index of the input item this output item comes from.'),
				json: z.record(z.unknown()).describe('The output item, as the real node emits it.'),
			}),
		)
		.describe('The output items of this node run.'),
	error: z
		.string()
		.optional()
		.describe('Only when the scenario says the service fails: the error message it returns.'),
});

type SubmitOutput = z.infer<typeof submitOutputSchema>;

const LLM_CALL_TIMEOUT_MS = 120_000;
const MAX_ATTEMPTS = 2;
const MAX_ITEMS_CHARS = 24_000;

export interface NodeRunRequest {
	/** Input items, each with the node parameters resolved for that item. */
	items: Array<{ json: unknown; parameters: Record<string, unknown> }>;
}

export interface NodeRunMockOptions {
	/** Names of the nodes this mock answers for; every other node runs for real. */
	nodeNames: Set<string>;
	scenarioHints?: string;
	globalContext?: string;
	nodeHints?: Record<string, string>;
	outputSchemaLookup?: OutputSchemaLookup;
	/** Aborted when the run ends. */
	signal?: AbortSignal;
	/** Records each run: the output items, the scenario error, or an `_evalMockError` marker. */
	onRun?: (node: INode, request: NodeRunRequest, response: unknown) => void;
}

export function createNodeRunMockHandler(options: NodeRunMockOptions): EvalNodeMockHandler {
	return async (context) => {
		const node = context.getNode();
		if (!options.nodeNames.has(node.name)) return undefined;

		const inputItems = context.getInputData();
		const request: NodeRunRequest = {
			items: inputItems.map((item, index) => ({
				json: item.json,
				parameters: resolveParameters(context, node, index),
			})),
		};

		let submitted: SubmitOutput | undefined;
		let failure = 'the model submitted no output';
		for (let attempt = 0; attempt < MAX_ATTEMPTS && !submitted; attempt++) {
			if (options.signal?.aborted) {
				throw new OperationalError('The eval run has ended, so this mocked node run was cancelled');
			}
			try {
				submitted = await generateOutput(node, request, options);
			} catch (error) {
				failure = error instanceof Error ? error.message : String(error);
			}
		}

		if (!submitted) {
			options.onRun?.(node, request, { _evalMockError: true, message: failure });
			throw new OperationalError(`Eval node mock failed for "${node.name}": ${failure}`);
		}

		if (submitted.error) {
			options.onRun?.(node, request, { error: submitted.error });
			throw new NodeOperationError(node, submitted.error);
		}

		const output: INodeExecutionData[] = submitted.items.map(({ inputIndex, json }) => ({
			json: json as IDataObject,
			pairedItem: { item: inputIndex },
		}));
		options.onRun?.(node, request, output);
		return [output];
	};
}

/** Each top-level parameter as the node reads it for this item; raw when it does not resolve. */
function resolveParameters(
	context: IExecuteFunctions,
	node: INode,
	itemIndex: number,
): Record<string, unknown> {
	const resolved: Record<string, unknown> = {};
	for (const [name, raw] of Object.entries(node.parameters ?? {})) {
		try {
			resolved[name] = context.getNodeParameter(name, itemIndex, raw);
		} catch {
			resolved[name] = raw;
		}
	}
	return resolved;
}

async function generateOutput(
	node: INode,
	request: NodeRunRequest,
	options: NodeRunMockOptions,
): Promise<SubmitOutput | undefined> {
	const { sharedParameters, shownItems } = itemsForPrompt(request.items);
	let captured: SubmitOutput | undefined;
	const agent = createEvalAgent('eval-node-mock', {
		instructions: NODE_MOCK_PROMPT,
		cache: true,
	}).tool(
		new Tool('submit_output')
			.description('Submit the output items of this node run.')
			.input(submitOutputSchema)
			.handler(async (input: SubmitOutput) => {
				// A run with no input items (e.g. "always output data") still pairs with item 0.
				const maxIndex = Math.max(shownItems.length - 1, 0);
				const bad = input.items.find((item) => item.inputIndex < 0 || item.inputIndex > maxIndex);
				if (bad) {
					return `Invalid: inputIndex ${bad.inputIndex} is out of range 0-${maxIndex}. Call submit_output again.`;
				}
				captured = input;
				return 'Accepted.';
			})
			// One model call per run: the model would otherwise answer again after "Accepted.".
			.endsTurnWhen((output) => output === 'Accepted.')
			.build(),
	);

	const timeout = AbortSignal.timeout(LLM_CALL_TIMEOUT_MS);
	await agent.generate(
		buildUserPrompt(node, request.items.length, sharedParameters, shownItems, options),
		{
			abortSignal: options.signal ? AbortSignal.any([options.signal, timeout]) : timeout,
		},
	);
	return captured;
}

const forPrompt = (value: unknown) =>
	redactSecretValuePatterns(JSON.stringify(redactSecretKeys(value)));

/**
 * Whole items, in order, while they fit: every inputIndex the model can use names an item it saw.
 * Parameters that resolve the same for every item go once in `sharedParameters`, so a long
 * email body does not push most recipients out of the message.
 */
function itemsForPrompt(items: NodeRunRequest['items']): {
	sharedParameters: string | undefined;
	shownItems: string[];
} {
	const [first, ...rest] = items;
	const shared: Record<string, unknown> = {};
	for (const [name, value] of Object.entries(first?.parameters ?? {})) {
		const json = JSON.stringify(value);
		if (rest.length > 0 && rest.every((item) => JSON.stringify(item.parameters[name]) === json)) {
			shared[name] = value;
		}
	}

	const shownItems: string[] = [];
	let size = 0;
	for (const { json, parameters } of items) {
		const own = Object.fromEntries(
			Object.entries(parameters).filter(([name]) => !Object.hasOwn(shared, name)),
		);
		const line = forPrompt({ json, parameters: own });
		if (shownItems.length > 0 && size + line.length > MAX_ITEMS_CHARS) break;
		shownItems.push(truncateForLlm(line, MAX_ITEMS_CHARS));
		size += line.length;
	}
	const sharedParameters =
		Object.keys(shared).length > 0 ? truncateForLlm(forPrompt(shared), MAX_ITEMS_CHARS) : undefined;
	return { sharedParameters, shownItems };
}

function buildUserPrompt(
	node: INode,
	inputCount: number,
	sharedParameters: string | undefined,
	shownItems: string[],
	options: NodeRunMockOptions,
): string {
	const parameters = node.parameters ?? {};
	const schema = options.outputSchemaLookup?.({
		type: node.type,
		typeVersion: node.typeVersion,
		resource: typeof parameters.resource === 'string' ? parameters.resource : undefined,
		operation: typeof parameters.operation === 'string' ? parameters.operation : undefined,
		parameters,
	});

	const sections = ['## Node', `${node.name} (${node.type}, version ${node.typeVersion})`];
	if (sharedParameters) {
		sections.push('', '## Parameters (the same for every item)', sharedParameters);
	}
	sections.push(
		'',
		`## Input items (${inputCount})`,
		...shownItems.map((item, index) => `${index}: ${item}`),
	);
	if (shownItems.length < inputCount) {
		sections.push(
			`Only items 0-${shownItems.length - 1} fit in this message. Output items for these only.`,
		);
	}
	if (schema) sections.push('', '## Output schema', JSON.stringify(schema));
	if (options.scenarioHints) sections.push('', '## Scenario', options.scenarioHints);
	const nodeHint = options.nodeHints?.[node.name];
	if (nodeHint) sections.push('', '## Hint', nodeHint);
	if (options.globalContext) sections.push('', '## Data context', options.globalContext);
	sections.push('', '## Date anchors', buildDateAnchors(new Date()));
	return sections.join('\n');
}
