import {
	migrateToLatest,
	trustedSourceConfigSchemaFor,
	type ManagedBy,
	type TrustedSourceConfigInput,
} from '../trusted-source-config';
import { toTrustedSourceTelemetryFacets, trustedSourceFacetsOf } from '../trusted-source-facets';

const parse = (input: TrustedSourceConfigInput, managedBy: ManagedBy = 'admin') =>
	migrateToLatest(trustedSourceConfigSchemaFor(managedBy).parse(input));

describe('trustedSourceFacetsOf', () => {
	it('reads the defaults of a minimal admin config', () => {
		const config = parse({
			version: 1,
			authentication: { type: 'oauth2' },
			surfaces: { 'public-api': {} },
		});

		expect(trustedSourceFacetsOf(config)).toEqual({
			discoveryMode: 'auto',
			clientKind: null,
			surfaces: ['public-api'],
			identitySubject: 'binding',
			linkByEmail: 'verified-only',
			provisionHuman: 'off',
			roleMappingMode: 'off',
		});
	});

	it('reads every explicit choice of an admin config', () => {
		const config = parse({
			version: 1,
			authentication: {
				type: 'oauth2',
				discovery: { mode: 'manual', jwksUri: 'https://idp.example.com/jwks' },
				client: { kind: 'registered', clientId: 'n8n-client', clientSecret: 'top-secret' },
			},
			surfaces: {
				'public-api': {},
				'instance-mcp': {},
				trigger: { audiences: ['hooks'] },
				apps: {},
			},
			identity: {
				linkByEmail: 'any',
				provision: { human: 'jit' },
				roleMapping: { mode: 'continuous', fallbackInstanceRole: 'global:member' },
			},
		});

		expect(trustedSourceFacetsOf(config)).toEqual({
			discoveryMode: 'manual',
			clientKind: 'registered',
			surfaces: ['public-api', 'instance-mcp', 'trigger', 'apps'],
			identitySubject: 'binding',
			linkByEmail: 'any',
			provisionHuman: 'jit',
			roleMappingMode: 'continuous',
		});
	});

	it('reads the subject mode and virtual client of a system config', () => {
		const config = parse(
			{
				version: 1,
				authentication: {
					type: 'oauth2',
					keys: { kind: 'local-keystore' },
					client: { kind: 'virtual' },
				},
				surfaces: { 'instance-mcp': {} },
				identity: { subject: 'n8n-user-id' },
			},
			'system',
		);

		expect(trustedSourceFacetsOf(config)).toMatchObject({
			identitySubject: 'n8n-user-id',
			clientKind: 'virtual',
		});
	});

	it('carries no URL and no client credential', () => {
		const config = parse({
			version: 1,
			authentication: {
				type: 'oauth2',
				discovery: { mode: 'manual', jwksUri: 'https://idp.example.com/jwks' },
				client: { kind: 'registered', clientId: 'n8n-client', clientSecret: 'top-secret' },
			},
			surfaces: { 'public-api': {} },
		});

		const written = JSON.stringify(trustedSourceFacetsOf(config));

		expect(written).not.toContain('https://');
		expect(written).not.toContain('n8n-client');
		expect(written).not.toContain('top-secret');
	});
});

describe('toTrustedSourceTelemetryFacets', () => {
	it('maps every facet to its snake_case telemetry property', () => {
		expect(
			toTrustedSourceTelemetryFacets({
				discoveryMode: 'manual',
				clientKind: 'registered',
				surfaces: ['public-api', 'trigger'],
				identitySubject: 'binding',
				linkByEmail: 'any',
				provisionHuman: 'jit',
				roleMappingMode: 'on-provision',
			}),
		).toEqual({
			discovery_mode: 'manual',
			client_kind: 'registered',
			surfaces: ['public-api', 'trigger'],
			identity_subject: 'binding',
			link_by_email: 'any',
			provision_human: 'jit',
			role_mapping_mode: 'on-provision',
		});
	});
});
