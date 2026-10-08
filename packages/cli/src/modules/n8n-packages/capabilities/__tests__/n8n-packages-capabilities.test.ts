import { ModuleRegistry, type ModulesConfig } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { User } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';
import { UnexpectedError } from 'n8n-workflow';
import z from 'zod';

import type { RegisterToolFn, ToolDefinition, ToolHandlerResult } from '@/modules/mcp/mcp.types';
import { CapabilityRegistry } from '@/services/capabilities/capability-registry.service';

import { packageSizeLimitMessage } from '../base64-limits';
import { PackageImportConfig } from '../../n8n-packages.config';
import { N8nPackagesModule } from '../../n8n-packages.module';
import { exportWorkflowPackageCapability } from '../export-workflow-package.capability';
import { importWorkflowPackageCapability } from '../import-workflow-package.capability';
import {
	N8N_PACKAGES_CAPABILITIES,
	registerN8nPackagesCapabilities,
} from '../n8n-packages-capabilities';

const PACKAGE_TOOLS = ['export_workflow_package', 'import_workflow_package'];

const user = Object.assign(new User(), { id: 'user-1' });

const namesOn = (registry: CapabilityRegistry, surface: 'mcp' | 'assistant') =>
	registry.list(surface).map((capability) => capability.name);

/** The tools exactly as the MCP server receives them. */
const registeredTools = () => {
	const tools = new Map<string, ToolDefinition<z.ZodRawShape, ToolHandlerResult>>();
	const register: RegisterToolFn = (tool) => {
		tools.set(tool.name, tool);
	};
	for (const capability of N8N_PACKAGES_CAPABILITIES) capability.registerOn(register, { user });
	return tools;
};

const inputSchemaOf = (name: string) =>
	z.object(registeredTools().get(name)?.config.inputSchema ?? {});

describe('registerN8nPackagesCapabilities', () => {
	afterEach(() => {
		Container.set(CapabilityRegistry, new CapabilityRegistry());
		Container.get(GlobalConfig).endpoints.mcpBuilderEnabled = true;
	});

	it('owns the export and import capabilities', () => {
		expect(N8N_PACKAGES_CAPABILITIES).toEqual([
			exportWorkflowPackageCapability,
			importWorkflowPackageCapability,
		]);
	});

	// The real registry checks each one against CAPABILITY_TOOLS_BY_SCOPE, so this also proves
	// that the consent screen lists both tools under their scopes.
	it('registers both for MCP clients only', () => {
		const registry = new CapabilityRegistry();

		registerN8nPackagesCapabilities(registry);

		expect(namesOn(registry, 'mcp')).toEqual(PACKAGE_TOOLS);
		expect(namesOn(registry, 'assistant')).toEqual([]);
	});

	it('changes nothing when the module init runs again', () => {
		const registry = new CapabilityRegistry();

		registerN8nPackagesCapabilities(registry);
		registerN8nPackagesCapabilities(registry);

		expect(namesOn(registry, 'mcp')).toEqual(PACKAGE_TOOLS);
	});

	// The import writes workflow content like the builder tools, which this flag turns off.
	it('registers only the export while the MCP workflow builder is off', () => {
		Container.get(GlobalConfig).endpoints.mcpBuilderEnabled = false;
		const registry = new CapabilityRegistry();

		registerN8nPackagesCapabilities(registry);

		expect(namesOn(registry, 'mcp')).toEqual(['export_workflow_package']);
	});

	it('uses the registry of the container by default', () => {
		const registry = new CapabilityRegistry();
		Container.set(CapabilityRegistry, registry);

		registerN8nPackagesCapabilities();

		expect(namesOn(registry, 'mcp')).toEqual(PACKAGE_TOOLS);
	});
});

describe('workflow package capabilities', () => {
	const defaultPayloadSizeMax = Container.get(GlobalConfig).endpoints.payloadSizeMax;

	afterEach(() => {
		Container.set(PackageImportConfig, new PackageImportConfig());
		Container.get(GlobalConfig).endpoints.payloadSizeMax = defaultPayloadSizeMax;
	});

	it('needs workflow:read to export and workflow:write to import', () => {
		expect(exportWorkflowPackageCapability.scope).toBe('workflow:read');
		expect(importWorkflowPackageCapability.scope).toBe('workflow:write');
	});

	it('marks export as read-only and import as a repeatable write', () => {
		const tools = registeredTools();

		expect(tools.get('export_workflow_package')?.config.annotations).toEqual({
			title: 'Export workflow package',
			readOnlyHint: true,
			openWorldHint: false,
		});
		expect(tools.get('import_workflow_package')?.config.annotations).toEqual({
			title: 'Import workflow package',
			readOnlyHint: false,
			destructiveHint: true,
			idempotentHint: true,
			openWorldHint: false,
		});
	});

	it('does not offer either capability to the n8n Assistant', () => {
		for (const capability of N8N_PACKAGES_CAPABILITIES) {
			expect(() => capability.toAssistantTool({ user })).toThrow(UnexpectedError);
		}
	});

	it('needs a workflow id to export', () => {
		const schema = inputSchemaOf('export_workflow_package');

		expect(schema.safeParse({ workflowId: 'wf-1' }).success).toBe(true);
		expect(schema.safeParse({ workflowId: '' }).success).toBe(false);
		expect(schema.safeParse({}).success).toBe(false);
	});

	it('accepts a package up to the base64 size of the import limit', () => {
		Container.get(PackageImportConfig).maxUncompressedBytes = 6;
		const schema = inputSchemaOf('import_workflow_package');

		const tooLarge = schema.safeParse({ packageBase64: 'YWJjZGVmZw==' });

		expect(schema.safeParse({ packageBase64: 'YWJjZGVm' }).success).toBe(true);
		expect(tooLarge.success).toBe(false);
		expect(tooLarge.error?.issues[0]?.message).toBe(
			packageSizeLimitMessage({ maxBytes: 6, setting: 'N8N_IMPORT_MAX_UNCOMPRESSED_BYTES' }),
		);
		expect(schema.safeParse({ packageBase64: '' }).success).toBe(false);
	});

	// 0.07 MiB is 73,400 bytes. Less the 64 KiB envelope, 7,864 characters of base64 fit.
	it('accepts only a package that fits in one request body', () => {
		Container.get(GlobalConfig).endpoints.payloadSizeMax = 0.07;
		const schema = inputSchemaOf('import_workflow_package');

		const tooLarge = schema.safeParse({ packageBase64: 'A'.repeat(7868) });

		expect(schema.safeParse({ packageBase64: 'A'.repeat(7864) }).success).toBe(true);
		expect(tooLarge.success).toBe(false);
		expect(tooLarge.error?.issues[0]?.message).toContain('N8N_PAYLOAD_SIZE_MAX');
	});

	it('takes an optional project and an optional source workflow to import', () => {
		const schema = inputSchemaOf('import_workflow_package');

		expect(
			schema.safeParse({ packageBase64: 'YWJj', projectId: 'p-1', sourceWorkflowId: 'wf-1' })
				.success,
		).toBe(true);
		expect(schema.safeParse({ packageBase64: 'YWJj', projectId: '' }).success).toBe(false);
		expect(schema.safeParse({ packageBase64: 'YWJj', sourceWorkflowId: '' }).success).toBe(false);
	});
});

describe('N8nPackagesModule', () => {
	const mcpModuleActive = (active: boolean) =>
		mockInstance(ModuleRegistry, {
			isActive: vi.fn((name: string) => active && name === 'mcp'),
		});

	beforeEach(() => {
		Container.set(CapabilityRegistry, new CapabilityRegistry());
	});

	afterAll(() => {
		Container.set(CapabilityRegistry, new CapabilityRegistry());
	});

	it('registers the package capabilities once while the mcp module is active', async () => {
		const moduleRegistry = mcpModuleActive(true);
		const packagesModule = new N8nPackagesModule();

		await packagesModule.init();
		await packagesModule.init();

		expect(namesOn(Container.get(CapabilityRegistry), 'mcp')).toEqual(PACKAGE_TOOLS);
		expect(moduleRegistry.isActive).toHaveBeenCalledWith('mcp');
	});

	// Worker and webhook instances never run the mcp module, so this also covers them.
	it('registers nothing while the mcp module is not active', async () => {
		mcpModuleActive(false);

		await new N8nPackagesModule().init();

		expect(Container.get(CapabilityRegistry).list('mcp')).toEqual([]);
	});

	// Modules initialise in this order. The check above sees the mcp module as active only when
	// that module initialised first.
	it('initialises after the mcp module', () => {
		const modulesConfig = mock<ModulesConfig>({ enabledModules: [], disabledModules: [] });
		const registry = new ModuleRegistry(mock(), mock(), mock(), modulesConfig, mock());

		const order = registry.eligibleModules;

		expect(order).toContain('n8n-packages');
		expect(order.indexOf('mcp')).toBeGreaterThanOrEqual(0);
		expect(order.indexOf('mcp')).toBeLessThan(order.indexOf('n8n-packages'));
	});
});
