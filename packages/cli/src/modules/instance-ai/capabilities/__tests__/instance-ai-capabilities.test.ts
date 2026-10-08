import { Container } from '@n8n/di';

import { CapabilityRegistry } from '@/services/capabilities/capability-registry.service';

import { proposeAutomationCapability } from '../../automation/propose-automation.capability';
import {
	INSTANCE_AI_CAPABILITIES,
	registerInstanceAiCapabilities,
} from '../instance-ai-capabilities';
import { parseScheduleCapability } from '../parse-schedule.capability';

const namesOn = (registry: CapabilityRegistry, surface: 'mcp' | 'assistant') =>
	registry.list(surface).map((capability) => capability.name);

describe('registerInstanceAiCapabilities', () => {
	afterEach(() => {
		Container.set(CapabilityRegistry, new CapabilityRegistry());
	});

	it('owns parse_schedule and propose_automation', () => {
		expect(INSTANCE_AI_CAPABILITIES).toEqual([
			parseScheduleCapability,
			proposeAutomationCapability,
		]);
	});

	it('registers its capabilities for MCP clients and for the n8n Assistant', () => {
		const registry = new CapabilityRegistry();

		registerInstanceAiCapabilities(registry);

		expect(namesOn(registry, 'mcp')).toEqual(['parse_schedule', 'propose_automation']);
		expect(namesOn(registry, 'assistant')).toEqual(['parse_schedule', 'propose_automation']);
	});

	// The real registry checks each one against CAPABILITY_TOOLS_BY_SCOPE, so this also proves
	// that the consent screen lists every capability that the module offers over MCP.
	it('registers every capability that the module owns, in order', () => {
		const registry = new CapabilityRegistry();

		registerInstanceAiCapabilities(registry);

		const registered = new Set([...registry.list('mcp'), ...registry.list('assistant')]);
		expect([...registered]).toEqual([...INSTANCE_AI_CAPABILITIES]);
	});

	it('changes nothing when the module init runs again', () => {
		const registry = new CapabilityRegistry();

		registerInstanceAiCapabilities(registry);
		registerInstanceAiCapabilities(registry);

		expect(namesOn(registry, 'mcp')).toEqual(['parse_schedule', 'propose_automation']);
	});

	it('uses the registry of the container by default', () => {
		const registry = new CapabilityRegistry();
		Container.set(CapabilityRegistry, registry);

		registerInstanceAiCapabilities();

		expect(namesOn(registry, 'assistant')).toEqual(['parse_schedule', 'propose_automation']);
	});
});
