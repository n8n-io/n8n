import type { BuiltTool } from '@n8n/agents';
import fc from 'fast-check';

import type { InstanceAiCapabilityTool } from '../../types';
import { collectCapabilityTools } from '../capability-tools';
import { normalizeMcpToolName } from '../mcp-tool-name-validation';

const tool = (name: string): BuiltTool => ({ name, description: name });

const entry = (name: string, alwaysLoaded = false): InstanceAiCapabilityTool => ({
	tool: tool(name),
	alwaysLoaded,
});

const toolName = fc.stringMatching(/^[A-Za-z][A-Za-z0-9_-]{0,8}$/);

describe('collectCapabilityTools', () => {
	const logger = { warn: vi.fn() };

	beforeEach(() => logger.warn.mockClear());

	it('keeps the capabilities in order and marks the always-loaded ones', () => {
		const result = collectCapabilityTools(
			[entry('parse_schedule', true), entry('list_things')],
			['workflows'],
			logger,
		);

		expect([...result.tools.keys()]).toEqual(['parse_schedule', 'list_things']);
		expect([...result.alwaysLoadedNames]).toEqual(['parse_schedule']);
		expect(logger.warn).not.toHaveBeenCalled();
	});

	it('does not mark a skipped always-loaded capability', () => {
		const result = collectCapabilityTools([entry('Workflows', true)], ['workflows'], logger);

		expect(result.tools.size).toBe(0);
		expect(result.alwaysLoadedNames.size).toBe(0);
		expect(logger.warn).toHaveBeenCalledWith(
			'Skipped capability tool with the name of another tool',
			{ toolName: 'Workflows', conflictsWith: 'workflows' },
		);
	});

	it('never keeps a name that clashes with a native tool or another capability', () => {
		fc.assert(
			fc.property(
				fc.array(fc.tuple(toolName, fc.boolean()), { maxLength: 12 }),
				fc.array(toolName, { maxLength: 6 }),
				(capabilities, nativeNames) => {
					logger.warn.mockClear();
					const result = collectCapabilityTools(
						capabilities.map(([name, alwaysLoaded]) => entry(name, alwaysLoaded)),
						nativeNames,
						logger,
					);

					const nativeKeys = new Set(nativeNames.map(normalizeMcpToolName));
					const keptKeys = [...result.tools.keys()].map(normalizeMcpToolName);
					expect(keptKeys.some((key) => nativeKeys.has(key))).toBe(false);
					expect(new Set(keptKeys).size).toBe(keptKeys.length);
					for (const name of result.alwaysLoadedNames) expect(result.tools.has(name)).toBe(true);
					// Each capability is either kept or reported as skipped.
					expect(result.tools.size + logger.warn.mock.calls.length).toBe(capabilities.length);
				},
			),
		);
	});
});
