import type { INodeCredentialsDetails, INodeParameters } from 'n8n-workflow';
import { deepCopy } from 'n8n-workflow';

import { WorkflowTestError } from '../errors';
import type { ExecutionSetup } from '../execution-context';
import type { WorkflowHandle } from '../workflow-set';
import { isKnownCredentialType } from './credential-types';

export class TestCredential {
	constructor(
		readonly type: string,
		readonly data: INodeParameters,
	) {}
}

export type CredentialsByKey = Record<string, TestCredential>;

const configuredCredentials = new WeakMap<WorkflowHandle, Map<string, CredentialsByKey>>();

export function createCredential(type: string, data: INodeParameters): TestCredential {
	if (!isKnownCredentialType(type)) {
		throw new WorkflowTestError(
			'CREDENTIAL_TYPE_UNKNOWN',
			`The credential type "${type}" is unknown.`,
		);
	}
	return new TestCredential(type, deepCopy(data));
}

export function configureCredentials(
	handle: WorkflowHandle,
	node: string,
	credentials: CredentialsByKey,
): void {
	const byNode = configuredCredentials.get(handle) ?? new Map<string, CredentialsByKey>();
	byNode.set(node, { ...byNode.get(node), ...credentials });
	configuredCredentials.set(handle, byNode);
}

export function findCredential(
	context: ExecutionSetup,
	node: string,
	{ id, name }: INodeCredentialsDetails,
): TestCredential | undefined {
	const keys = id ? [id, name] : [name];
	const sources = [
		configuredCredentials.get(context.handle)?.get(node),
		context.options.credentials,
	];
	return sources.flatMap((source) => keys.map((key) => source?.[key])).find(Boolean);
}

export function typeMismatch(
	context: ExecutionSetup,
	node: string,
	slot: string,
	credential: TestCredential,
): WorkflowTestError | undefined {
	if (credential.type === slot) return undefined;
	return new WorkflowTestError(
		'CREDENTIAL_TYPE_MISMATCH',
		`Node "${node}" needs a "${slot}" credential. The test supplied a "${credential.type}" credential.`,
		{ workflow: context.handle.name, node },
	);
}

export function checkCredentialTypes(context: ExecutionSetup): void {
	for (const { node, slot, details } of credentialSlots(context)) {
		const credential = findCredential(context, node, details);
		const mismatch = credential && typeMismatch(context, node, slot, credential);
		if (mismatch) throw mismatch;
	}
}

export function missingCredential(
	context: ExecutionSetup,
	node: string | undefined,
	slot: string,
	name: string,
): WorkflowTestError {
	const users = credentialSlots(context)
		.filter((use) => use.slot === slot && use.details.name === name)
		.map((use) => use.node);
	const subject = node ? `Node "${node}"` : 'A node';
	return new WorkflowTestError(
		'CREDENTIAL_NOT_SUPPLIED',
		`${subject} needs the credential "${name}" (${slot}). The test did not supply it. Nodes that use it: ${users.join(', ')}. Supply it in the credentials option, or mock the nodes with mockNode().`,
		{ workflow: context.handle.name, node },
	);
}

function credentialSlots({ workflow, handle }: ExecutionSetup) {
	return Object.values(workflow.nodes)
		.filter((node) => !node.disabled && !handle.mocks.has(node.name))
		.flatMap((node) =>
			Object.entries(node.credentials ?? {}).map(([slot, details]) => ({
				node: node.name,
				slot,
				details,
			})),
		);
}
