import type { PackageManifest, WorkflowManifestEntry } from '@n8n/api-types';
import { MANIFEST_FILE, packageManifestSchema, serializedWorkflowSchema } from '@n8n/api-types';
import { jsonParse } from 'n8n-workflow';
import { existsSync } from 'node:fs';

import { WorkflowTestError } from '../errors';
import { missingSubWorkflowIssues, subWorkflowIssues } from '../sub-workflows/issues';
import type { NodeDefinition, WorkflowDefinition } from '../workflow-set';
import { WorkflowSet } from '../workflow-set';
import { missingChildIssues, missingNodeTypeIssues } from './manifest-issues';
import { toRequirements } from './manifest-requirements';
import { readPackageFiles, type PackageFiles } from './package-files';

const WORKFLOW_FILE = 'workflow.json';

type PackagedNode = Omit<NodeDefinition, 'credentials'> & {
	credentials?: Record<string, { id: string | null; name?: string }>;
};

type PackagedWorkflow = Omit<WorkflowDefinition, 'nodes'> & { nodes: PackagedNode[] };

interface PackageReader {
	path: string;
	files: PackageFiles;
}

export function loadPackage(packagePath: string): WorkflowSet {
	if (!existsSync(packagePath)) {
		throw new WorkflowTestError('INVALID_PACKAGE', `The package "${packagePath}" does not exist.`);
	}
	const reader = { path: packagePath, files: readPackageFiles(packagePath) };
	const manifest = readManifest(reader);
	const entries = manifest.workflows ?? [];
	const credentialNames = new Map(
		(manifest.requirements?.credentials ?? []).map(({ id, name }) => [id, name]),
	);
	const definitions = entries.map((entry) =>
		toDefinition(entry, readWorkflow(reader, entry), credentialNames),
	);

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

function readManifest(reader: PackageReader): PackageManifest {
	const manifest = readJson<unknown>(reader, MANIFEST_FILE);
	const result = packageManifestSchema.safeParse(manifest);
	if (!result.success) throw invalidFile(reader, MANIFEST_FILE, result.error);
	return result.data;
}

function readWorkflow(reader: PackageReader, entry: WorkflowManifestEntry): PackagedWorkflow {
	const file = `${entry.target}/${WORKFLOW_FILE}`;
	const workflow = readJson<PackagedWorkflow>(reader, file);
	const result = serializedWorkflowSchema.safeParse(workflow);
	if (!result.success) throw invalidFile(reader, file, result.error);
	return workflow;
}

function readJson<T>(reader: PackageReader, file: string): T {
	const text = reader.files(file);
	if (text === undefined) throw invalidPackage(reader, `has no file ${file}`);
	try {
		return jsonParse<T>(text);
	} catch {
		throw invalidPackage(reader, `has a file ${file} that is not valid JSON`);
	}
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

function invalidFile(reader: PackageReader, file: string, { issues }: { issues: SchemaIssue[] }) {
	const problems = issues.map(({ path, message }) => `${path.join('.')}: ${message}`);
	return invalidPackage(reader, `has an invalid file ${file}. ${problems.join('; ')}`);
}

function invalidPackage(reader: PackageReader, problem: string) {
	return new WorkflowTestError('INVALID_PACKAGE', `The package "${reader.path}" ${problem}.`);
}
