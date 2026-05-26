import type { CredentialsEntity, User } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import { jsonParse } from 'n8n-workflow';
import type { Readable } from 'node:stream';

import type { CredentialsFinderService } from '@/credentials/credentials-finder.service';

import type { PackageWriter } from '../../../io/package-writer';
import type { CredentialReferenceFromWorkflow } from '../../workflow/workflow.types';
import { CredentialExporter } from '../credential.exporter';
import { CredentialSerializer } from '../credential.serializer';

const user = mock<User>({ id: 'user-1' });

function makeCredential(overrides: Partial<CredentialsEntity> = {}): CredentialsEntity {
	return {
		id: 'cred-1',
		name: 'My Credential',
		type: 'httpHeaderAuth',
		data: '',
		isManaged: false,
		isGlobal: false,
		isResolvable: false,
		resolvableAllowFallback: false,
		resolverId: null,
		shared: [],
		...overrides,
	} as unknown as CredentialsEntity;
}

function makeReference(
	overrides: Partial<CredentialReferenceFromWorkflow> = {},
): CredentialReferenceFromWorkflow {
	return {
		workflowId: 'wf-1',
		credentialId: 'cred-1',
		credentialName: 'My Credential',
		credentialType: 'httpHeaderAuth',
		...overrides,
	};
}

class CapturingWriter implements PackageWriter {
	readonly files: Array<{ path: string; content: string }> = [];

	readonly directories: string[] = [];

	writeFile(path: string, content: string | Buffer): void {
		this.files.push({ path, content: content.toString() });
	}

	writeDirectory(path: string): void {
		this.directories.push(path);
	}

	finalize(): Readable {
		throw new Error('not used in this test');
	}
}

function makeExporter() {
	const finder = mock<CredentialsFinderService>();
	const exporter = new CredentialExporter(finder, new CredentialSerializer());
	return { exporter, finder };
}

describe('CredentialExporter', () => {
	describe('empty input', () => {
		it('returns empty result and writes nothing when given no references', async () => {
			const { exporter, finder } = makeExporter();
			const writer = new CapturingWriter();

			const result = await exporter.export({ user, references: [], writer });

			expect(result).toEqual({ entries: [], requirements: [] });
			expect(writer.files).toEqual([]);
			expect(writer.directories).toEqual([]);
			expect(finder.findCredentialForUser).not.toHaveBeenCalled();
		});
	});

	describe('happy path', () => {
		it('writes one accessible credential to its slugged folder and emits matching entry + requirement', async () => {
			const { exporter, finder } = makeExporter();
			finder.findCredentialForUser.mockResolvedValue(makeCredential());
			const writer = new CapturingWriter();

			const result = await exporter.export({
				user,
				references: [makeReference()],
				writer,
			});

			expect(finder.findCredentialForUser).toHaveBeenCalledWith('cred-1', user, [
				'credential:read',
			]);

			expect(result.entries).toEqual([
				{ id: 'cred-1', name: 'My Credential', target: 'credentials/my-credential' },
			]);
			expect(result.requirements).toEqual([
				{
					id: 'cred-1',
					name: 'My Credential',
					type: 'httpHeaderAuth',
					usedByWorkflows: ['wf-1'],
				},
			]);

			expect(writer.directories).toEqual(['credentials/my-credential']);
			expect(writer.files).toHaveLength(1);
			expect(writer.files[0].path).toBe('credentials/my-credential/credential.json');

			const parsed = jsonParse<Record<string, unknown>>(writer.files[0].content);
			expect(parsed).toEqual({
				id: 'cred-1',
				name: 'My Credential',
				type: 'httpHeaderAuth',
			});
		});

		it('dedupes by credential id and aggregates usedByWorkflows when refs come from multiple workflows', async () => {
			const { exporter, finder } = makeExporter();
			finder.findCredentialForUser.mockResolvedValue(makeCredential());
			const writer = new CapturingWriter();

			const result = await exporter.export({
				user,
				references: [makeReference({ workflowId: 'wf-a' }), makeReference({ workflowId: 'wf-b' })],
				writer,
			});

			expect(finder.findCredentialForUser).toHaveBeenCalledTimes(1);
			expect(result.entries).toEqual([
				{ id: 'cred-1', name: 'My Credential', target: 'credentials/my-credential' },
			]);
			expect(result.requirements).toEqual([
				{
					id: 'cred-1',
					name: 'My Credential',
					type: 'httpHeaderAuth',
					usedByWorkflows: ['wf-a', 'wf-b'],
				},
			]);
			expect(writer.files).toHaveLength(1);
		});

		it('disambiguates targets when two credentials share a name', async () => {
			const { exporter, finder } = makeExporter();
			finder.findCredentialForUser
				.mockResolvedValueOnce(makeCredential({ id: 'cred-a', name: 'Same Name' }))
				.mockResolvedValueOnce(makeCredential({ id: 'cred-b', name: 'Same Name' }));
			const writer = new CapturingWriter();

			const result = await exporter.export({
				user,
				references: [
					makeReference({ credentialId: 'cred-a', credentialName: 'Same Name' }),
					makeReference({ credentialId: 'cred-b', credentialName: 'Same Name' }),
				],
				writer,
			});

			const targets = result.entries.map((e) => e.target);
			expect(targets).toEqual(['credentials/same-name', 'credentials/same-name-2']);

			const writtenPaths = writer.files.map((f) => f.path);
			expect(writtenPaths).toContain('credentials/same-name/credential.json');
			expect(writtenPaths).toContain('credentials/same-name-2/credential.json');
		});

		it('emits requirements-only entry for an orphan reference (id missing from DB)', async () => {
			// Orphan = no row at all. findCredentialForUser returns null *and*
			// findCredentialById returns null → the reference is informational only.
			const { exporter, finder } = makeExporter();
			finder.findCredentialForUser.mockResolvedValue(null);
			finder.findCredentialById.mockResolvedValue(null);
			const writer = new CapturingWriter();

			const result = await exporter.export({
				user,
				references: [
					makeReference({
						credentialId: 'cred-orphan',
						credentialName: 'Stale node name',
						credentialType: 'httpHeaderAuth',
						workflowId: 'wf-1',
					}),
				],
				writer,
			});

			expect(result.entries).toEqual([]);
			expect(result.requirements).toEqual([
				{
					id: 'cred-orphan',
					name: 'Stale node name',
					type: 'httpHeaderAuth',
					usedByWorkflows: ['wf-1'],
				},
			]);
			expect(writer.files).toEqual([]);
			expect(writer.directories).toEqual([]);
		});

		it('handles a mix of accessible and orphan references in one call', async () => {
			const { exporter, finder } = makeExporter();
			finder.findCredentialForUser.mockImplementation(async (id) => {
				await Promise.resolve();
				return id === 'cred-1' ? makeCredential() : null;
			});
			finder.findCredentialById.mockResolvedValue(null);
			const writer = new CapturingWriter();

			const result = await exporter.export({
				user,
				references: [
					makeReference({ credentialId: 'cred-1', workflowId: 'wf-1' }),
					makeReference({
						credentialId: 'cred-orphan',
						credentialName: 'Orphan',
						credentialType: 'slackOAuth2Api',
						workflowId: 'wf-1',
					}),
				],
				writer,
			});

			expect(result.entries).toEqual([
				{ id: 'cred-1', name: 'My Credential', target: 'credentials/my-credential' },
			]);
			expect(result.requirements).toEqual([
				{
					id: 'cred-1',
					name: 'My Credential',
					type: 'httpHeaderAuth',
					usedByWorkflows: ['wf-1'],
				},
				{
					id: 'cred-orphan',
					name: 'Orphan',
					type: 'slackOAuth2Api',
					usedByWorkflows: ['wf-1'],
				},
			]);
			expect(writer.files).toHaveLength(1);
		});

		it('throws a UserError listing forbidden credential ids and writes nothing', async () => {
			// Forbidden = row exists, caller lacks credential:read. We refuse
			// the whole export rather than silently dropping the credential.
			const { exporter, finder } = makeExporter();
			finder.findCredentialForUser.mockResolvedValue(null);
			finder.findCredentialById.mockResolvedValue(makeCredential({ id: 'cred-secret' }));
			const writer = new CapturingWriter();

			await expect(
				exporter.export({
					user,
					references: [makeReference({ credentialId: 'cred-secret', workflowId: 'wf-1' })],
					writer,
				}),
			).rejects.toThrow('1 credential(s) not accessible. Export aborted.');

			expect(writer.files).toEqual([]);
			expect(writer.directories).toEqual([]);
		});

		it('errors atomically — accessible credentials are not written when a sibling is forbidden', async () => {
			const { exporter, finder } = makeExporter();
			finder.findCredentialForUser.mockImplementation(async (id) => {
				await Promise.resolve();
				return id === 'cred-ok' ? makeCredential({ id: 'cred-ok' }) : null;
			});
			finder.findCredentialById.mockImplementation(async (id) => {
				await Promise.resolve();
				return id === 'cred-secret' ? makeCredential({ id: 'cred-secret' }) : null;
			});
			const writer = new CapturingWriter();

			await expect(
				exporter.export({
					user,
					references: [
						makeReference({ credentialId: 'cred-ok', workflowId: 'wf-1' }),
						makeReference({ credentialId: 'cred-secret', workflowId: 'wf-1' }),
					],
					writer,
				}),
			).rejects.toThrow('1 credential(s) not accessible. Export aborted.');

			// Crucially the writer must not have been touched at all — even for
			// the accessible credential — so callers can never get a partial tar.
			expect(writer.files).toEqual([]);
			expect(writer.directories).toEqual([]);
		});

		it('truncates the forbidden id list at 20 with an "and N more" suffix', async () => {
			const { exporter, finder } = makeExporter();
			finder.findCredentialForUser.mockResolvedValue(null);
			finder.findCredentialById.mockImplementation(async (id) => {
				await Promise.resolve();
				return makeCredential({ id });
			});
			const writer = new CapturingWriter();

			const forbiddenIds = Array.from({ length: 25 }, (_, i) => `forbidden-${i + 1}`);

			const error = (await exporter
				.export({
					user,
					references: forbiddenIds.map((credentialId) =>
						makeReference({ credentialId, workflowId: 'wf-1' }),
					),
					writer,
				})
				.catch((e: Error) => e)) as Error & { description?: string };

			expect(error.message).toBe('25 credential(s) not accessible. Export aborted.');
			expect(error.description).toContain('and 5 more');
		});

		it('strips entity fields beyond id/name/type from the written file', async () => {
			const { exporter, finder } = makeExporter();
			// Even if the entity has extra fields, the schema must keep them out.
			finder.findCredentialForUser.mockResolvedValue(
				makeCredential({
					data: 'should-not-export',
					isManaged: true,
					isGlobal: true,
				}),
			);
			const writer = new CapturingWriter();

			await exporter.export({ user, references: [makeReference()], writer });

			const parsed = jsonParse<Record<string, unknown>>(writer.files[0].content);
			expect(Object.keys(parsed).sort()).toEqual(['id', 'name', 'type']);
		});
	});
});
