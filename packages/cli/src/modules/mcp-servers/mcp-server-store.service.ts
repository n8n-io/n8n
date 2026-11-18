import { createHash, randomBytes } from 'node:crypto';

import type {
	AddMcpServerResourceDto,
	AddMcpServerToolDto,
	CreateMcpServerDto,
	McpServerAnalyticsDto,
	McpServerApiKeyDto,
	McpServerCallDto,
	McpServerCallListDto,
	McpServerCallsQueryDto,
	McpServerCountDto,
	McpServerCreatedApiKeyDto,
	McpServerDetailDto,
	McpServerOAuthConnectionDto,
	McpServerResourceDto,
	McpServerShareDto,
	McpServerSummaryDto,
	McpServerToolBehavior,
	McpServerToolDto,
	UpdateMcpServerDto,
	UpdateMcpServerToolDto,
} from '@n8n/api-types';
import { MCP_SERVERS_RUNTIME_PREFIX } from '@n8n/api-types';
import { UrlService } from '@n8n/backend-services';
import type { User } from '@n8n/db';
import { UserRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { BadRequestError, NotFoundError } from '@n8n/errors';

import { Push } from '@/push';

import { accountEmail, accountName } from './account-label';

import type {
	McpServerCallEntity,
	McpServerEntity,
	McpServerResourceEntity,
	McpServerToolEntity,
} from './database/mcp-server.entities';
import { McpServerRepository } from './database/mcp-server.repository';
import {
	missingCapabilities,
	serverHealth,
	sessionOutcomes,
	worstTool,
} from './mcp-server-insights';
import {
	McpServerTargetsService,
	toToolName,
	type ResolvedTarget,
} from './mcp-server-targets.service';

export type ChangeSource = 'user' | 'assistant';

const DAY_MS = 24 * 60 * 60 * 1000;

export function hashApiKey(key: string) {
	return createHash('sha256').update(key).digest('hex');
}

function slugify(value: string) {
	return (
		value
			.normalize('NFKD')
			.toLowerCase()
			.replace(/[^a-z0-9\s-]/g, '')
			.trim()
			.replace(/[\s-]+/g, '-')
			.replace(/^-+|-+$/g, '')
			.slice(0, 60) || 'server'
	);
}

function parseJson(value: string | null): unknown {
	if (value === null) return null;
	try {
		return JSON.parse(value);
	} catch {
		return value;
	}
}

function median(values: number[]): number | null {
	if (values.length === 0) return null;
	const sorted = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function countBy<T>(items: T[], key: (item: T) => string | null | undefined): McpServerCountDto[] {
	const counts = new Map<string, number>();
	for (const item of items) {
		const name = key(item);
		if (!name) continue;
		counts.set(name, (counts.get(name) ?? 0) + 1);
	}
	return [...counts.entries()]
		.map(([name, count]) => ({ name, count }))
		.sort((a, b) => b.count - a.count);
}

function isError(status: string) {
	return status === 'error';
}

export interface ResolvedTool {
	row: McpServerToolEntity;
	target: ResolvedTarget;
	name: string;
	description: string;
	inputs: McpServerToolDto['inputs'];
}

/**
 * The use cases of the MCP Servers feature. The REST API, the runtime and the
 * Assistant tool set all change servers through this service, so every change
 * sends the same push event.
 */
@Service()
export class McpServerStoreService {
	constructor(
		private readonly repository: McpServerRepository,
		private readonly targets: McpServerTargetsService,
		private readonly urlService: UrlService,
		private readonly userRepository: UserRepository,
		private readonly push: Push,
	) {}

	runtimeUrl(slug: string) {
		return `${this.urlService.getInstanceBaseUrl()}/${MCP_SERVERS_RUNTIME_PREFIX}/${slug}`;
	}

	shareUrl(slug: string) {
		return `${this.urlService.getInstanceBaseUrl()}/mcp-share/${slug}`;
	}

	// --- servers --------------------------------------------------------------

	async list(): Promise<McpServerSummaryDto[]> {
		const servers = await this.repository.listServers();
		return await this.toSummaries(servers);
	}

	async get(id: string): Promise<McpServerDetailDto> {
		const server = await this.requireServer(id);
		return await this.toDetail(server);
	}

	async requireServer(id: string) {
		const server = await this.repository.findServer(id);
		if (!server) throw new NotFoundError('MCP server not found');
		return server;
	}

	async findBySlug(slug: string) {
		return await this.repository.findServerBySlug(slug);
	}

	async create(user: User, dto: CreateMcpServerDto, source: ChangeSource = 'user') {
		const slug = await this.freeSlug(dto.slug ?? slugify(dto.name));
		const server = await this.repository.createServer({
			slug,
			name: dto.name,
			description: dto.description ?? '',
			instructions: '',
			ownerId: user.id,
			// Safe defaults: a key is needed, the share page is internal, deletes ask first.
			accessMode: 'apiKey',
			shareVisibility: 'instance',
			confirmDestructive: true,
			confirmWrite: false,
			captureIntent: true,
			missingCapabilityTool: true,
			rateLimitPerMinute: 60,
			active: true,
			revokedUserIds: [],
		});
		this.notify(server.id, source);
		return await this.toDetail(server);
	}

	async update(id: string, dto: UpdateMcpServerDto, source: ChangeSource = 'user') {
		await this.requireServer(id);
		if (dto.slug !== undefined && (await this.repository.isSlugTaken(dto.slug, id))) {
			throw new BadRequestError(`The URL name "${dto.slug}" is in use by another MCP server.`);
		}
		const changes = Object.fromEntries(
			Object.entries(dto).filter(([, value]) => value !== undefined),
		);
		if (Object.keys(changes).length > 0) await this.repository.updateServer(id, changes);
		this.notify(id, source);
		return await this.get(id);
	}

	async delete(id: string, source: ChangeSource = 'user') {
		await this.requireServer(id);
		await this.repository.deleteServer(id);
		this.notify(id, source);
	}

	private async freeSlug(base: string) {
		let slug = base;
		for (let i = 2; await this.repository.isSlugTaken(slug); i++) slug = `${base}-${i}`;
		return slug;
	}

	// --- tools ----------------------------------------------------------------

	async addTool(id: string, dto: AddMcpServerToolDto, source: ChangeSource = 'user') {
		const server = await this.requireServer(id);
		const target = await this.targets.resolve({ kind: dto.kind, targetId: dto.targetId });
		if (target.name.startsWith('Missing')) {
			throw new BadRequestError(`No ${dto.kind} with id "${dto.targetId}" exists.`);
		}
		const existing = await this.repository.listTools([server.id]);
		const resolvedExisting = await this.resolveTools(existing);
		const taken = new Set(resolvedExisting.map((tool) => tool.name));
		let name = dto.name ?? toToolName(target.name);
		for (let i = 2; taken.has(name); i++) name = `${toToolName(target.name)}_${i}`;
		const row = await this.repository.createTool({
			serverId: server.id,
			kind: dto.kind,
			targetId: dto.targetId,
			// Store the name, so a rename of the workflow does not break AI clients.
			name,
			description: dto.description ?? null,
			behavior: dto.behavior ?? guessBehavior(target.name),
			position: existing.length,
		});
		await this.repository.touchServer(server.id);
		this.notify(server.id, source);
		return row;
	}

	async updateTool(
		id: string,
		toolId: string,
		dto: UpdateMcpServerToolDto,
		source: ChangeSource = 'user',
	) {
		await this.requireServer(id);
		const tool = await this.repository.findTool(id, toolId);
		if (!tool) throw new NotFoundError('Tool not found');
		const changes = Object.fromEntries(
			Object.entries(dto).filter(([, value]) => value !== undefined),
		);
		if (Object.keys(changes).length > 0) await this.repository.updateTool(id, toolId, changes);
		await this.repository.touchServer(id);
		this.notify(id, source);
		return await this.get(id);
	}

	async removeTool(id: string, toolId: string, source: ChangeSource = 'user') {
		await this.requireServer(id);
		await this.repository.deleteTool(id, toolId);
		await this.repository.touchServer(id);
		this.notify(id, source);
	}

	async listToolRows(serverId: string) {
		return await this.repository.listTools([serverId]);
	}

	async resolveTools(rows: McpServerToolEntity[]): Promise<ResolvedTool[]> {
		return await Promise.all(
			rows.map(async (row) => {
				const target = await this.targets.resolve(row);
				return {
					row,
					target,
					name: row.name ?? toToolName(target.name),
					description: row.description?.trim() || target.description,
					inputs: row.inputs ?? target.inputs,
				};
			}),
		);
	}

	// --- resources ------------------------------------------------------------

	async addResource(id: string, dto: AddMcpServerResourceDto, source: ChangeSource = 'user') {
		const server = await this.requireServer(id);
		if (dto.kind === 'skill') {
			if (!dto.targetId) throw new BadRequestError('Pick a skill.');
			const owner = await this.targets.getOwner(server.ownerId);
			const skill = await this.targets.readSkill(owner, dto.targetId);
			if (!skill) throw new BadRequestError('The skill was not found.');
			await this.repository.createResource({
				serverId: id,
				kind: 'skill',
				targetId: dto.targetId,
				name: skill.name,
				description: dto.description ?? skill.description,
				content: null,
				mimeType: 'text/markdown',
			});
		} else {
			if (!dto.name?.trim()) throw new BadRequestError('Give the resource a name.');
			await this.repository.createResource({
				serverId: id,
				kind: dto.kind,
				targetId: null,
				name: dto.name.trim(),
				description: dto.description ?? '',
				content: dto.content ?? '',
				mimeType: dto.mimeType ?? (dto.kind === 'text' ? 'text/markdown' : 'text/plain'),
			});
		}
		await this.repository.touchServer(id);
		this.notify(id, source);
		return await this.get(id);
	}

	async removeResource(id: string, resourceId: string, source: ChangeSource = 'user') {
		await this.requireServer(id);
		await this.repository.deleteResource(id, resourceId);
		await this.repository.touchServer(id);
		this.notify(id, source);
	}

	async listResources(serverId: string) {
		return await this.repository.listResources([serverId]);
	}

	async readResource(server: McpServerEntity, resource: McpServerResourceEntity) {
		if (resource.kind === 'skill' && resource.targetId) {
			const owner = await this.targets.getOwner(server.ownerId);
			const skill = await this.targets.readSkill(owner, resource.targetId);
			return skill?.text ?? '';
		}
		return resource.content ?? '';
	}

	resourceUri(server: Pick<McpServerEntity, 'slug'>, resource: McpServerResourceEntity) {
		const prefix = resource.kind === 'skill' ? 'skill' : 'resource';
		return `n8n://${server.slug}/${prefix}/${resource.id}`;
	}

	// --- api keys -------------------------------------------------------------

	async createApiKey(id: string, label: string): Promise<McpServerCreatedApiKeyDto> {
		await this.requireServer(id);
		const key = `mcp_${randomBytes(24).toString('base64url')}`;
		const row = await this.repository.createApiKey({
			serverId: id,
			label,
			keyHash: hashApiKey(key),
			keyHint: key.slice(-4),
		});
		this.notify(id, 'user');
		return {
			key,
			apiKey: {
				id: row.id,
				label: row.label,
				keyHint: row.keyHint,
				createdAt: row.createdAt.toISOString(),
				lastUsedAt: null,
				calls7d: 0,
			},
		};
	}

	async revokeApiKey(id: string, keyId: string) {
		await this.requireServer(id);
		await this.repository.deleteApiKey(id, keyId);
		this.notify(id, 'user');
	}

	async findApiKey(serverId: string, rawKey: string) {
		return await this.repository.findApiKeyByHash(serverId, hashApiKey(rawKey));
	}

	async markApiKeyUsed(keyId: string) {
		await this.repository.markApiKeyUsed(keyId);
	}

	// --- oauth ----------------------------------------------------------------

	async setOAuthUserRevoked(id: string, userId: string, revoked: boolean) {
		const server = await this.requireServer(id);
		const current = new Set(server.revokedUserIds ?? []);
		if (revoked) current.add(userId);
		else current.delete(userId);
		await this.repository.updateServer(id, { revokedUserIds: [...current] });
		this.notify(id, 'user');
	}

	// --- calls, logs and analytics ---------------------------------------------

	async recordCall(row: Parameters<McpServerRepository['insertCall']>[0]) {
		await this.repository.insertCall(row);
		this.push.broadcast({ type: 'mcpServerCallRecorded', data: { serverId: row.serverId } });
	}

	async listCalls(id: string, query: McpServerCallsQueryDto): Promise<McpServerCallListDto> {
		await this.requireServer(id);
		const [rows, facets] = await Promise.all([
			this.repository.listCalls(id, { ...query, limit: query.limit ?? 200 }),
			this.repository.listCallFacets(id),
		]);
		return { items: rows.map((row) => this.toCallDto(row)), ...facets };
	}

	async analytics(id: string, days = 7): Promise<McpServerAnalyticsDto> {
		await this.requireServer(id);
		const since = new Date(Date.now() - days * DAY_MS);
		const [calls, tools] = await Promise.all([
			this.repository.listCallStatsSince([id], since),
			this.repository.listTools([id]).then(async (rows) => await this.resolveTools(rows)),
		]);
		const toolNames = tools
			.filter((tool) => tool.row.enabled && tool.target.available)
			.map((tool) => tool.name);
		const toolCalls = calls.filter((call) => call.kind === 'tool');
		const errors = calls.filter((call) => isError(call.status)).length;
		const byDay = new Map<string, { calls: number; errors: number }>();
		for (let i = days - 1; i >= 0; i--) {
			byDay.set(new Date(Date.now() - i * DAY_MS).toISOString().slice(0, 10), {
				calls: 0,
				errors: 0,
			});
		}
		for (const call of calls) {
			const day = byDay.get(call.createdAt.toISOString().slice(0, 10));
			if (!day) continue;
			day.calls++;
			if (isError(call.status)) day.errors++;
		}
		return {
			days,
			calls: calls.length,
			errorRate: calls.length ? errors / calls.length : 0,
			medianDurationMs: median(
				toolCalls.flatMap((call) => (call.durationMs === null ? [] : [call.durationMs])),
			),
			callers: new Set(calls.map((call) => call.caller)).size,
			byTool: countBy(calls, (call) => call.name),
			byClient: countBy(calls, (call) => call.clientName ?? 'Unknown client'),
			byCaller: countBy(calls, (call) => call.caller),
			// ponytail: exact-match counts. Cluster the requests into themes if the list gets noisy.
			missingCapabilities: missingCapabilities(calls, toolNames),
			sessionOutcomes: sessionOutcomes(calls),
			byDay: [...byDay.entries()].map(([date, value]) => ({ date, ...value })),
		};
	}

	async share(slug: string): Promise<McpServerShareDto | null> {
		const server = await this.repository.findServerBySlug(slug);
		if (!server) return null;
		const [tools, resources, owner] = await Promise.all([
			this.repository.listTools([server.id]).then(async (rows) => await this.resolveTools(rows)),
			this.repository.listResources([server.id]),
			this.userRepository.findOneBy({ id: server.ownerId }),
		]);
		return {
			slug: server.slug,
			name: server.name,
			description: server.description,
			url: this.runtimeUrl(server.slug),
			accessMode: server.accessMode,
			ownerName: accountName(owner) || 'n8n user',
			active: server.active,
			tools: tools
				.filter((tool) => tool.row.enabled && tool.target.available)
				.map((tool) => ({
					name: tool.name,
					description: tool.description,
					behavior: tool.row.behavior,
				})),
			resources: resources.map((resource) => ({
				name: resource.name,
				kind: resource.kind,
				description: resource.description,
			})),
		};
	}

	// --- mapping --------------------------------------------------------------

	private toCallDto(row: McpServerCallEntity): McpServerCallDto {
		return {
			id: row.id,
			kind: row.kind,
			name: row.name,
			callerType: row.callerType,
			caller: row.caller,
			clientName: row.clientName,
			status: row.status,
			durationMs: row.durationMs,
			input: parseJson(row.input),
			output: parseJson(row.output),
			error: row.error,
			executionId: row.executionId,
			workflowId: row.workflowId,
			intent: row.intent,
			sessionId: row.sessionId,
			createdAt: row.createdAt.toISOString(),
		};
	}

	private async toSummaries(servers: McpServerEntity[]): Promise<McpServerSummaryDto[]> {
		const ids = servers.map((server) => server.id);
		const since = new Date(Date.now() - 7 * DAY_MS);
		const [tools, resources, keys, calls, owners] = await Promise.all([
			this.repository.listTools(ids),
			this.repository.listResources(ids),
			this.repository.listApiKeys(ids),
			this.repository.listCallStatsSince(ids, since),
			this.userRepository.findManyByIds([...new Set(servers.map((server) => server.ownerId))]),
		]);
		const resolvedTools = await this.resolveTools(tools);
		return servers.map((server) => {
			const serverTools = tools.filter((tool) => tool.serverId === server.id);
			const serverResources = resources.filter((resource) => resource.serverId === server.id);
			const serverCalls = calls.filter((call) => call.serverId === server.id);
			const owner = owners.find((user) => user.id === server.ownerId);
			const errorRate = serverCalls.length
				? serverCalls.filter((call) => isError(call.status)).length / serverCalls.length
				: 0;
			const outcomes = sessionOutcomes(serverCalls);
			const sessions = outcomes.completed + outcomes.failed + outcomes.deadEnd;
			const toolNames = resolvedTools
				.filter(
					(tool) => tool.row.serverId === server.id && tool.row.enabled && tool.target.available,
				)
				.map((tool) => tool.name);
			return {
				id: server.id,
				slug: server.slug,
				name: server.name,
				description: server.description,
				active: server.active,
				accessMode: server.accessMode,
				shareVisibility: server.shareVisibility,
				url: this.runtimeUrl(server.slug),
				workflowToolCount: serverTools.filter((tool) => tool.kind === 'workflow').length,
				agentToolCount: serverTools.filter((tool) => tool.kind === 'agent').length,
				skillCount: serverResources.filter((resource) => resource.kind === 'skill').length,
				resourceCount: serverResources.filter((resource) => resource.kind !== 'skill').length,
				apiKeyCount: keys.filter((key) => key.serverId === server.id).length,
				calls7d: serverCalls.length,
				errorRate7d: errorRate,
				health: serverHealth(
					serverCalls.length,
					errorRate,
					sessions ? outcomes.deadEnd / sessions : 0,
				),
				sessions7d: sessions,
				deadEnds7d: outcomes.deadEnd,
				missingTools7d: missingCapabilities(serverCalls, toolNames).filter(
					(item) => !item.resolvedBy,
				).length,
				worstTool: worstTool(serverCalls),
				ownerName: accountName(owner),
				updatedAt: server.updatedAt.toISOString(),
			};
		});
	}

	private async toDetail(server: McpServerEntity): Promise<McpServerDetailDto> {
		const [summary] = await this.toSummaries([server]);
		const since = new Date(Date.now() - 7 * DAY_MS);
		const [toolRows, resources, keys, calls, oauthCallers] = await Promise.all([
			this.repository.listTools([server.id]),
			this.repository.listResources([server.id]),
			this.repository.listApiKeys([server.id]),
			this.repository.listCallStatsSince([server.id], since),
			this.repository.listOAuthCallers(server.id),
		]);
		const tools = await this.resolveTools(toolRows);

		const toolDtos: McpServerToolDto[] = tools.map((tool) => ({
			id: tool.row.id,
			kind: tool.row.kind,
			targetId: tool.row.targetId,
			targetName: tool.target.name,
			targetProjectId: tool.target.projectId,
			name: tool.name,
			nameOverride: tool.row.name,
			description: tool.description,
			descriptionOverride: tool.row.description,
			behavior: tool.row.behavior,
			inputs: tool.inputs,
			inputsOverridden: tool.row.inputs !== null,
			enabled: tool.row.enabled,
			position: tool.row.position,
			available: tool.target.available,
			...(tool.target.reason ? { unavailableReason: tool.target.reason } : {}),
			...(tool.target.kind === 'workflow' && tool.target.workflow
				? {
						previewNodes: (tool.target.workflow.nodes ?? [])
							.filter((node) => !node.disabled && !node.type.endsWith('.stickyNote'))
							.map((node) => ({ name: node.name, type: node.type })),
					}
				: {}),
			calls7d: calls.filter((call) => call.kind === 'tool' && call.name === tool.name).length,
		}));

		const resourceDtos: McpServerResourceDto[] = resources.map((resource) => ({
			id: resource.id,
			kind: resource.kind,
			targetId: resource.targetId,
			name: resource.name,
			description: resource.description,
			uri: this.resourceUri(server, resource),
			mimeType: resource.mimeType,
			size: resource.content?.length ?? 0,
		}));

		const keyDtos: McpServerApiKeyDto[] = keys.map((key) => ({
			id: key.id,
			label: key.label,
			keyHint: key.keyHint,
			createdAt: key.createdAt.toISOString(),
			lastUsedAt: key.lastUsedAt?.toISOString() ?? null,
			calls7d: calls.filter((call) => call.apiKeyId === key.id).length,
		}));

		const revoked = new Set(server.revokedUserIds ?? []);
		const connections = new Map<string, McpServerOAuthConnectionDto>();
		const callerUsers = await this.userRepository.findManyByIds([
			...new Set(oauthCallers.flatMap((call) => (call.callerUserId ? [call.callerUserId] : []))),
		]);
		for (const call of oauthCallers) {
			if (!call.callerUserId) continue;
			const clientName = call.clientName ?? 'Unknown client';
			const key = `${call.callerUserId}:${clientName}`;
			const user = callerUsers.find((candidate) => candidate.id === call.callerUserId);
			const existing = connections.get(key);
			if (existing) {
				existing.lastUsedAt = call.createdAt.toISOString();
				continue;
			}
			connections.set(key, {
				userId: call.callerUserId,
				userEmail: user ? accountEmail(user) : call.caller,
				userName: user ? accountName(user) : call.caller,
				clientName,
				firstUsedAt: call.createdAt.toISOString(),
				lastUsedAt: call.createdAt.toISOString(),
				revoked: revoked.has(call.callerUserId),
			});
		}

		return {
			...summary,
			instructions: server.instructions,
			rateLimitPerMinute: server.rateLimitPerMinute,
			confirmDestructive: server.confirmDestructive,
			confirmWrite: server.confirmWrite,
			captureIntent: server.captureIntent,
			missingCapabilityTool: server.missingCapabilityTool,
			tools: toolDtos,
			resources: resourceDtos,
			apiKeys: keyDtos,
			oauthConnections: [...connections.values()].sort((a, b) =>
				b.lastUsedAt.localeCompare(a.lastUsedAt),
			),
			shareUrl: this.shareUrl(server.slug),
		};
	}

	private notify(serverId: string, source: ChangeSource) {
		this.push.broadcast({ type: 'mcpServerUpdated', data: { serverId, source } });
	}
}

/** A first guess from the name. The owner changes it in the tool editor. */
function guessBehavior(name: string): McpServerToolBehavior {
	const value = name.toLowerCase();
	if (/\b(delete|remove|purge|drop|archive)\b/.test(value)) return 'delete';
	if (/\b(create|add|update|send|post|write|set|insert|upload)\b/.test(value)) return 'write';
	return 'read';
}
