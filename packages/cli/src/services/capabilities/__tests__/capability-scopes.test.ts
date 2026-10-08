import { UnexpectedError } from 'n8n-workflow';

import { CapabilityRegistry } from '../capability-registry.service';
import { CAPABILITY_TOOLS_BY_SCOPE, PARSE_SCHEDULE_CAPABILITY_NAME } from '../capability-scopes';
import { capabilityNamed, LATE_TOOL_NAME, lateWritesToCapabilityList } from './test-helpers';

describe('CAPABILITY_TOOLS_BY_SCOPE', () => {
	const original = structuredClone(CAPABILITY_TOOLS_BY_SCOPE);

	it('lists parse_schedule under workflow:read', () => {
		expect(PARSE_SCHEDULE_CAPABILITY_NAME).toBe('parse_schedule');
		expect(CAPABILITY_TOOLS_BY_SCOPE['workflow:read']).toContain('parse_schedule');
	});

	it('cannot be changed at runtime', () => {
		const lists = Object.values(CAPABILITY_TOOLS_BY_SCOPE);

		expect(Object.isFrozen(CAPABILITY_TOOLS_BY_SCOPE)).toBe(true);
		expect(lists.length).toBeGreaterThan(0);
		for (const names of lists) expect(Object.isFrozen(names)).toBe(true);
	});

	// Test files are ES modules, so a write to a frozen object throws instead of doing nothing.
	describe.each(lateWritesToCapabilityList())('a write that $description', ({ write }) => {
		it('throws a TypeError and leaves the map as it was', () => {
			expect(write).toThrow(TypeError);
			expect(CAPABILITY_TOOLS_BY_SCOPE).toEqual(original);
		});

		// The registry of the running instance checks against this map when a module registers.
		it('leaves the registry checking against the original map', () => {
			expect(write).toThrow(TypeError);
			const registry = new CapabilityRegistry();
			const registerLateTool = () => registry.register(capabilityNamed(LATE_TOOL_NAME));

			expect(registerLateTool).toThrow(UnexpectedError);
			expect(registerLateTool).toThrow(
				`CAPABILITY_TOOLS_BY_SCOPE must list capability "${LATE_TOOL_NAME}" under "workflow:read" only, but lists it under no scope`,
			);
			registry.register(capabilityNamed(PARSE_SCHEDULE_CAPABILITY_NAME));
			expect(registry.list('mcp').map((capability) => capability.name)).toEqual([
				PARSE_SCHEDULE_CAPABILITY_NAME,
			]);
		});
	});
});
