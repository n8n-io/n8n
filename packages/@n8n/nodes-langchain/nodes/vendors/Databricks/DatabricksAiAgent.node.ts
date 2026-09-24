import { getBatchingOptionFields } from '@n8n/ai-utilities';
import {
	NodeConnectionTypes,
	NodeOperationError,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeProperties,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

import type { DatabricksOAuth2Credential } from '@utils/databricks/token-provider';
import { promptTypeOptions, textFromPreviousNode, textInput } from '@utils/descriptions';

import { commonOptions } from '../../agents/Agent/agents/ToolsAgent/options';
import { toolsAgentExecute } from '../../agents/Agent/agents/ToolsAgent/V2/execute';
import { getInputs } from '../../agents/Agent/utils';
import { MlflowSpanCollector } from './mlflow/span-collector';
import type { MlflowRequest, SignedUpload } from './mlflow/trace-writer';
import { defaultExperimentName, ensureExperiment, writeTrace } from './mlflow/trace-writer';
import { createMlflowTransport } from './mlflow/transport';

/**
 * Trace export is off by default and opt-in per node. Traces carry the real
 * prompts, model outputs and tool results, so switching it on is a deliberate
 * choice - see the redaction policy on ENT-437.
 */
const exportTracesField: INodeProperties = {
	displayName: 'Export Traces to MLflow',
	name: 'exportTraces',
	type: 'boolean',
	default: false,
	noDataExpression: true,
	description:
		'Whether to send each run to MLflow Tracing in your Databricks workspace. Needs the Databricks credential above. Traces include prompts, model outputs and tool results.',
};

const experimentField: INodeProperties = {
	displayName: 'Experiment',
	name: 'experiment',
	type: 'resourceLocator',
	default: { mode: 'name', value: '' },
	displayOptions: { show: { exportTraces: [true] } },
	description:
		'Where traces are stored. Leave the name empty to create one for this workflow automatically.',
	modes: [
		{
			displayName: 'By Name',
			name: 'name',
			type: 'string',
			placeholder: '/Shared/my-agent-traces',
			hint: 'Created if it does not exist. Empty means /Shared/n8n-workflows-<workflow ID>.',
		},
		{
			displayName: 'By ID',
			name: 'id',
			type: 'string',
			placeholder: '822142731468161',
		},
	],
};

interface TraceExporter {
	request: MlflowRequest;
	upload: SignedUpload;
	experimentId: string;
}

/**
 * Resolves the target experiment once per run. Returns `undefined` when setup
 * fails: tracing is observability, so it must never break the agent.
 */
async function prepareTraceExport(ctx: IExecuteFunctions): Promise<TraceExporter | undefined> {
	try {
		const credential = await ctx.getCredentials<DatabricksOAuth2Credential>('databricksOAuth2Api');
		const { request, upload } = createMlflowTransport(ctx, credential);

		const experiment = ctx.getNodeParameter('experiment', 0, { mode: 'name', value: '' }) as {
			mode: string;
			value: string;
		};
		if (experiment.mode === 'id' && experiment.value) {
			return { request, upload, experimentId: experiment.value };
		}

		const name = experiment.value || defaultExperimentName(ctx.getWorkflow().id ?? 'unknown');
		return { request, upload, experimentId: await ensureExperiment(request, name) };
	} catch (error) {
		ctx.logger.warn(
			`Databricks AI Agent: could not prepare MLflow trace export: ${
				error instanceof Error ? error.message : String(error)
			}`,
		);
		return undefined;
	}
}

/** Tracing failures are logged and swallowed; the run's answer still stands. */
async function flushTrace(
	ctx: IExecuteFunctions,
	exporter: TraceExporter,
	collector: MlflowSpanCollector,
): Promise<void> {
	const trace = collector.finish();
	if (!trace) return;

	try {
		await writeTrace(exporter, trace);
	} catch (error) {
		ctx.logger.warn(
			`Databricks AI Agent: MLflow trace export failed: ${
				error instanceof Error ? error.message : String(error)
			}`,
		);
	}
}

export class DatabricksAiAgent implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Databricks AI Agent',
		name: 'databricksAiAgent',
		icon: { light: 'file:databricks.svg', dark: 'file:databricks.dark.svg' },
		group: ['transform'],
		version: [1],
		hidden: true,
		description: 'An AI agent that exports its runs to MLflow Tracing in Databricks',
		defaults: {
			name: 'Databricks AI Agent',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Agents', 'Root Nodes'],
			},
		},
		inputs: `={{
			((hasOutputParser, needsFallback) => {
				${getInputs.toString()};
				return getInputs(true, hasOutputParser, needsFallback);
			})($parameter.hasOutputParser === undefined || $parameter.hasOutputParser === true, $parameter.needsFallback !== undefined && $parameter.needsFallback === true)
		}}`,
		outputs: [NodeConnectionTypes.Main],
		// Only the trace export talks to the workspace - the agent itself runs on the
		// chat model sub-node's own credential - so this is optional. Gating it on
		// `exportTraces` would make n8n render the selector above that toggle,
		// because it places the selector at the index of its dependency field.
		credentials: [
			{
				name: 'databricksOAuth2Api',
				required: false,
			},
		],
		properties: [
			promptTypeOptions,
			{
				...textFromPreviousNode,
				displayOptions: { show: { promptType: ['auto'] } },
			},
			{
				...textInput,
				displayOptions: { show: { promptType: ['define'] } },
			},
			{
				displayName: 'Require Specific Output Format',
				name: 'hasOutputParser',
				type: 'boolean',
				default: false,
				noDataExpression: true,
			},
			{
				displayName: 'Enable Fallback Model',
				name: 'needsFallback',
				type: 'boolean',
				default: false,
				noDataExpression: true,
			},
			exportTracesField,
			experimentField,
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				default: {},
				placeholder: 'Add Option',
				options: [
					...commonOptions,
					getBatchingOptionFields(undefined, 1),
					{
						displayName: 'Enable Streaming',
						name: 'enableStreaming',
						type: 'boolean',
						default: true,
						description: 'Whether to stream the response as the model generates it',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const exportTraces = this.getNodeParameter('exportTraces', 0, false) as boolean;
		if (!exportTraces) {
			return await toolsAgentExecute.call(this);
		}

		// The credential is optional on the node, so a missing one is a setup
		// mistake worth reporting up front rather than a silently skipped export.
		if (!this.getNode().credentials?.databricksOAuth2Api) {
			throw new NodeOperationError(
				this.getNode(),
				'Select a Databricks credential to export traces to MLflow',
				{
					description: '"Export Traces to MLflow" is on, but this node has no credential selected.',
				},
			);
		}

		// Resolved once per run: every item writes into the same experiment, and a
		// failure here must not stop the agent from answering.
		const exporter = await prepareTraceExport(this);
		if (!exporter) {
			return await toolsAgentExecute.call(this);
		}

		// One collector per item, so each item exports as its own trace.
		const collectors = new Map<number, MlflowSpanCollector>();

		return await toolsAgentExecute.call(this, {
			createCallbacks: (itemIndex) => {
				const collector = new MlflowSpanCollector();
				collectors.set(itemIndex, collector);
				return [collector];
			},
			onItemFinished: async (itemIndex) => {
				const collector = collectors.get(itemIndex);
				if (!collector) return;
				collectors.delete(itemIndex);
				await flushTrace(this, exporter, collector);
			},
		});
	}
}
