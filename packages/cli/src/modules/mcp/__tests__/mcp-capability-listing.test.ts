import { MCP_INSTANCE_SCOPES } from '@n8n/api-types';
import type { LicenseState, ModuleRegistry } from '@n8n/backend-common';
import type { UrlService } from '@n8n/backend-services';
import type { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import fc from 'fast-check';
import { UnexpectedError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { registerInstanceAiCapabilities } from '@/modules/instance-ai/capabilities/instance-ai-capabilities';
import type { PostHogClient } from '@/posthog';
import {
	capabilityNamed,
	LATE_TOOL_NAME,
	lateWritesToCapabilityList,
} from '@/services/capabilities/__tests__/test-helpers';
import type { CapabilitySurface } from '@/services/capabilities/capability';
import { CapabilityRegistry } from '@/services/capabilities/capability-registry.service';
import { CAPABILITY_TOOLS_BY_SCOPE } from '@/services/capabilities/capability-scopes';

import { McpProtectedResource } from '../mcp-protected-resource';
import { getAllowedToolNames, TOOLS_BY_SCOPE } from '../mcp-scopes';
import type { McpConfig } from '../mcp.config';
import type { McpSettingsService } from '../mcp.settings.service';

type Listing = Record<string, readonly string[]>;

/** Every other consent filter is off, so only the registry decides which capabilities consent lists. */
function consentWithEveryFeatureOn(): McpProtectedResource {
	const moduleRegistry = mock<ModuleRegistry>({ settings: mock<ModuleRegistry['settings']>() });
	moduleRegistry.isActive.mockReturnValue(true);
	vi.mocked(moduleRegistry.settings.get).mockReturnValue(undefined);
	const licenseState = mock<LicenseState>();
	licenseState.isFoldersLicensed.mockReturnValue(true);
	const postHogClient = mock<PostHogClient>();
	postHogClient.getFeatureFlagForInstance.mockResolvedValue(true);
	const globalConfig = mock<GlobalConfig>({
		endpoints: { mcpBuilderEnabled: true },
		tags: { disabled: false },
	});

	return new McpProtectedResource(
		mock<UrlService>(),
		mock<McpSettingsService>(),
		mock<McpConfig>(),
		globalConfig,
		moduleRegistry,
		licenseState,
		postHogClient,
	);
}

const scopesListing = (listing: Listing, name: string) =>
	Object.entries(listing)
		.filter(([, tools]) => tools.includes(name))
		.map(([scope]) => scope);

const scopesAllowing = (name: string) =>
	MCP_INSTANCE_SCOPES.filter((scope) => getAllowedToolNames([scope])?.has(name));

const allowedByScope = () => MCP_INSTANCE_SCOPES.map((scope) => getAllowedToolNames([scope]));

/** Puts the registry where consent reads it, as the running instance does after module init. */
function useRegistry(): CapabilityRegistry {
	const registry = new CapabilityRegistry();
	Container.set(CapabilityRegistry, registry);
	return registry;
}

/** The registry rejects an assistant-only capability with a listed name, so registration can fail. */
function tryRegister(
	registry: CapabilityRegistry,
	...args: Parameters<typeof capabilityNamed>
): void {
	try {
		registry.register(capabilityNamed(...args));
	} catch (error) {
		expect(error).toBeInstanceOf(UnexpectedError);
	}
}

/**
 * A capability that is registered for MCP is in TOOLS_BY_SCOPE, in the allowed tools and on the
 * consent screen, each under its own scope only. Consent lists no other capability, and every
 * tool that consent lists under a scope is in TOOLS_BY_SCOPE and in the allowed tools for it.
 */
function expectSameListingEverywhere(
	consent: Listing,
	registry: CapabilityRegistry,
	capabilityNames: Set<string>,
) {
	const registered = registry.list('mcp');
	for (const { name, scope } of registered) {
		expect(scopesListing(TOOLS_BY_SCOPE, name)).toEqual([scope]);
		expect(scopesAllowing(name)).toEqual([scope]);
		expect(scopesListing(consent, name)).toEqual([scope]);
	}

	const consentCapabilities = Object.values(consent)
		.flat()
		.filter((name) => capabilityNames.has(name));
	expect(new Set(consentCapabilities)).toEqual(new Set(registered.map(({ name }) => name)));

	for (const [scope, tools] of Object.entries(consent)) {
		const allowed = getAllowedToolNames([scope]);
		for (const tool of tools) {
			expect(scopesListing(TOOLS_BY_SCOPE, tool)).toContain(scope);
			expect(allowed?.has(tool)).toBe(true);
		}
	}
}

describe('MCP capability listing', () => {
	const consent = consentWithEveryFeatureOn();
	const listedCapabilities = MCP_INSTANCE_SCOPES.flatMap((scope) =>
		(CAPABILITY_TOOLS_BY_SCOPE[scope] ?? []).map((name) => ({ scope, name })),
	);
	const listedNames = new Set(listedCapabilities.map(({ name }) => name));
	const isAnyTool = (name: string) =>
		Object.values(TOOLS_BY_SCOPE).some((tools) => tools.includes(name));

	afterAll(() => {
		Container.set(CapabilityRegistry, new CapabilityRegistry());
	});

	it('lists each capability that the instance-ai module registers in all three places', async () => {
		const registry = useRegistry();
		registerInstanceAiCapabilities(registry);

		const listing = await consent.getScopeTools();

		expect(registry.list('mcp').length).toBeGreaterThan(0);
		expectSameListingEverywhere(listing, registry, listedNames);
	});

	// Consent hides a listed capability until a module registers it.
	it('lists no capability on the consent screen while no module registered one', async () => {
		const registry = useRegistry();

		const listing = await consent.getScopeTools();

		for (const { scope, name } of listedCapabilities) {
			expect(scopesListing(TOOLS_BY_SCOPE, name)).toEqual([scope]);
			expect(scopesListing(listing, name)).toEqual([]);
		}
		expectSameListingEverywhere(listing, registry, listedNames);
	});

	describe('properties', () => {
		const surfacesArb = fc.subarray<CapabilitySurface>(['mcp', 'assistant'], { minLength: 1 });
		const registrationsArb = fc.uniqueArray(
			fc.record({ listed: fc.constantFrom(...listedCapabilities), surfaces: surfacesArb }),
			{ selector: ({ listed }) => listed.name },
		);
		const unlistedNameArb = fc
			.stringMatching(/^[a-z][a-z0-9_]{0,20}$/)
			.filter((name) => !isAnyTool(name));

		it('lists a capability in all three places if it is registered for MCP, and else on consent nowhere', async () => {
			await fc.assert(
				fc.asyncProperty(registrationsArb, fc.option(unlistedNameArb), async (drawn, unlisted) => {
					const registry = useRegistry();
					for (const { listed, surfaces } of drawn) {
						tryRegister(registry, listed.name, surfaces, listed.scope);
					}
					if (unlisted !== null) {
						expect(() => registry.register(capabilityNamed(unlisted))).toThrow(UnexpectedError);
					}

					const listing = await consent.getScopeTools();

					const expectedMcp = drawn.filter(({ surfaces }) => surfaces.includes('mcp'));
					expect(new Set(registry.list('mcp').map(({ name }) => name))).toEqual(
						new Set(expectedMcp.map(({ listed }) => listed.name)),
					);
					const capabilityNames = new Set([
						...listedNames,
						...(unlisted === null ? [] : [unlisted]),
					]);
					expectSameListingEverywhere(listing, registry, capabilityNames);
					if (unlisted !== null) {
						expect(scopesAllowing(unlisted)).toEqual([]);
						expect(scopesListing(listing, unlisted)).toEqual([]);
					}
				}),
			);
		});
	});

	// Runs last: if the freeze ever breaks, these writes change the map for the rest of the file.
	describe('after a late write to CAPABILITY_TOOLS_BY_SCOPE', () => {
		// With no capability registered, a write that empties a list would show its tools on consent.
		it('keeps TOOLS_BY_SCOPE, the allowed tools and the consent listing as they were', async () => {
			useRegistry();
			const toolsBefore = structuredClone(TOOLS_BY_SCOPE);
			const allowedBefore = allowedByScope();
			const consentBefore = await consent.getScopeTools();

			for (const { write } of lateWritesToCapabilityList()) {
				try {
					write();
				} catch (error) {
					expect(error).toBeInstanceOf(TypeError);
				}
			}

			expect(TOOLS_BY_SCOPE).toEqual(toolsBefore);
			expect(allowedByScope()).toEqual(allowedBefore);
			expect(await consent.getScopeTools()).toEqual(consentBefore);
			expect(() => new CapabilityRegistry().register(capabilityNamed(LATE_TOOL_NAME))).toThrow(
				`must list capability "${LATE_TOOL_NAME}" under "workflow:read" only, but lists it under no scope`,
			);
		});
	});
});
