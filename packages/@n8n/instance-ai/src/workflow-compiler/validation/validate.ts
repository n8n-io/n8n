import type { NodeRegistry } from '../catalog/node-registry';
import type { NodeOperation } from '../catalog/types';
import type { CompiledWorkflow } from '../compiler/compile';
import { allSteps, type DataContract, type WorkflowIR } from '../ir/schema';
import { validateContracts } from './contracts';
import { validateExpressions } from './expressions';
import { validateParameters } from './parameters';
import { emptyVerificationReport, levelFor, type VerificationReport } from './report';
import { validateStructure } from './structural';

export interface ValidateCompiledInput {
	ir: WorkflowIR;
	compiled: CompiledWorkflow;
	registry: NodeRegistry;
}

/** Maps emitted node names to their registry operation and output contract. */
export function indexCompiledNodes(input: ValidateCompiledInput): {
	operations: Map<string, NodeOperation>;
	outputContracts: Map<string, DataContract>;
} {
	const operations = new Map<string, NodeOperation>();
	const outputContracts = new Map<string, DataContract>();
	for (const step of allSteps(input.ir)) {
		const nodeName = input.compiled.stepNodeNames[step.id];
		if (!nodeName || (step.kind !== 'trigger' && step.kind !== 'action')) continue;
		const operation = input.registry.get(step.operation.operationId);
		if (!operation) continue;
		operations.set(nodeName, operation);
		const contract = step.outputContract ?? operation.outputContract;
		if (contract) outputContracts.set(nodeName, contract);
	}
	return { operations, outputContracts };
}

/** Runs every static validator over a compiled workflow and returns the explicit report. */
export async function validateCompiledWorkflow(
	input: ValidateCompiledInput,
): Promise<VerificationReport> {
	const report = emptyVerificationReport();
	const { operations, outputContracts } = indexCompiledNodes(input);
	const { workflow } = input.compiled;
	const levels = [
		['structural', validateStructure(workflow)],
		['parameters', await validateParameters(workflow, input.registry, operations)],
		['expressions', validateExpressions(workflow, outputContracts)],
		['contracts', validateContracts(workflow, outputContracts, new Map())],
	] as const;
	for (const [level, issues] of levels) {
		report[level] = levelFor(issues);
		report.issues.push(...issues);
	}
	for (const { code, message, nodeName, stepId } of input.compiled.warnings) {
		report.issues.push({ severity: 'info', code, message, nodeName, stepId });
	}
	return report;
}
