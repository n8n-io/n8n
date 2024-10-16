import type { Server, Request } from 'miragejs';
import { Response } from 'miragejs';
import { jsonParse } from 'n8n-workflow';
import type { AppSchema } from '@/__tests__/server/types';
import type { SourceControlPreferences } from '@/Interface';

export function routesForSourceControl(server: Server) {
	const sourceControlApiRoot = '/rest/source-control';
	const defaultSourceControlPreferences: SourceControlPreferences = {
		branchName: '',
		branches: [],
		repositoryUrl: '',
		branchReadOnly: false,
		branchColor: '#1d6acb',
		connected: false,
		publicKey: 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIHEX+25m',
		keyGeneratorType: 'ed25519',
	};

	server.get(`${sourceControlApiRoot}/preferences`, () => {
		return new Response(
			200,
			{},
			{
				data: defaultSourceControlPreferences,
			},
		);
	});

	server.post(`${sourceControlApiRoot}/preferences`, (_schema: AppSchema, request: Request) => {
		const requestBody: Partial<SourceControlPreferences> = jsonParse(request.requestBody);

		return new Response(
			200,
			{},
			{
				data: {
					...defaultSourceControlPreferences,
					...requestBody,
				},
			},
		);
	});

	server.patch(`${sourceControlApiRoot}/preferences`, (_schema: AppSchema, request: Request) => {
		const requestBody: Partial<SourceControlPreferences> = jsonParse(request.requestBody);

		return new Response(
			200,
			{},
			{
				data: {
					...defaultSourceControlPreferences,
					...requestBody,
				},
			},
		);
	});

	server.get(`${sourceControlApiRoot}/get-branches`, () => {
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

	server.post(`${sourceControlApiRoot}/disconnect`, () => {
		return new Response(
			200,
			{},
			{
				data: {
					...defaultSourceControlPreferences,
					branchName: '',
					connected: false,
				},
			},
		);
	});
}
