import type { CredentialsEntity, User } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import { jsonParse } from 'n8n-workflow';

import type { CredentialsFinderService } from '@/credentials/credentials-finder.service';

import { CapturingWriter } from '../../../io/__tests__/utils/capturing-writer';
import { CredentialExporter } from '../credential.exporter';
import { CredentialSerializer } from '../credential.serializer';
import type { WorkflowCredentialRequirement } from '../credential.types';

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

function makeRequirement(
	overrides: Partial<WorkflowCredentialRequirement> = {},
): WorkflowCredentialRequirement {
	return {
		workflowId: 'wf-1',
		credentialId: 'cred-1',
		credentialName: 'My Credential',
		credentialType: 'httpHeaderAuth',
		...overrides,
	};
}

function makeExporter() {
	const finder = mock<CredentialsFinderService>();
	const exporter = new CredentialExporter(finder, new CredentialSerializer());
	return { exporter, finder };
}

describe('CredentialExporter', () => {
	describe('empty input', () => {
		it('returns empty result and writes nothing when given no requirements', async () => {
			const { exporter, finder } = makeExporter();
			const writer = new CapturingWriter();

			const result = await exporter.export({ user, requirements: [], writer });

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
				requirements: [makeRequirement()],
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

		it('dedupes by credential id and aggregates usedByWorkflows when requirements come from multiple workflows', async () => {
			const { exporter, finder } = makeExporter();
			finder.findCredentialForUser.mockResolvedValue(makeCredential());
			const writer = new CapturingWriter();

			const result = await exporter.export({
				user,
				requirements: [
					makeRequirement({ workflowId: 'wf-a' }),
					makeRequirement({ workflowId: 'wf-b' }),
				],
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
				requirements: [
					makeRequirement({ credentialId: 'cred-a', credentialName: 'Same Name' }),
					makeRequirement({ credentialId: 'cred-b', credentialName: 'Same Name' }),
				],
				writer,
			});

			const targets = result.entries.map((e) => e.target);
			expect(targets).toEqual(['credentials/same-name', 'credentials/same-name-2']);

			const writtenPaths = writer.files.map((f) => f.path);
			expect(writtenPaths).toContain('credentials/same-name/credential.json');
			expect(writtenPaths).toContain('credentials/same-name-2/credential.json');
		});

		it('emits a requirements-only entry when the credential is unfindable for the caller', async () => {
			// findCredentialForUser returns null for both "row missing" and
			// "row exists but the caller lacks credential:read"; the unit
			// can't (and shouldn't) distinguish them. Either way the
			// exporter must still pass the credential:read scope so the
			// finder applies the right policy.
			const { exporter, finder } = makeExporter();
			finder.findCredentialForUser.mockResolvedValue(null);
			const writer = new CapturingWriter();

			const result = await exporter.export({
				user,
				requirements: [
					makeRequirement({
						credentialId: 'cred-unavailable',
						credentialName: 'Stale node name',
						credentialType: 'httpHeaderAuth',
						workflowId: 'wf-1',
					}),
				],
				writer,
			});

			expect(finder.findCredentialForUser).toHaveBeenCalledWith('cred-unavailable', user, [
				'credential:read',
			]);

			expect(result.entries).toEqual([]);
			expect(result.requirements).toEqual([
				{
					id: 'cred-unavailable',
					name: 'Stale node name',
					type: 'httpHeaderAuth',
					usedByWorkflows: ['wf-1'],
				},
			]);
			expect(writer.files).toEqual([]);
			expect(writer.directories).toEqual([]);
		});

		it('handles a mix of accessible and unavailable requirements in one call', async () => {
			const { exporter, finder } = makeExporter();
			finder.findCredentialForUser.mockImplementation(async (id) => {
				await Promise.resolve();
				return id === 'cred-1' ? makeCredential() : null;
			});
			const writer = new CapturingWriter();

			const result = await exporter.export({
				user,
				requirements: [
					makeRequirement({ credentialId: 'cred-1', workflowId: 'wf-1' }),
					makeRequirement({
						credentialId: 'cred-unavailable',
						credentialName: 'Unavailable',
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
					id: 'cred-unavailable',
					name: 'Unavailable',
					type: 'slackOAuth2Api',
					usedByWorkflows: ['wf-1'],
				},
			]);
			expect(writer.files).toHaveLength(1);
		});
	});
});
