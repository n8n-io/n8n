import type { McpScope } from '@n8n/api-types';
import { Container } from '@n8n/di';
import fc from 'fast-check';
import { UnexpectedError } from 'n8n-workflow';

import { parseScheduleCapability } from '@/modules/instance-ai/capabilities/parse-schedule.capability';

import type { CapabilitySurface } from '../capability';
import { CapabilityRegistry } from '../capability-registry.service';
import { CAPABILITY_TOOLS_BY_SCOPE, type CapabilityToolsByScope } from '../capability-scopes';
import { capabilityNamed } from './test-helpers';

const names = (registry: CapabilityRegistry, surface: CapabilitySurface) =>
	registry.list(surface).map((capability) => capability.name);

/** A registry that checks against its own list, so the tests do not depend on the real one. */
const registryListing = (toolsByScope: CapabilityToolsByScope) =>
	new CapabilityRegistry(toolsByScope);

describe('CapabilityRegistry', () => {
	it('starts empty', () => {
		const registry = new CapabilityRegistry();

		expect(registry.list('mcp')).toEqual([]);
		expect(registry.list('assistant')).toEqual([]);
	});

	it('accepts parse_schedule against the real capability list', () => {
		const registry = new CapabilityRegistry();

		registry.register(parseScheduleCapability);

		expect(CAPABILITY_TOOLS_BY_SCOPE['workflow:read']).toContain('parse_schedule');
		expect(registry.list('mcp')).toEqual([parseScheduleCapability]);
		expect(registry.list('assistant')).toEqual([parseScheduleCapability]);
	});

	// The container passes no list, so the registry of the running instance checks the real one.
	it('checks against the real capability list when the container builds it', () => {
		const registry = Container.get(CapabilityRegistry);

		registry.register(parseScheduleCapability);

		expect(() => registry.register(capabilityNamed('unlisted_thing'))).toThrow(
			'must list capability "unlisted_thing" under "workflow:read" only',
		);
		expect(registry.list('mcp')).toEqual([parseScheduleCapability]);
	});

	it('rejects a second capability with the same name', () => {
		const registry = registryListing({ 'workflow:read': ['parse_thing'] });
		registry.register(capabilityNamed('parse_thing'));

		expect(() => registry.register(capabilityNamed('parse_thing', ['assistant']))).toThrow(
			'A capability named "parse_thing" is already registered',
		);
		expect(names(registry, 'mcp')).toEqual(['parse_thing']);
		expect(names(registry, 'assistant')).toEqual(['parse_thing']);
	});

	it('ignores a repeated registration of the same capability', () => {
		const registry = registryListing({ 'workflow:read': ['parse_thing'] });
		const capability = capabilityNamed('parse_thing');

		registry.register(capability);
		registry.register(capability);

		expect(registry.list('mcp')).toEqual([capability]);
	});

	describe('checks each capability against the capability list', () => {
		it('rejects an MCP capability that the list does not name', () => {
			const registry = registryListing({ 'workflow:read': ['parse_thing'] });
			const register = () => registry.register(capabilityNamed('unlisted_thing'));

			expect(register).toThrow(UnexpectedError);
			expect(register).toThrow(
				'CAPABILITY_TOOLS_BY_SCOPE must list capability "unlisted_thing" under "workflow:read" only, but lists it under no scope',
			);
			expect(registry.list('mcp')).toEqual([]);
			expect(registry.list('assistant')).toEqual([]);
		});

		// The real list names no built-in tool, so a capability cannot take over a built-in name.
		it.each(['search_workflows', 'list_workflow_tags', 'get_user_preferences'])(
			'rejects the built-in MCP tool name %s, which the real list does not name',
			(name) => {
				const registry = new CapabilityRegistry();

				expect(() => registry.register(capabilityNamed(name))).toThrow(UnexpectedError);
				expect(registry.list('mcp')).toEqual([]);
			},
		);

		it('rejects an MCP capability that the list names under another scope only', () => {
			const registry = registryListing({ 'workflow:write': ['parse_thing'] });

			expect(() => registry.register(capabilityNamed('parse_thing', ['mcp']))).toThrow(
				'must list capability "parse_thing" under "workflow:read" only, but lists it under "workflow:write"',
			);
			expect(registry.list('mcp')).toEqual([]);
		});

		// A second scope would let a token without the capability scope reach the tool.
		it('rejects an MCP capability that the list also names under a second scope', () => {
			const registry = registryListing({
				'workflow:read': ['parse_thing'],
				'execution:read': ['parse_thing'],
			});

			expect(() => registry.register(capabilityNamed('parse_thing'))).toThrow(
				'but lists it under "workflow:read", "execution:read"',
			);
			expect(registry.list('mcp')).toEqual([]);
		});

		it('accepts a capability for the Assistant only that the list does not name', () => {
			const registry = registryListing({});
			const capability = capabilityNamed('assistant_thing', ['assistant']);

			registry.register(capability);

			expect(registry.list('assistant')).toEqual([capability]);
			expect(registry.list('mcp')).toEqual([]);
		});

		// The consent screen would offer a tool that the MCP server never registers.
		it('rejects a capability for the Assistant only that the list names', () => {
			const registry = registryListing({ 'workflow:read': ['assistant_thing'] });

			expect(() => registry.register(capabilityNamed('assistant_thing', ['assistant']))).toThrow(
				'must list capability "assistant_thing" under no scope, as MCP does not offer it, but lists it under "workflow:read"',
			);
			expect(registry.list('assistant')).toEqual([]);
		});

		it('accepts a capability under a scope other than workflow:read', () => {
			const registry = registryListing({ 'workflow:execute': ['run_thing'] });
			const capability = capabilityNamed('run_thing', ['mcp', 'assistant'], 'workflow:execute');

			registry.register(capability);

			expect(registry.list('mcp')).toEqual([capability]);
		});

		// `Partial` lets a scope key exist without a list.
		it('reads a scope without a list as a scope that lists nothing', () => {
			const registry = registryListing({
				'workflow:write': undefined,
				'workflow:read': ['parse_thing'],
			});

			registry.register(capabilityNamed('parse_thing'));

			expect(names(registry, 'mcp')).toEqual(['parse_thing']);
		});

		it('keeps the capabilities it accepted when it rejects a later one', () => {
			const registry = registryListing({ 'workflow:read': ['parse_thing'] });
			registry.register(capabilityNamed('parse_thing'));

			expect(() => registry.register(capabilityNamed('unlisted_thing'))).toThrow(UnexpectedError);
			expect(names(registry, 'mcp')).toEqual(['parse_thing']);
		});
	});

	it('lists only the capabilities of the given surface, in registration order', () => {
		const registry = registryListing({ 'workflow:read': ['both_one', 'mcp_only', 'both_two'] });
		registry.register(capabilityNamed('both_one'));
		registry.register(capabilityNamed('assistant_only', ['assistant']));
		registry.register(capabilityNamed('mcp_only', ['mcp']));
		registry.register(capabilityNamed('both_two', ['assistant', 'mcp']));

		expect(names(registry, 'mcp')).toEqual(['both_one', 'mcp_only', 'both_two']);
		expect(names(registry, 'assistant')).toEqual(['both_one', 'assistant_only', 'both_two']);
	});

	it('returns a new array, so a caller cannot change the registry', () => {
		const registry = registryListing({ 'workflow:read': ['parse_thing'] });
		registry.register(capabilityNamed('parse_thing'));

		registry.list('mcp').pop();

		expect(names(registry, 'mcp')).toEqual(['parse_thing']);
	});

	describe('properties', () => {
		const SCOPES: McpScope[] = ['workflow:read', 'workflow:write', 'execution:read'];
		const surfacesArb = fc.subarray<CapabilitySurface>(['mcp', 'assistant'], { minLength: 1 });
		const nameArb = fc.stringMatching(/^[a-z][a-z0-9_]{0,20}$/);

		it('lists each capability exactly on its own surfaces', () => {
			const entryArb = fc.record({ name: nameArb, surfaces: surfacesArb });

			fc.assert(
				fc.property(
					fc.uniqueArray(entryArb, { selector: (entry) => entry.name, maxLength: 12 }),
					(entries) => {
						const mcpNames = entries.filter((e) => e.surfaces.includes('mcp')).map((e) => e.name);
						const registry = registryListing({ 'workflow:read': mcpNames });
						for (const entry of entries) {
							registry.register(capabilityNamed(entry.name, entry.surfaces));
						}

						for (const surface of ['mcp', 'assistant'] as const) {
							const expected = entries
								.filter((entry) => entry.surfaces.includes(surface))
								.map((entry) => entry.name);
							expect(names(registry, surface)).toEqual(expected);
						}
					},
				),
			);
		});

		// What reaches MCP always matches the list that the consent screen and OAuth grants read.
		it('accepts a capability only when the list names it under exactly the scopes it needs', () => {
			const smallName = fc.constantFrom('tool_a', 'tool_b', 'tool_c');
			const listArb = fc.dictionary(fc.constantFrom(...SCOPES), fc.uniqueArray(smallName));
			const capabilityArb = fc.record({
				name: smallName,
				scope: fc.constantFrom(...SCOPES),
				surfaces: surfacesArb,
			});

			fc.assert(
				fc.property(listArb, capabilityArb, (toolsByScope, { name, scope, surfaces }) => {
					const registry = registryListing(toolsByScope);
					const listedUnder = SCOPES.filter((s) => toolsByScope[s]?.includes(name));
					const shouldAccept = surfaces.includes('mcp')
						? listedUnder.length === 1 && listedUnder[0] === scope
						: listedUnder.length === 0;
					const accepted = (() => {
						try {
							registry.register(capabilityNamed(name, surfaces, scope));
							return true;
						} catch (error) {
							expect(error).toBeInstanceOf(UnexpectedError);
							return false;
						}
					})();

					expect(accepted).toBe(shouldAccept);
					expect(registry.list('mcp').length + registry.list('assistant').length > 0).toBe(
						accepted,
					);
				}),
			);
		});
	});
});
