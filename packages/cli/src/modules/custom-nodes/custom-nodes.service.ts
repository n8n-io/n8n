import {
	customActionDraftSchema,
	type CreateCustomNodeDto,
	type CustomActionDraft,
	type CustomActionDraftIssue,
	type CustomActionParent,
	type CustomActionEditKind,
	type CustomActionResponse,
	type CustomActionVersionSummary,
	type CustomActionVersionDetailResponse,
	type CustomNodeAuth,
	type CustomNodeResponse,
	type ParentCustomActionResponse,
	type CreateParentCustomActionDto,
	type SaveCustomActionDto,
	type UpdateCustomNodeDto,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { type OperationContext, TransactionRunner, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { ForbiddenError, NotFoundError, UnexpectedError, UserError } from '@n8n/errors';
import { hasGlobalScope, type Scope } from '@n8n/permissions';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import type { INodeProperties } from 'n8n-workflow';

import { CredentialTypes } from '@/credential-types';

import { validateBaseUrl } from './base-url-validator';
import { customNodeTypeName } from './custom-nodes-node-loader';
import { CustomNodesRegistry } from './custom-nodes.registry';
import type { CustomNodeEntity } from './database/entities/custom-node.entity';
import {
	CustomActionRepository,
	type ActionAggregate,
} from './database/repositories/custom-action.repository';
import {
	CustomNodeRepository,
	type CustomNodePatch,
} from './database/repositories/custom-node.repository';
import {
	InvalidCustomActionError,
	validateDraft,
	type ValidateDraftOptions,
} from './draft-validator';
import { classifyEdit, joinDraft, splitDraft } from './edit-classifier';
import { validateIcon } from './icon-validator';
import { buildInputProperties } from './node-description.generator';
import { parentPinValues, type ParentShape } from './parent-action.generator';
import { ParentActionsProvider } from './parent-actions.provider';
import { pinValues } from './version-pin';

const REFRESH_AFTER_WRITE = { notifyEditors: true, notifyInstances: true };

type WriteIds = { nodeId?: string; actionId?: string };

/** A schema path in the path format of draft issues, for example `inputs[0].name`. */
const issuePath = (path: Array<string | number>) =>
	path
		.map((part, index) =>
			typeof part === 'number' ? `[${part}]` : index === 0 ? part : `.${part}`,
		)
		.join('');

/**
 * Checks a draft against the draft schema and then against the save rules.
 * The service checks the schema again, so that a caller without the controller gets the same checks.
 */
function checkDraft(
	input: CustomActionDraft,
	options?: ValidateDraftOptions,
): {
	draft?: CustomActionDraft;
	issues: CustomActionDraftIssue[];
} {
	const parsed = customActionDraftSchema.safeParse(input);
	if (!parsed.success) {
		return {
			issues: parsed.error.issues.map((issue) => ({
				path: issuePath(issue.path),
				code: issue.code,
				message: issue.message,
			})),
		};
	}
	return { draft: parsed.data, issues: validateDraft(parsed.data, options) };
}

/** Returns the parsed draft. Throws with every issue of the draft. */
function assertValidDraft(
	input: CustomActionDraft,
	pathPrefix = '',
	options?: ValidateDraftOptions,
): CustomActionDraft {
	const { draft, issues } = checkDraft(input, options);
	if (!draft || issues.length > 0) {
		throw new InvalidCustomActionError(
			issues.map((issue) => ({ ...issue, path: `${pathPrefix}${issue.path}` })),
		);
	}
	return draft;
}

function actionMeta(action: ActionAggregate['action']): { name: string; description?: string } {
	return {
		name: action.name,
		...(action.description !== null && { description: action.description }),
	};
}

function newestVersionOf(aggregate: ActionAggregate) {
	const newest = aggregate.versions.at(-1);
	if (!newest) {
		throw new UnexpectedError('Custom action has no version', {
			extra: { actionId: aggregate.action.id },
		});
	}
	return newest;
}

/**
 * `shapeOf` gives the shape of the parent. A parent action needs it for the pin values.
 * Without a shape, the parent is not available and the shape `operation` stands in.
 */
function toActionResponse(
	aggregate: ActionAggregate,
	shapeOf?: (nodeType: string) => ParentShape | undefined,
): CustomActionResponse {
	const { action } = aggregate;
	const shape = action.parentNodeType === null ? undefined : shapeOf?.(action.parentNodeType);
	const pinsOf = (ref: { actionId: string; actionName: string; version: number }) =>
		action.parentNodeType === null ? pinValues(ref) : parentPinValues(shape ?? 'operation', ref);
	const newest = newestVersionOf(aggregate);
	const versions = aggregate.versions.map(
		(version): CustomActionVersionSummary => ({
			version: version.version,
			currentRevision: version.currentRevision,
			revisionCount: version.revisionCount,
			createdAt: version.createdAt.toISOString(),
			pinValues: pinsOf({
				actionId: action.id,
				actionName: action.name,
				version: version.version,
			}),
		}),
	);
	return {
		id: action.id,
		name: action.name,
		...(action.description !== null && { description: action.description }),
		parentNodeType: action.parentNodeType,
		customNodeId: action.customNodeId,
		newestVersion: newest.version,
		versions,
		draft: joinDraft(actionMeta(action), newest.inputs, newest.request),
	};
}

function toNodeResponse(node: CustomNodeEntity, actions: ActionAggregate[]): CustomNodeResponse {
	return {
		id: node.id,
		nodeType: customNodeTypeName(node.id),
		displayName: node.displayName,
		...(node.description !== null && { description: node.description }),
		baseUrl: node.baseUrl,
		auth: node.auth,
		hasIcon: node.iconMimeType !== null,
		actions: actions
			.filter((a) => a.action.customNodeId === node.id)
			.map((a) => toActionResponse(a)),
		createdAt: node.createdAt.toISOString(),
		updatedAt: node.updatedAt.toISOString(),
	};
}

/** The fields of the DTO that differ from the stored node. A new base URL records the old one. */
function nodePatch(
	current: CustomNodeEntity,
	dto: UpdateCustomNodeDto,
	userId: string,
): CustomNodePatch {
	const patch: CustomNodePatch = {};
	if (dto.displayName !== undefined && dto.displayName !== current.displayName) {
		patch.displayName = dto.displayName;
	}
	// The DTO has no null. An empty string clears the description.
	const description = dto.description === '' ? null : dto.description;
	if (description !== undefined && description !== current.description) {
		patch.description = description;
	}
	if (dto.baseUrl !== undefined && dto.baseUrl !== current.baseUrl) {
		patch.baseUrl = dto.baseUrl;
		patch.baseUrlHistory = [
			...current.baseUrlHistory,
			{ baseUrl: current.baseUrl, changedAt: new Date().toISOString(), changedById: userId },
		];
	}
	return patch;
}

/** Owns all reads and writes of custom nodes and their versioned actions. */
@Service()
export class CustomNodesService {
	constructor(
		private readonly logger: Logger,
		private readonly txRunner: TransactionRunner,
		private readonly nodeRepository: CustomNodeRepository,
		private readonly actionRepository: CustomActionRepository,
		private readonly registry: CustomNodesRegistry,
		private readonly credentialTypes: CredentialTypes,
		private readonly parentActions: ParentActionsProvider,
	) {
		this.logger = logger.scoped('custom-nodes');
	}

	async list(user: User): Promise<CustomNodeResponse[]> {
		this.assertScope(user, 'customNode:list');
		const [nodes, actions] = await Promise.all([
			this.nodeRepository.findAllNodes({}),
			this.actionRepository.findAllActions({}),
		]);
		return nodes.map((node) => toNodeResponse(node, actions));
	}

	async getNode(user: User, id: string): Promise<CustomNodeResponse> {
		this.assertScope(user, 'customNode:list');
		return await this.getNodeResponse(id);
	}

	async getActionVersion(
		user: User,
		actionId: string,
		versionNumber: number,
	): Promise<CustomActionVersionDetailResponse> {
		this.assertScope(user, 'customNode:list');
		const { action, versions } = await this.findActionOrFail(actionId, {});
		const version = versions.find((v) => v.version === versionNumber);
		if (!version) throw new NotFoundError('The version of the custom action does not exist');
		const revisions = await this.actionRepository.findRevisions(version.id, {});
		return {
			version: version.version,
			draft: joinDraft(actionMeta(action), version.inputs, version.request),
			revisions: revisions.map((row) => ({
				revision: row.revision,
				...(row.changeNote !== null && { changeNote: row.changeNote }),
				createdAt: row.createdAt.toISOString(),
				current: row.revision === version.currentRevision,
			})),
		};
	}

	async createNode(user: User, dto: CreateCustomNodeDto): Promise<CustomNodeResponse> {
		this.assertScope(user, 'customNode:create');
		validateBaseUrl(dto.baseUrl);
		this.assertKnownCredentialType(dto.auth);
		if (dto.actions.length === 0) {
			throw new UserError('A custom node needs at least one action.');
		}
		const drafts = dto.actions.map((draft, index) => assertValidDraft(draft, `actions[${index}].`));

		const nodeId = await this.write(
			async (ctx) => {
				const node = await this.nodeRepository.insertNode(
					{
						displayName: dto.displayName,
						// An empty description is stored as no description, as in `updateNode`.
						description: dto.description === '' ? undefined : dto.description,
						baseUrl: dto.baseUrl,
						auth: dto.auth,
						createdById: user.id,
					},
					ctx,
				);
				for (const draft of drafts) {
					await this.insertAction(user, node.id, null, draft, undefined, ctx);
				}
				return node.id;
			},
			(id) => ({ nodeId: id }),
		);
		this.logger.debug('Custom node created', { nodeId, actionCount: dto.actions.length });
		return await this.getNodeResponse(nodeId);
	}

	async updateNode(user: User, id: string, dto: UpdateCustomNodeDto): Promise<CustomNodeResponse> {
		this.assertScope(user, 'customNode:update');
		if (dto.baseUrl !== undefined) validateBaseUrl(dto.baseUrl);

		const changedFields = await this.txRunner.run({}, async (ctx) => {
			// The lock keeps the base URL history complete when two updates run at the same time.
			await this.lockNodeOrFail(id, ctx);
			const current = await this.findNodeOrFail(id, ctx);
			const patch = nodePatch(current, dto, user.id);
			if (Object.keys(patch).length === 0) return [];
			await this.nodeRepository.updateNode(id, { ...patch, updatedById: user.id }, ctx);
			return Object.keys(patch);
		});

		// An update that changes nothing writes nothing and does not refresh the registry.
		if (changedFields.length > 0) {
			await this.refreshAfterWrite({ nodeId: id });
			this.logger.debug('Custom node updated', { nodeId: id, fields: changedFields });
		}
		return await this.getNodeResponse(id);
	}

	/** Deletes the node with its actions, versions and revisions. */
	async deleteNode(user: User, id: string): Promise<void> {
		this.assertScope(user, 'customNode:delete');
		await this.write(
			async (ctx) => {
				await this.findNodeOrFail(id, ctx);
				await this.nodeRepository.deleteNode(id, ctx);
			},
			() => ({ nodeId: id }),
		);
		this.logger.debug('Custom node deleted', { nodeId: id });
	}

	async setIcon(user: User, id: string, iconDataUri: string): Promise<void> {
		this.assertScope(user, 'customNode:update');
		const icon = await validateIcon(iconDataUri);
		await this.write(
			async (ctx) => {
				await this.findNodeOrFail(id, ctx);
				await this.nodeRepository.setIcon(id, icon, ctx);
				await this.nodeRepository.updateNode(id, { updatedById: user.id }, ctx);
			},
			() => ({ nodeId: id }),
		);
	}

	/** The editor loads icons as images for every user who can list custom nodes. */
	async getIcon(user: User, id: string): Promise<{ mimeType: string; data: Buffer }> {
		this.assertScope(user, 'customNode:list');
		const icon = await this.nodeRepository.findIcon(id, {});
		if (!icon) throw new NotFoundError('The custom node has no icon');
		return icon;
	}

	async addAction(
		user: User,
		nodeId: string,
		dto: SaveCustomActionDto,
	): Promise<CustomActionResponse> {
		this.assertScope(user, 'customNode:update');
		const draft = assertValidDraft(dto.draft);
		const actionId = await this.write(
			async (ctx) => {
				await this.lockNodeOrFail(nodeId, ctx);
				return await this.insertAction(user, nodeId, null, draft, dto.changeNote, ctx);
			},
			(id) => ({ nodeId, actionId: id }),
		);
		this.logger.debug('Custom action added', { nodeId, actionId });
		return await this.getActionResponse(actionId);
	}

	/**
	 * Adds an action to a built-in parent node, for example Stripe.
	 * The parent must be eligible on this instance. The URL of the action must be absolute.
	 */
	async addParentAction(
		user: User,
		dto: CreateParentCustomActionDto,
	): Promise<ParentCustomActionResponse> {
		this.assertScope(user, 'customNode:create');
		if (this.parentActions.shapeOf(dto.parentNodeType) === undefined) {
			throw new UserError(
				`Custom actions are not available for the node type "${dto.parentNodeType}".`,
			);
		}
		const draft = assertValidDraft(dto.draft, '', { absoluteUrl: true });
		const actionId = await this.write(
			async (ctx) =>
				await this.insertAction(user, null, dto.parentNodeType, draft, dto.changeNote, ctx),
			(id) => ({ actionId: id }),
		);
		this.logger.debug('Custom action added to a parent node', {
			parentNodeType: dto.parentNodeType,
			actionId,
		});
		return this.toParentResponse(await this.findActionOrFail(actionId, {}));
	}

	/** Lists the actions of all parent nodes, also those of a parent that is not available. */
	async listParentActions(user: User): Promise<ParentCustomActionResponse[]> {
		this.assertScope(user, 'customNode:list');
		const actions = await this.actionRepository.findAllActions({});
		return actions
			.filter((a) => a.action.parentNodeType !== null)
			.map((a) => this.toParentResponse(a));
	}

	/** Lists the node types that can have custom actions on this instance. */
	listParents(user: User): CustomActionParent[] {
		this.assertScope(user, 'customNode:list');
		return this.parentActions
			.eligibleParents()
			.map(({ nodeType, shape }): CustomActionParent => ({ nodeType, shape }));
	}

	/** The server decides the kind of the edit. See `classifyEdit`. */
	async saveAction(
		user: User,
		actionId: string,
		dto: SaveCustomActionDto,
	): Promise<{ action: CustomActionResponse; kind: CustomActionEditKind }> {
		this.assertScope(user, 'customNode:update');
		// A parent action has no base URL, so its URL must be absolute.
		const { action: existing } = await this.findActionOrFail(actionId, {});
		const draft = assertValidDraft(dto.draft, '', {
			absoluteUrl: existing.parentNodeType !== null,
		});

		const kind = await this.txRunner.run({}, async (ctx) => {
			// Classify against the state that the write builds on. A concurrent save waits here.
			await this.lockActionOrFail(actionId, ctx);
			const aggregate = await this.findActionOrFail(actionId, ctx);
			const newest = newestVersionOf(aggregate);
			const current = joinDraft(actionMeta(aggregate.action), newest.inputs, newest.request);
			const editKind = classifyEdit(current, draft);
			if (editKind === 'none') return editKind;

			const { inputs, request } = splitDraft(draft);
			const revision = { request, changeNote: dto.changeNote, createdById: user.id };
			await this.actionRepository.updateActionMeta(
				actionId,
				{ name: draft.name, description: draft.description, updatedById: user.id },
				ctx,
			);
			if (editKind === 'version') {
				await this.actionRepository.appendVersion(actionId, { inputs }, revision, ctx);
				return editKind;
			}
			// The contract is the same, so the new display names apply to the newest version in place.
			await this.actionRepository.updateVersionInputs(newest.id, inputs, ctx);
			if (editKind === 'revision') {
				await this.actionRepository.appendRevision(newest.id, revision, ctx);
			}
			return editKind;
		});

		if (kind !== 'none') await this.refreshAfterWrite({ actionId });
		this.logger.debug('Custom action saved', { actionId, kind });
		return { action: await this.getActionResponse(actionId), kind };
	}

	/** Makes an earlier revision current. Newer revisions stay, so a later rollback can restore them. */
	async rollbackRevision(
		user: User,
		actionId: string,
		version: number,
		revision: number,
	): Promise<CustomActionResponse> {
		this.assertScope(user, 'customNode:update');
		await this.write(
			async (ctx) => {
				await this.lockActionOrFail(actionId, ctx);
				const aggregate = await this.findActionOrFail(actionId, ctx);
				const target = aggregate.versions.find((v) => v.version === version);
				if (!target)
					throw new NotFoundError(`Version ${version} of the custom action does not exist`);
				// Revisions are numbered 1 to n without gaps. The service never deletes one.
				if (!Number.isInteger(revision) || revision < 1 || revision > target.revisionCount) {
					throw new NotFoundError(`Revision ${revision} of version ${version} does not exist`);
				}
				await this.actionRepository.setCurrentRevision(target.id, revision, ctx);
			},
			() => ({ actionId }),
		);
		this.logger.debug('Custom action revision rolled back', { actionId, version, revision });
		return await this.getActionResponse(actionId);
	}

	async deleteAction(user: User, actionId: string): Promise<void> {
		this.assertScope(user, 'customNode:delete');
		await this.write(
			async (ctx) => {
				const { customNodeId } = (await this.findActionOrFail(actionId, ctx)).action;
				// Lock the node first, as a node delete does, and then count. Two concurrent deletes
				// of the last two actions then see each other's result.
				if (customNodeId !== null) await this.lockNodeOrFail(customNodeId, ctx);
				await this.lockActionOrFail(actionId, ctx);
				if (
					customNodeId !== null &&
					(await this.actionRepository.countActionsOfNode(customNodeId, ctx)) <= 1
				) {
					throw new UserError(
						'A custom node needs at least one action. Delete the custom node instead.',
					);
				}
				await this.actionRepository.deleteAction(actionId, ctx);
			},
			() => ({ actionId }),
		);
		this.logger.debug('Custom action deleted', { actionId });
	}

	/** Validates a draft and returns the input properties that the editor would show. Writes nothing. */
	preview(
		user: User,
		draft: CustomActionDraft,
	): { issues: CustomActionDraftIssue[]; properties: INodeProperties[] } {
		this.assertScope(user, 'customNode:list');
		const { draft: parsed, issues } = checkDraft(draft);
		if (!parsed || issues.length > 0) return { issues, properties: [] };

		const { inputs, request } = splitDraft(parsed);
		// No operation exists in a preview, so the properties have no display condition.
		return { issues, properties: buildInputProperties({ version: 1, inputs, request }, {}) };
	}

	/** A predefined credential type must exist on this instance. */
	private assertKnownCredentialType(auth: CustomNodeAuth): void {
		if (auth.kind === 'predefined' && !this.credentialTypes.recognizes(auth.credentialType)) {
			throw new UserError(`The credential type "${auth.credentialType}" does not exist.`);
		}
	}

	private assertScope(user: User, scope: Scope): void {
		if (!hasGlobalScope(user, scope)) {
			throw new ForbiddenError(`Missing the scope ${scope}`);
		}
	}

	/** Runs the write in one transaction. Refreshes the registry once, only after a commit. */
	private async write<T>(
		fn: (ctx: OperationContext) => Promise<T>,
		ids: (result: T) => WriteIds,
	): Promise<T> {
		const result = await this.txRunner.run({}, fn);
		await this.refreshAfterWrite(ids(result));
		return result;
	}

	/**
	 * The data is saved when this runs. A failed refresh must not fail the request:
	 * the caller could then retry and save the data again.
	 */
	private async refreshAfterWrite(ids: WriteIds): Promise<void> {
		try {
			await this.registry.refresh(REFRESH_AFTER_WRITE);
		} catch (error) {
			this.logger.error('Saved a custom node change, but could not refresh the custom nodes', {
				...ids,
				error: ensureError(error),
			});
		}
	}

	private async insertAction(
		user: User,
		customNodeId: string | null,
		parentNodeType: string | null,
		draft: CustomActionDraft,
		changeNote: string | undefined,
		ctx: OperationContext,
	): Promise<string> {
		const { inputs, request } = splitDraft(draft);
		return await this.actionRepository.insertAction(
			{
				name: draft.name,
				description: draft.description,
				parentNodeType,
				customNodeId,
				createdById: user.id,
			},
			{ inputs },
			{ request, changeNote, createdById: user.id },
			ctx,
		);
	}

	private async lockNodeOrFail(id: string, ctx: OperationContext): Promise<void> {
		if (!(await this.nodeRepository.lockNode(id, ctx))) {
			throw new NotFoundError('The custom node does not exist');
		}
	}

	private async lockActionOrFail(id: string, ctx: OperationContext): Promise<void> {
		if (!(await this.actionRepository.lockAction(id, ctx))) {
			throw new NotFoundError('The custom action does not exist');
		}
	}

	private async findNodeOrFail(id: string, ctx: OperationContext): Promise<CustomNodeEntity> {
		const node = await this.nodeRepository.findNode(id, ctx);
		if (!node) throw new NotFoundError('The custom node does not exist');
		return node;
	}

	private async findActionOrFail(id: string, ctx: OperationContext): Promise<ActionAggregate> {
		const aggregate = await this.actionRepository.findAction(id, ctx);
		if (!aggregate) throw new NotFoundError('The custom action does not exist');
		return aggregate;
	}

	private async getNodeResponse(id: string): Promise<CustomNodeResponse> {
		const [node, actions] = await Promise.all([
			this.findNodeOrFail(id, {}),
			this.actionRepository.findAllActions({}),
		]);
		return toNodeResponse(node, actions);
	}

	private async getActionResponse(id: string): Promise<CustomActionResponse> {
		return toActionResponse(await this.findActionOrFail(id, {}), (name) =>
			this.parentActions.shapeOf(name),
		);
	}

	private toParentResponse(aggregate: ActionAggregate): ParentCustomActionResponse {
		const { parentNodeType } = aggregate.action;
		const shape = parentNodeType === null ? undefined : this.parentActions.shapeOf(parentNodeType);
		return {
			...toActionResponse(aggregate, (name) => this.parentActions.shapeOf(name)),
			parentAvailable: shape !== undefined,
		};
	}
}
