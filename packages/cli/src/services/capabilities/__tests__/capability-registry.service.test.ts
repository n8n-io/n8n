import fc from 'fast-check';
import { UnexpectedError } from 'n8n-workflow';

import { TOOLS_BY_SCOPE } from '@/modules/mcp/mcp-scopes';

import { type CapabilitySurface, defineCapability } from '../capability';
import { CapabilityRegistry } from '../capability-registry.service';

const capabilityNamed = (name: string, surfaces?: readonly CapabilitySurface[]) =>
	defineCapability({
		name,
		scope: 'workflow:read',
		surfaces,
		build: () => ({ name, config: { inputSchema: {} }, handler: () => ({ content: [] }) }),
	});

const names = (registry: CapabilityRegistry, surface: CapabilitySurface) =>
	registry.list(surface).map((capability) => capability.name);

describe('CapabilityRegistry', () => {
	it('starts empty', () => {
		const registry = new CapabilityRegistry();

		expect(registry.list('mcp')).toEqual([]);
		expect(registry.list('assistant')).toEqual([]);
	});

	it('rejects a second capability with the same name', () => {
		const registry = new CapabilityRegistry();
		registry.register(capabilityNamed('parse_thing'));

		expect(() => registry.register(capabilityNamed('parse_thing', ['assistant']))).toThrow(
			UnexpectedError,
		);
		expect(names(registry, 'mcp')).toEqual(['parse_thing']);
	});

	it('ignores a repeated registration of the same capability', () => {
		const registry = new CapabilityRegistry();
		const capability = capabilityNamed('parse_thing');

		registry.register(capability);
		registry.register(capability);

		expect(registry.list('mcp')).toEqual([capability]);
	});

	it.each(['search_workflows', 'list_workflow_tags', 'get_user_preferences'])(
		'rejects the name of the built-in MCP tool %s',
		(name) => {
			const registry = new CapabilityRegistry();

			expect(() => registry.register(capabilityNamed(name))).toThrow(UnexpectedError);
			expect(registry.list('mcp')).toEqual([]);
		},
	);

	it('lists only the capabilities of the given surface, in registration order', () => {
		const registry = new CapabilityRegistry();
		registry.register(capabilityNamed('both_one'));
		registry.register(capabilityNamed('assistant_only', ['assistant']));
		registry.register(capabilityNamed('mcp_only', ['mcp']));
		registry.register(capabilityNamed('both_two', ['assistant', 'mcp']));

		expect(names(registry, 'mcp')).toEqual(['both_one', 'mcp_only', 'both_two']);
		expect(names(registry, 'assistant')).toEqual(['both_one', 'assistant_only', 'both_two']);
	});

	it('returns a new array, so a caller cannot change the registry', () => {
		const registry = new CapabilityRegistry();
		registry.register(capabilityNamed('parse_thing'));

		registry.list('mcp').pop();

		expect(names(registry, 'mcp')).toEqual(['parse_thing']);
	});

	it('lists each capability exactly on its own surfaces (property)', () => {
		const builtIn = new Set(Object.values(TOOLS_BY_SCOPE).flat());
		const surfacesArb = fc.subarray<CapabilitySurface>(['mcp', 'assistant'], { minLength: 1 });
		const entryArb = fc.record({
			name: fc.stringMatching(/^[a-z][a-z0-9_]{0,20}$/).filter((name) => !builtIn.has(name)),
			surfaces: surfacesArb,
		});

		fc.assert(
			fc.property(
				fc.uniqueArray(entryArb, { selector: (entry) => entry.name, maxLength: 12 }),
				(entries) => {
					const registry = new CapabilityRegistry();
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
});
