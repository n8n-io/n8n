jest.unmock('node:fs');
jest.unmock('node:fs/promises');

const addLocalDir = jest.fn().mockReturnThis();
const runCommands = jest.fn().mockReturnThis();
const imageBase = jest.fn(() => ({ addLocalDir, runCommands }));
const loadDaytonaMock = jest.fn(() => ({
	Image: {
		base: imageBase,
	},
}));

jest.mock('@n8n/ai-utilities/sandbox', () => ({
	loadDaytona: () => loadDaytonaMock(),
}));

jest.mock('../agent-knowledge-sandbox-image-context', () => ({
	stageFilesForKnowledgeRunnerImage: jest.fn(async () => ({ stagingDir: '/tmp/staged-runner' })),
	disposeKnowledgeRunnerImageContext: jest.fn(async () => {}),
}));

import { AgentKnowledgeSandboxImageService } from '../agent-knowledge-sandbox-image.service';
import { stageFilesForKnowledgeRunnerImage } from '../agent-knowledge-sandbox-image-context';
import {
	KNOWLEDGE_CSV_RUNNER_BAKE_ROOT,
	KNOWLEDGE_CSV_RUNNER_PATH,
} from '../agent-knowledge-sandbox-runtime';

describe('AgentKnowledgeSandboxImageService', () => {
	let service: AgentKnowledgeSandboxImageService;

	beforeEach(() => {
		jest.clearAllMocks();
		service = new AgentKnowledgeSandboxImageService();
	});

	it('prepares a Daytona image descriptor with the baked CSV runner', async () => {
		const image = await service.prepareDaytonaImage('daytonaio/sandbox:0.5.0');

		expect(loadDaytonaMock).toHaveBeenCalled();
		expect(imageBase).toHaveBeenCalledWith('daytonaio/sandbox:0.5.0');
		expect(addLocalDir).toHaveBeenCalledWith('/tmp/staged-runner', KNOWLEDGE_CSV_RUNNER_BAKE_ROOT);
		expect(runCommands).toHaveBeenCalledWith(
			expect.stringContaining(
				`cp ${KNOWLEDGE_CSV_RUNNER_BAKE_ROOT}/opt/n8n/sandbox-runners/knowledge-csv-runner.cjs ${KNOWLEDGE_CSV_RUNNER_PATH}`,
			),
		);
		expect(runCommands).toHaveBeenCalledWith(
			expect.stringContaining(`chmod 0555 ${KNOWLEDGE_CSV_RUNNER_PATH}`),
		);
		expect(image).toEqual({ addLocalDir, runCommands });
	});

	it('uses a filesystem-safe staging cache key for image names', async () => {
		await service.prepareDaytonaImage('../registry.example.test/n8n:sandbox');

		expect(stageFilesForKnowledgeRunnerImage).toHaveBeenCalledWith(
			expect.any(Map),
			expect.stringMatching(/^[a-f0-9]{16}$/),
		);
	});

	it('caches prepared images for the same base image and runner hash', async () => {
		const first = await service.prepareDaytonaImage('daytonaio/sandbox:0.5.0');
		const second = await service.prepareDaytonaImage('daytonaio/sandbox:0.5.0');

		expect(first).toBe(second);
		expect(imageBase).toHaveBeenCalledTimes(1);
	});
});
