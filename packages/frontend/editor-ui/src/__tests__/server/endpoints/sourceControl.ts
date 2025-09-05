import type { Server, Request } from 'miragejs';
import { Response } from 'miragejs';
import { jsonParse } from 'n8n-workflow';
import type { AppSchema } from '@/__tests__/server/types';
import type { SourceControlPreferences } from '@/types/sourceControl.types';

export function routesForSourceControl(server: Server) {
	const sourceControlApiRoot = '/rest/source-control';
	const defaultSshPreferences: SourceControlPreferences = {
		connected: false,
		repositoryUrl: '',
		branchName: '',
		branches: [],
		branchReadOnly: false,
		branchColor: '#1d6acb',
		protocol: 'ssh',
		username: '',
		publicKey: 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIHEX+25m',
		keyGeneratorType: 'ed25519',
	};

	const defaultHttpsPreferences: SourceControlPreferences = {
		connected: false,
		repositoryUrl: '',
		branchName: '',
		branches: [],
		branchReadOnly: false,
		branchColor: '#1d6acb',
		protocol: 'https',
		username: '',
		publicKey: '',
		keyGeneratorType: 'ed25519',
	};

	// Keep track of current protocol state for context-aware responses
	let currentProtocol: 'ssh' | 'https' = 'ssh';
	let currentPreferences = { ...defaultSshPreferences };

	server.get(`${sourceControlApiRoot}/preferences`, () => {
		return new Response(
			200,
			{},
			{
				data: currentPreferences,
			},
		);
	});

	server.post(`${sourceControlApiRoot}/preferences`, (_schema: AppSchema, request: Request) => {
		const requestBody: Partial<SourceControlPreferences> = jsonParse(request.requestBody);

		// Update protocol context if provided
		if (requestBody.protocol) {
			currentProtocol = requestBody.protocol;
			currentPreferences =
				requestBody.protocol === 'https'
					? { ...defaultHttpsPreferences, ...requestBody }
					: { ...defaultSshPreferences, ...requestBody };
		} else {
			currentPreferences = { ...currentPreferences, ...requestBody };
		}

		// Simulate validation based on protocol
		if (currentProtocol === 'https') {
			// HTTPS requires username and token for successful connection
			if (
				requestBody.repositoryUrl &&
				requestBody.username &&
				(requestBody as any).personalAccessToken &&
				!currentPreferences.connected
			) {
				currentPreferences.connected = true;
				currentPreferences.branches = ['main', 'develop', 'feature/https-auth'];
				currentPreferences.currentBranch = 'main';
			}
		} else {
			// SSH requires repository URL and public key
			if (
				requestBody.repositoryUrl &&
				currentPreferences.publicKey &&
				!currentPreferences.connected
			) {
				currentPreferences.connected = true;
				currentPreferences.branches = ['main', 'dev'];
				currentPreferences.currentBranch = 'main';
			}
		}

		return new Response(200, {}, { data: currentPreferences });
	});

	server.patch(`${sourceControlApiRoot}/preferences`, (_schema: AppSchema, request: Request) => {
		const requestBody: Partial<SourceControlPreferences> = jsonParse(request.requestBody);
		currentPreferences = { ...currentPreferences, ...requestBody };

		return new Response(200, {}, { data: currentPreferences });
	});

	server.get(`${sourceControlApiRoot}/get-branches`, () => {
		const branches =
			currentProtocol === 'https' ? ['main', 'develop', 'feature/https-auth'] : ['main', 'dev'];

		return new Response(
			200,
			{},
			{
				data: {
					branches,
					currentBranch: currentPreferences.currentBranch || 'main',
				},
			},
		);
	});

	server.post(`${sourceControlApiRoot}/disconnect`, () => {
		// Reset to SSH defaults when disconnecting
		currentProtocol = 'ssh';
		currentPreferences = {
			...defaultSshPreferences,
			branchName: '',
			connected: false,
		};

		return new Response(200, {}, { data: currentPreferences });
	});

	server.post(
		`${sourceControlApiRoot}/generate-key-pair`,
		(_schema: AppSchema, request: Request) => {
			const requestBody: { keyGeneratorType?: 'ed25519' | 'rsa' } = jsonParse(
				request.requestBody || '{}',
			);
			const keyType = requestBody.keyGeneratorType || 'ed25519';

			// Generate mock public key based on type
			const mockPublicKey =
				keyType === 'ed25519'
					? 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIHEX+25m'
					: 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQC7';

			currentPreferences.publicKey = mockPublicKey;
			currentPreferences.keyGeneratorType = keyType;

			return new Response(200, {}, { data: { publicKey: mockPublicKey } });
		},
	);

	// Add HTTPS-specific error simulation endpoints
	server.post(
		`${sourceControlApiRoot}/validate-https-connection`,
		(_schema: AppSchema, request: Request) => {
			const requestBody: {
				repositoryUrl?: string;
				username?: string;
				personalAccessToken?: string;
			} = jsonParse(request.requestBody);

			// Simulate HTTPS authentication validation
			if (!requestBody.username || !requestBody.personalAccessToken) {
				return new Response(
					401,
					{},
					{
						code: 401,
						message: 'HTTPS requires both username and personal access token',
					},
				);
			}

			if (!requestBody.repositoryUrl?.includes('https://')) {
				return new Response(
					400,
					{},
					{
						code: 400,
						message: 'Repository URL must be HTTPS format for HTTPS protocol',
					},
				);
			}

			return new Response(200, {}, { data: { valid: true } });
		},
	);
}
