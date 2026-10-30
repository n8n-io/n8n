import { mockInstance, createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { DataSource, type Repository } from '@n8n/typeorm';
import { BinaryDataService } from 'n8n-core';
import { v4 as uuid } from 'uuid';

import { AgentChatAttachmentService } from '@/modules/agents/agent-chat-attachment.service';
import { AgentChatAttachment } from '@/modules/agents/entities/agent-chat-attachment.entity';
import { AgentExecutionThreadRepository } from '@/modules/agents/repositories/agent-execution-thread.repository';
import { AgentFileGrantRepository } from '@/modules/agents/repositories/agent-file-grant.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';

describe('Agent file read grants', () => {
	const binaryDataService = mockInstance(BinaryDataService);
	let service: AgentChatAttachmentService;
	let attachmentRepo: Repository<AgentChatAttachment>;
	let threadRepo: AgentExecutionThreadRepository;
	let agentRepo: AgentRepository;
	let projectId: string;
	let agentId: string;

	beforeAll(async () => {
		await testModules.loadModules(['agents']);
		await testDb.init();
		service = Container.get(AgentChatAttachmentService);
		attachmentRepo = Container.get(DataSource).getRepository(AgentChatAttachment);
		threadRepo = Container.get(AgentExecutionThreadRepository);
		agentRepo = Container.get(AgentRepository);
	});

	beforeEach(async () => {
		projectId = (await createTeamProject()).id;
		agentId = (
			await agentRepo.save(
				agentRepo.create({
					id: uuid(),
					name: 'Agent',
					projectId,
					integrations: [],
					tools: {},
					skills: {},
				}),
			)
		).id;
		let id = 0;
		binaryDataService.store.mockImplementation(async () => ({
			id: `filesystem-v2:file-${++id}`,
			data: 'filesystem-v2',
			mimeType: 'text/plain',
		}));
	});

	afterEach(async () => {
		await attachmentRepo.delete({});
		await threadRepo.delete({});
		await agentRepo.delete({});
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	/** Delegation tree: root → child → grandchild. */
	async function createTree() {
		const create = async (parentThreadId: string | null) =>
			await threadRepo.save(
				threadRepo.create({
					id: uuid(),
					agentId,
					agentName: 'Agent',
					projectId,
					accessScope: 'project',
					ownerId: null,
					parentThreadId,
					parentAgentId: parentThreadId ? agentId : null,
				}),
			);
		const root = await create(null);
		const child = await create(root.id);
		const grandchild = await create(child.id);
		return { root: root.id, child: child.id, grandchild: grandchild.id };
	}

	async function storeFile(threadId: string) {
		return await service.storeInbound({
			agentId,
			projectId,
			threadId,
			source: 'tool',
			fileName: 'file.txt',
			mimeType: 'text/plain',
			data: Buffer.from('x'),
		});
	}

	const canRead = async (fileId: string, threadId: string) =>
		(await service.getReadable(fileId, { projectId, threadId })) !== null;

	it('stores files of sub-agents under the root thread', async () => {
		const tree = await createTree();

		const file = await storeFile(tree.grandchild);

		expect(file).toMatchObject({ threadId: tree.root, createdByThreadId: tree.grandchild });
		expect(await canRead(file.id, tree.grandchild)).toBe(true);
		expect(await canRead(file.id, tree.root)).toBe(true);
		expect(await canRead(file.id, tree.child)).toBe(false);
	});

	it('passes a grant down two levels of delegation', async () => {
		const tree = await createTree();
		const file = await storeFile(tree.root);

		await service.grantToSubAgent([file.id], {
			projectId,
			parentThreadId: tree.root,
			childThreadId: tree.child,
		});
		await service.grantToSubAgent([file.id], {
			projectId,
			parentThreadId: tree.child,
			childThreadId: tree.grandchild,
		});

		expect(await canRead(file.id, tree.child)).toBe(true);
		expect(await canRead(file.id, tree.grandchild)).toBe(true);
	});

	it('denies a read that was not granted', async () => {
		const tree = await createTree();
		const file = await storeFile(tree.root);
		await service.grantToSubAgent([file.id], {
			projectId,
			parentThreadId: tree.root,
			childThreadId: tree.child,
		});

		expect(await canRead(file.id, tree.grandchild)).toBe(false);
		await expect(
			service.grantToSubAgent([file.id], {
				projectId,
				parentThreadId: tree.grandchild,
				childThreadId: uuid(),
			}),
		).rejects.toThrow('sub-agent of this conversation');
	});

	it('denies a file from another delegation tree', async () => {
		const tree = await createTree();
		const other = await createTree();
		const file = await storeFile(other.root);

		expect(await canRead(file.id, tree.root)).toBe(false);
		await expect(
			service.grantToSubAgent([file.id], {
				projectId,
				parentThreadId: tree.root,
				childThreadId: tree.child,
			}),
		).rejects.toThrow(`File "${file.id}" not found in this conversation`);
	});

	it('deletes grants with their file', async () => {
		const tree = await createTree();
		const file = await storeFile(tree.root);
		await service.grantToSubAgent([file.id], {
			projectId,
			parentThreadId: tree.root,
			childThreadId: tree.child,
		});

		binaryDataService.deleteManyByBinaryDataId.mockResolvedValue(undefined);
		await service.deleteByThread(tree.root, { projectId });

		expect(await Container.get(AgentFileGrantRepository).isGranted(file.id, tree.child)).toBe(
			false,
		);
	});
});
