import type { Server, Request } from 'miragejs';
import { Response } from 'miragejs';
import { jsonParse } from 'n8n-workflow';
import type { AppSchema } from '@/__tests__/server/types';
import type { VersionControlPreferences } from '@/Interface';

export function routesForVersionControl(server: Server) {
	const versionControlApiRoot = '/rest/version-control';
	const defaultVersionControlPreferences: VersionControlPreferences = {
		branchName: '',
		branches: [],
		authorName: '',
		authorEmail: '',
		repositoryUrl: '',
		branchReadOnly: false,
		branchColor: '#1d6acb',
		connected: false,
		publicKey: 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIHEX+25m',
	};

	server.post(`${versionControlApiRoot}/preferences`, (schema: AppSchema, request: Request) => {
		const requestBody = jsonParse(request.requestBody) as Partial<VersionControlPreferences>;

		return new Response(
			200,
			{},
			{
				data: {
					...defaultVersionControlPreferences,
					...requestBody,
				},
			},
		);
	});

	server.patch(`${versionControlApiRoot}/preferences`, (schema: AppSchema, request: Request) => {
		const requestBody = jsonParse(request.requestBody) as Partial<VersionControlPreferences>;

		return new Response(
			200,
			{},
			{
				data: {
					...defaultVersionControlPreferences,
					...requestBody,
				},
			},
		);
	});

	server.get(`${versionControlApiRoot}/get-branches`, () => {
		return new Response(
			200,
			{},
			{
				data: {
					branches: ['main', 'dev'],
					currentBranch: 'main',
				},
			},
		);
	});

	server.post(`${versionControlApiRoot}/disconnect`, () => {
		return new Response(
			200,
			{},
			{
				data: {
					...defaultVersionControlPreferences,
					branchName: '',
					connected: false,
				},
			},
		);
	});
}
