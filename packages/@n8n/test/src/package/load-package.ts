import type { PackageManifest, WorkflowManifestEntry } from '@n8n/api-types';
import { serializedWorkflowSchema } from '@n8n/api-types';
import {
	DirectoryPackageReader,
	PackageImportConfig,
	readPackageManifest,
	TarPackageReader,
	type PackageReader,
} from 'n8n/dist/testing.js';
import { jsonParse } from 'n8n-workflow';
import { readFile, stat } from 'node:fs/promises';

import { WorkflowTestError } from '../errors';
import { missingSubWorkflowIssues, subWorkflowIssues } from '../sub-workflows/issues';
import type { NodeDefinition, WorkflowDefinition } from '../workflow-set';
import { WorkflowSet } from '../workflow-set';
import { missingChildIssues, missingNodeTypeIssues } from './manifest-issues';
import { toRequirements } from './manifest-requirements';

const WORKFLOW_FILE = 'workflow.json';

type PackagedNode = Omit<NodeDefinition, 'credentials'> & {
	credentials?: Record<string, { id: string | null; name?: string }>;
};

type PackagedWorkflow = Omit<WorkflowDefinition, 'nodes'> & { nodes: PackagedNode[] };

interface PackageSource {
	path: string;
	reader: PackageReader;
}

export async function loadPackage(packagePath: string): Promise<WorkflowSet> {
	let source: PackageSource;
	let manifest: PackageManifest;
	try {
		const limits = new PackageImportConfig();
		const reader = (await stat(packagePath)).isDirectory()
			? await DirectoryPackageReader.open(packagePath, limits)
			: new TarPackageReader(await readFile(packagePath), limits);
		source = { path: packagePath, reader };
		manifest = await readPackageManifest(reader);
	} catch (error) {
		throw new WorkflowTestError(
			'INVALID_PACKAGE',
			`The package "${packagePath}" could not be loaded: ${String(error)}`,
		);
	}
	const entries = manifest.workflows ?? [];
	const credentialNames = new Map(
		(manifest.requirements?.credentials ?? []).map(({ id, name }) => [id, name]),
	);
	const definitions: WorkflowDefinition[] = [];
	for (const entry of entries) {
		definitions.push(toDefinition(entry, await readWorkflow(source, entry), credentialNames));
	}

	return new WorkflowSet(definitions, {
		issueProducers: [
			subWorkflowIssues,
			missingSubWorkflowIssues,
			missingChildIssues(manifest),
			missingNodeTypeIssues(manifest),
		],
		requirements: toRequirements(manifest),
		idsByTarget: new Map(entries.map(({ target, id }) => [target, id])),
	});
}

async function readWorkflow(
	source: PackageSource,
	entry: WorkflowManifestEntry,
): Promise<PackagedWorkflow> {
	const file = `${entry.target}/${WORKFLOW_FILE}`;
	let workflow: PackagedWorkflow;
	try {
		const content = await source.reader.readFile(file);
		workflow = jsonParse<PackagedWorkflow>(content.toString('utf8'));
	} catch (error) {
		throw invalidPackage(source, `has an unreadable file ${file}: ${String(error)}`);
	}
	const result = serializedWorkflowSchema.safeParse(workflow);
	if (!result.success) throw invalidFile(source, file, result.error);
	return workflow;
}

function toDefinition(
	entry: WorkflowManifestEntry,
	{ name, nodes, connections, settings }: PackagedWorkflow,
	credentialNames: Map<string, string | undefined>,
): WorkflowDefinition {
	return {
		id: entry.id,
		name,
		connections,
		settings,
		nodes: nodes.map((node) => withCredentialNames(node, credentialNames)),
	};
}

// Export removes the credential names from the nodes. Import takes them from the manifest.
function withCredentialNames(
	{ credentials, ...node }: PackagedNode,
	credentialNames: Map<string, string | undefined>,
): NodeDefinition {
	if (!credentials) return node;
	const named = Object.entries(credentials).map(([type, { id, name }]) => {
		const manifestName = id === null ? undefined : credentialNames.get(id);
		return [type, { id, name: manifestName ?? name ?? '' }];
	});
	return { ...node, credentials: Object.fromEntries(named) };
}

interface SchemaIssue {
	path: Array<string | number>;
	message: string;
}

function invalidFile(reader: PackageSource, file: string, { issues }: { issues: SchemaIssue[] }) {
	const problems = issues.map(({ path, message }) => `${path.join('.')}: ${message}`);
	return invalidPackage(reader, `has an invalid file ${file}. ${problems.join('; ')}`);
}

function invalidPackage(reader: PackageSource, problem: string) {
	return new WorkflowTestError('INVALID_PACKAGE', `The package "${reader.path}" ${problem}.`);
}
