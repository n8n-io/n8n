import type { Workspace } from '../workspace';
import { runInSandbox } from '../workspace/sandbox';

export interface WorkspaceBundleManifest {
	schemaVersion: number;
}

export interface WorkspaceBundle<TManifest extends WorkspaceBundleManifest> {
	files: Map<string, string | Buffer>;
	manifest: TManifest;
	manifestPath: string;
}

export interface MaterializeWorkspaceBundleOptions<
	TBundle extends WorkspaceBundle<TManifest>,
	TManifest extends WorkspaceBundleManifest,
> {
	workspace: Workspace;
	manifestPath: string;
	expectedHash: string;
	hashField: keyof TManifest & string;
	schemaVersion: TManifest['schemaVersion'];
	loadPrebaked: () => Promise<TBundle | undefined>;
	buildBundle: () => Promise<TBundle>;
}

const BASE64_WRITE_CHUNK_SIZE = 32_000;

function escapeSingleQuotes(value: string): string {
	return value.replace(/'/g, "'\\''");
}

function stringifyWorkspaceJson(value: unknown): string {
	return `${JSON.stringify(value, null, 2)}\n`;
}

async function readWorkspaceFile(workspace: Workspace, filePath: string): Promise<string | null> {
	if (workspace.filesystem) {
		try {
			const content = await workspace.filesystem.readFile(filePath, { encoding: 'utf-8' });
			return typeof content === 'string' ? content : content.toString('utf-8');
		} catch {
			return null;
		}
	}

	if (!workspace.sandbox) return null;
	const result = await runInSandbox(workspace, `cat '${escapeSingleQuotes(filePath)}' 2>/dev/null`);
	if (result.exitCode !== 0) return null;
	return result.stdout;
}

async function writeWorkspaceFile(
	workspace: Workspace,
	filePath: string,
	content: string | Buffer,
): Promise<void> {
	if (workspace.filesystem) {
		await workspace.filesystem.writeFile(filePath, content, { recursive: true });
		return;
	}

	if (!workspace.sandbox) throw new Error('Workspace has no filesystem or sandbox to write files');

	const dir = filePath.substring(0, filePath.lastIndexOf('/'));
	if (dir) {
		const mkdir = await runInSandbox(workspace, `mkdir -p '${escapeSingleQuotes(dir)}'`);
		if (mkdir.exitCode !== 0) throw new Error(`Failed to create directory ${dir}: ${mkdir.stderr}`);
	}

	const b64 =
		typeof content === 'string'
			? Buffer.from(content, 'utf-8').toString('base64')
			: content.toString('base64');
	const tempPath = `${filePath}.base64.tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
	const escapedTempPath = escapeSingleQuotes(tempPath);
	const truncate = await runInSandbox(workspace, `: > '${escapedTempPath}'`);
	if (truncate.exitCode !== 0) {
		throw new Error(`Failed to create temp file for ${filePath}: ${truncate.stderr}`);
	}

	for (let offset = 0; offset < b64.length; offset += BASE64_WRITE_CHUNK_SIZE) {
		const chunk = b64.slice(offset, offset + BASE64_WRITE_CHUNK_SIZE);
		const append = await runInSandbox(workspace, `printf '%s' '${chunk}' >> '${escapedTempPath}'`);
		if (append.exitCode !== 0)
			throw new Error(`Failed to write file ${filePath}: ${append.stderr}`);
	}

	const decode = await runInSandbox(
		workspace,
		`base64 -d '${escapedTempPath}' > '${escapeSingleQuotes(filePath)}'; rc=$?; rm -f '${escapedTempPath}'; exit $rc`,
	);
	if (decode.exitCode !== 0) throw new Error(`Failed to decode file ${filePath}: ${decode.stderr}`);
}

async function writeWorkspaceFiles(
	workspace: Workspace,
	files: Map<string, string | Buffer>,
): Promise<void> {
	for (const [path, content] of files) {
		await writeWorkspaceFile(workspace, path, content);
	}
}

function parseManifest<TManifest extends WorkspaceBundleManifest>(
	raw: string | null,
): TManifest | null {
	if (!raw) return null;
	try {
		const parsed = JSON.parse(raw) as unknown;
		if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
		return parsed as TManifest;
	} catch {
		return null;
	}
}

function isMatchingManifest<TManifest extends WorkspaceBundleManifest>(
	manifest: TManifest | null,
	options: Pick<
		MaterializeWorkspaceBundleOptions<WorkspaceBundle<TManifest>, TManifest>,
		'expectedHash' | 'hashField' | 'schemaVersion'
	>,
): manifest is TManifest {
	return (
		manifest !== null &&
		manifest.schemaVersion === options.schemaVersion &&
		manifest[options.hashField] === options.expectedHash
	);
}

export async function materializeWorkspaceBundle<
	TBundle extends WorkspaceBundle<TManifest>,
	TManifest extends WorkspaceBundleManifest,
>(options: MaterializeWorkspaceBundleOptions<TBundle, TManifest>): Promise<TBundle> {
	const existingManifest = parseManifest<TManifest>(
		await readWorkspaceFile(options.workspace, options.manifestPath),
	);

	if (isMatchingManifest(existingManifest, options)) {
		const prebaked = await options.loadPrebaked();
		if (prebaked) return prebaked;
	}

	const bundle = await options.buildBundle();
	const files = new Map(bundle.files);
	files.set(bundle.manifestPath, stringifyWorkspaceJson(bundle.manifest));
	await writeWorkspaceFiles(options.workspace, files);
	return bundle;
}
