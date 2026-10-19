import type { Logger } from '@n8n/backend-common';
import { UserError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { NodeTypes } from '@/node-types';

import type { WorkflowSerializer } from '../../entities/workflow/workflow.serializer';
import type { PackageReader } from '../../io/package-reader';
import { FORMAT_VERSION } from '../../spec/constants';
import type { ManifestEntry, PackageManifest } from '../../spec/manifest.schema';
import { N8nPackageParser } from '../n8n-package-parser';

function makeReader(manifest: PackageManifest, files: Record<string, unknown>): PackageReader {
	return {
		readManifest: async () => await Promise.resolve(manifest),
		readFile: async (path: string) => {
			if (!(path in files)) throw new Error(`missing file ${path}`);
			const content = files[path];
			const raw = typeof content === 'string' ? content : JSON.stringify(content);
			return await Promise.resolve(Buffer.from(raw, 'utf-8'));
		},
		listEntries: async () => await Promise.resolve(Object.keys(files)),
	};
}

function manifestWith(extras: Partial<PackageManifest> = {}): PackageManifest {
	return {
		packageFormatVersion: FORMAT_VERSION,
		exportedAt: '2026-01-01T00:00:00.000Z',
		sourceN8nVersion: '1.0.0',
		sourceId: 'test-source',
		...extras,
	} as PackageManifest;
}

const EXPRESSION = '={{ $vars.githubToken }}';

const topLevelEntry: ManifestEntry = {
	id: 'cred-1',
	name: 'GitHub',
	target: 'credentials/github-cred-1',
};

describe('N8nPackageParser.getCredentials', () => {
	const parser = new N8nPackageParser(
		mock<Logger>(),
		mock<NodeTypes>(),
		mock<WorkflowSerializer>(),
	);

	it('reads a credential file from the top-level credentials folder, keyed by id', async () => {
		const credential = {
			id: 'cred-1',
			name: 'GitHub',
			type: 'githubApi',
			data: { accessToken: EXPRESSION },
		};
		const reader = makeReader(manifestWith({ credentials: [topLevelEntry] }), {
			'credentials/github-cred-1/credential.json': credential,
		});

		const credentials = await parser.getCredentials(reader);

		expect(credentials).toEqual(new Map([['cred-1', credential]]));
	});

	it('reads a credential file from the owner project folder', async () => {
		const credential = { id: 'cred-2', name: 'Slack', type: 'slackApi' };
		const reader = makeReader(
			manifestWith({
				projects: [{ id: 'proj-1', name: 'billing', target: 'projects/billing-proj-1' }],
				credentials: [
					{
						id: 'cred-2',
						name: 'Slack',
						target: 'projects/billing-proj-1/credentials/slack-cred-2',
					},
				],
			}),
			{ 'projects/billing-proj-1/credentials/slack-cred-2/credential.json': credential },
		);

		const credentials = await parser.getCredentials(reader);

		expect(credentials.get('cred-2')).toEqual(credential);
	});

	it('reads only the requested credential files', async () => {
		const credential = { id: 'cred-1', name: 'GitHub', type: 'githubApi' };
		const reader = makeReader(
			manifestWith({
				credentials: [
					topLevelEntry,
					{ id: 'cred-2', name: 'Slack', target: 'credentials/slack-cred-2' },
				],
			}),
			{ 'credentials/github-cred-1/credential.json': credential },
		);

		const credentials = await parser.getCredentials(reader, new Set(['cred-1']));

		expect(credentials).toEqual(new Map([['cred-1', credential]]));
	});

	it('reads a credential file without data (no-values export)', async () => {
		const reader = makeReader(manifestWith({ credentials: [topLevelEntry] }), {
			'credentials/github-cred-1/credential.json': {
				id: 'cred-1',
				name: 'GitHub',
				type: 'githubApi',
			},
		});

		const credentials = await parser.getCredentials(reader);

		expect(credentials.get('cred-1')).toEqual({ id: 'cred-1', name: 'GitHub', type: 'githubApi' });
		expect(credentials.get('cred-1')).not.toHaveProperty('data');
	});

	it('returns an empty map when the manifest lists no credential files', async () => {
		const reader = makeReader(
			manifestWith({
				requirements: {
					credentials: [
						{
							id: 'cred-1',
							name: 'GitHub',
							type: 'githubApi',
							usedBy: [{ kind: 'workflow', id: 'wf-1' }],
						},
					],
				},
			}),
			{},
		);

		const credentials = await parser.getCredentials(reader);

		expect(credentials.size).toBe(0);
	});

	it('throws a UserError when a listed credential file is missing', async () => {
		const reader = makeReader(manifestWith({ credentials: [topLevelEntry] }), {});

		const error = await parser.getCredentials(reader).catch((e: unknown) => e);

		expect(error).toBeInstanceOf(UserError);
		expect(error).toHaveProperty(
			'message',
			'Package manifest references a missing credential file at credentials/github-cred-1/credential.json.',
		);
	});

	it('throws a UserError when the credential file is not valid JSON', async () => {
		const reader = makeReader(manifestWith({ credentials: [topLevelEntry] }), {
			'credentials/github-cred-1/credential.json': '{ not json',
		});

		const error = await parser.getCredentials(reader).catch((e: unknown) => e);

		expect(error).toBeInstanceOf(UserError);
		expect(error).toHaveProperty(
			'message',
			'Package credential file at credentials/github-cred-1/credential.json is not valid JSON.',
		);
	});

	it('throws a UserError when a data value is not an expression', async () => {
		const reader = makeReader(manifestWith({ credentials: [topLevelEntry] }), {
			'credentials/github-cred-1/credential.json': {
				id: 'cred-1',
				name: 'GitHub',
				type: 'githubApi',
				data: { accessToken: 'plain-secret' },
			},
		});

		const error = await parser.getCredentials(reader).catch((e: unknown) => e);

		expect(error).toBeInstanceOf(UserError);
		expect(error).toHaveProperty(
			'message',
			'Package credential file at credentials/github-cred-1/credential.json failed schema validation.',
		);
	});

	it('throws a UserError when the file id does not match the manifest id', async () => {
		const reader = makeReader(manifestWith({ credentials: [topLevelEntry] }), {
			'credentials/github-cred-1/credential.json': {
				id: 'cred-other',
				name: 'GitHub',
				type: 'githubApi',
			},
		});

		const error = await parser.getCredentials(reader).catch((e: unknown) => e);

		expect(error).toBeInstanceOf(UserError);
		expect(error).toHaveProperty(
			'message',
			'Package credential at credentials/github-cred-1/credential.json declares id "cred-other" but the manifest lists it as "cred-1".',
		);
	});

	it('throws a UserError when the file name does not match the manifest name', async () => {
		const reader = makeReader(manifestWith({ credentials: [topLevelEntry] }), {
			'credentials/github-cred-1/credential.json': {
				id: 'cred-1',
				name: 'Renamed',
				type: 'githubApi',
			},
		});

		const error = await parser.getCredentials(reader).catch((e: unknown) => e);

		expect(error).toBeInstanceOf(UserError);
		expect(error).toHaveProperty(
			'message',
			'Package credential at credentials/github-cred-1/credential.json declares name "Renamed" but the manifest lists it as "GitHub".',
		);
	});
	it('throws a UserError when the file type does not match the requirement type', async () => {
		const reader = makeReader(
			manifestWith({
				credentials: [topLevelEntry],
				requirements: {
					credentials: [
						{
							id: 'cred-1',
							name: 'GitHub',
							type: 'githubOAuth2Api',
							usedBy: [{ kind: 'workflow', id: 'wf-1' }],
						},
					],
				},
			}),
			{
				'credentials/github-cred-1/credential.json': {
					id: 'cred-1',
					name: 'GitHub',
					type: 'githubApi',
				},
			},
		);

		const error = await parser.getCredentials(reader).catch((e: unknown) => e);

		expect(error).toBeInstanceOf(UserError);
		expect(error).toHaveProperty(
			'message',
			'Package credential at credentials/github-cred-1/credential.json declares type "githubApi" but the requirement lists it as "githubOAuth2Api".',
		);
	});

	it('accepts a credential file whose requirement has no type', async () => {
		const credential = { id: 'cred-1', name: 'GitHub', type: 'githubApi' };
		const reader = makeReader(
			manifestWith({
				credentials: [topLevelEntry],
				requirements: {
					credentials: [{ id: 'cred-1', usedBy: [{ kind: 'agent', id: 'agent-1' }] }],
				},
			}),
			{ 'credentials/github-cred-1/credential.json': credential },
		);

		const credentials = await parser.getCredentials(reader);

		expect(credentials.get('cred-1')).toEqual(credential);
	});
});
