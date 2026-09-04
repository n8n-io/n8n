import { McpRegistryRefreshTask } from '../mcp-registry-refresh.task';
import { McpRegistryModule } from '../mcp-registry.module';

const flags = vi.hoisted(() => ({ inE2ETests: false }));

vi.mock('@/constants', async (importOriginal) => ({
	...(await importOriginal<typeof import('@/constants')>()),
	get inE2ETests() {
		return flags.inE2ETests;
	},
}));

describe('McpRegistryModule', () => {
	const module = new McpRegistryModule();

	afterEach(() => {
		flags.inE2ETests = false;
	});

	describe('systemTasks()', () => {
		it('should register the refresh task', async () => {
			await expect(module.systemTasks()).resolves.toEqual([McpRegistryRefreshTask]);
		});

		it('should register no task in E2E tests, where the registry is seeded', async () => {
			flags.inE2ETests = true;

			await expect(module.systemTasks()).resolves.toEqual([]);
		});
	});
});
