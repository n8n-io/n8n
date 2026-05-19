import {
	activeLifecycleState,
	droppedLifecycleState,
	normalizeObservationLogReflection,
	createObservationLogThreadScopePrefix,
	hashEpisodicMemoryContent,
	hashEpisodicMemoryEvidence,
	markLifecycleActive,
	normalizeFlatReflectionActions,
	rankEpisodicMemoryEntries,
	supersededLifecycleState,
	uniqueStrings,
	type AgentDbMessage,
	type AgentMessage,
	type BuiltEpisodicMemoryStore,
	type BuiltMemory,
	type BuiltObservationLogStore,
	type EpisodicMemoryCursor,
	type EpisodicMemoryEntry,
	type EpisodicMemoryEntrySource,
	type EpisodicMemoryReflectionApply,
	type EpisodicMemoryReflectionResult,
	type EpisodicMemoryScope,
	type EpisodicMemorySearchOptions,
	type MemoryDescriptor,
	type NewEpisodicMemoryCursor,
	type NewEpisodicMemoryEntry,
	type NewEpisodicMemoryEntrySource,
	type NewEpisodicMemoryEntrySourceForEntry,	type NewObservationLogEntry,
	type ObservationCursor,
	type ObservationLogEntry,
	type ObservationLogReadOptions,
	type ObservationLogReflection,
	type ObservationLogReflectionResult,
	type ObservationLogScope,
	type ObservationLogScopeKind,
	type RetrievedEpisodicMemoryEntry,			const legacyScope = { scopeKind: 'thread' as const, scopeId: threadId };
			const resourceScope = {
				scopeKind: 'thread' as const,
				scopeId: Like(`${createObservationLogThreadScopePrefix(threadId)}%`),
			};
			for (const scope of [legacyScope, resourceScope]) {
				await trx.delete(AgentObservationEntity, scope);
				await trx.delete(AgentObservationCursorEntity, scope);
				await trx.delete(AgentObservationLockEntity, scope);
				await trx.delete(AgentMemoryEntryCursorEntity, scope);			for (const scope of [
				{ scopeKind: 'thread' as const, scopeId },
				{ scopeKind: 'thread' as const, scopeId: resourceScopeId },
			]) {
				await trx.delete(AgentObservationEntity, scope);
				await trx.delete(AgentObservationCursorEntity, scope);
				await trx.delete(AgentObservationLockEntity, scope);
				await trx.delete(AgentMemoryEntryCursorEntity, scope);				);
			}

			for (const [index, merge] of normalized.merge.entries()) {
				const replacement = inserted[index];
				if (replacement && merge.supersedes.length > 0) {
					await repo.update(
						{ scopeKind: scope.scopeKind, scopeId: scope.scopeId, id: In(merge.supersedes) },
						supersededLifecycleState(replacement.id),
					);
				}
			}

			return {
				droppedIds: [...normalized.drop],
				supersededIds: normalized.merge.flatMap((entry) => entry.supersedes),
				inserted: inserted.map((entry) => this.toObservationLogEntry(entry)),
			};
		});
	}

	// ── Observational memory: cursors ────────────────────────────────────

	async getCursor(
		scopeKind: ObservationLogScopeKind,
		scopeId: string,
	): Promise<ObservationCursor | null> {
		const entity = await this.observationCursorRepository.findOneBy({ scopeKind, scopeId });
		if (!entity) return null;
		return {
			scopeKind: entity.scopeKind,
			scopeId: entity.scopeId,
			lastObservedMessageId: entity.lastObservedMessageId,
			lastObservedAt: entity.lastObservedAt,
			updatedAt: entity.updatedAt,
		};
	}

	async setCursor(
		cursor: ObservationCursor & { scopeKind: ObservationLogScopeKind },
	): Promise<void> {
		await this.observationCursorRepository.upsert(
			{
				scopeKind: cursor.scopeKind,
				scopeId: cursor.scopeId,
				lastObservedMessageId: cursor.lastObservedMessageId,
				lastObservedAt: cursor.lastObservedAt,
				updatedAt: cursor.updatedAt,
			},
			{ conflictPaths: ['scopeKind', 'scopeId'], skipUpdateIfNoValuesChanged: false },
		);
	}

	// ── Observation log: locks ───────────────────────────────────────────

	async acquireObservationLogTaskLock(
		scopeKind: ObservationLogScopeKind,
		scopeId: string,
		taskKind: ObservationLogTaskKind,
		opts: { ttlMs: number; holderId: string },
	): Promise<ObservationLogTaskLockHandle | null> {
		const now = new Date();
		const heldUntil = new Date(now.getTime() + opts.ttlMs);

		const updateResult = await this.observationLockRepository
			.createQueryBuilder()
			.update(AgentObservationLockEntity)
			.set({ taskKind, holderId: opts.holderId, heldUntil })
			.where('"scopeKind" = :scopeKind')
			.andWhere('"scopeId" = :scopeId')
			.andWhere('"taskKind" = :taskKind')
			.andWhere('("holderId" = :holderId OR "heldUntil" <= :now)')
			.setParameters({ scopeKind, scopeId, taskKind, holderId: opts.holderId, now })
			.execute();

		if ((updateResult.affected ?? 0) > 0) {
			return { scopeKind, scopeId, taskKind, holderId: opts.holderId, heldUntil };
		}

		await this.observationLockRepository
			.createQueryBuilder()
			.insert()
			.into(AgentObservationLockEntity)
			.values({ scopeKind, scopeId, taskKind, holderId: opts.holderId, heldUntil })
			.orIgnore()
			.execute();

		const claimed = await this.observationLockRepository.findOneBy({
			scopeKind,
			scopeId,
			taskKind,
			holderId: opts.holderId,
		});
		if (!claimed) return null;

		return { scopeKind, scopeId, taskKind, holderId: opts.holderId, heldUntil };
	}

	async releaseObservationLogTaskLock(handle: ObservationLogTaskLockHandle): Promise<void> {
		await this.releaseScopeLock(handle);
	}

	private async releaseScopeLock(handle: ObservationLogTaskLockHandle): Promise<void> {
		await this.observationLockRepository.delete({
			scopeKind: handle.scopeKind,
			scopeId: handle.scopeId,
			taskKind: handle.taskKind,
			holderId: handle.holderId,
		});
	}

	// ── Episodic memory ──────────────────────────────────────────────────

	async saveEpisodicMemoryEntries(
		entries: NewEpisodicMemoryEntry[],
	): Promise<EpisodicMemoryEntry[]> {
		const saved: EpisodicMemoryEntry[] = [];

		for (const entry of entries) {
			await this.ensureResource(entry.resourceId);
			const contentHash = entry.contentHash ?? hashEpisodicMemoryContent(entry.content);
			const now = new Date();
			const entity = this.memoryEntryRepository.create({
				agentId: entry.agentId,
				resourceId: entry.resourceId,
				content: entry.content,
				contentHash,
				...activeLifecycleState(),
				embeddingModel: entry.embeddingModel ?? null,
				embedding: entry.embedding ?? null,
				metadata: entry.metadata ?? null,
				createdAt: entry.createdAt ?? now,
				lastSeenAt: entry.lastSeenAt ?? now,
			});

			try {
				const persisted = await this.memoryEntryRepository.save(entity);
				saved.push(this.toEpisodicMemoryEntry(persisted));
			} catch (error) {
				if (!(error instanceof Error) || !isUniqueConstraintError(error)) throw error;

				const existing = await this.memoryEntryRepository.findOneBy({
					agentId: entry.agentId,
					resourceId: entry.resourceId,
					contentHash,
				});
				if (!existing) throw error;
				markLifecycleActive(existing);
				existing.lastSeenAt = entry.lastSeenAt ?? now;
				existing.updatedAt = now;
				const updated = await this.memoryEntryRepository.save(existing);
				saved.push(this.toEpisodicMemoryEntry(updated));
			}
		}

		return saved;
	}

	async saveEpisodicMemoryEntrySources(
		sources: NewEpisodicMemoryEntrySource[],
	): Promise<EpisodicMemoryEntrySource[]> {
		const saved: EpisodicMemoryEntrySource[] = [];
		for (const source of sources) {
			const evidenceHash = hashEpisodicMemoryEvidence(source.evidenceText);
			const entity = this.memoryEntrySourceRepository.create({
				memoryEntryId: source.memoryEntryId,
				observationId: source.observationId,
				threadId: source.threadId,
				evidenceHash,
				evidenceText: source.evidenceText,
				createdAt: source.createdAt,
			});
			try {
				const persisted = await this.memoryEntrySourceRepository.save(entity);
				saved.push(this.toEpisodicMemoryEntrySource(persisted));
			} catch (error) {
				if (!(error instanceof Error) || !isUniqueConstraintError(error)) throw error;
				const existing = await this.memoryEntrySourceRepository.findOneBy({
					memoryEntryId: source.memoryEntryId,
					observationId: source.observationId,
					evidenceHash,
				});
				if (!existing) throw error;
				saved.push(this.toEpisodicMemoryEntrySource(existing));
			}
		}
		return saved;
	}

	async saveEpisodicMemoryEntryWithSources(
		entry: NewEpisodicMemoryEntry,
		sources: NewEpisodicMemoryEntrySourceForEntry[],
	): Promise<EpisodicMemoryEntry | null> {
		await this.ensureResource(entry.resourceId);
		return await this.memoryEntryRepository.manager.transaction(async (trx) => {
			const entryRepo = trx.getRepository(AgentMemoryEntryEntity);
			const sourceRepo = trx.getRepository(AgentMemoryEntrySourceEntity);
			const contentHash = entry.contentHash ?? hashEpisodicMemoryContent(entry.content);
			const now = new Date();
			const entity = entryRepo.create({
				agentId: entry.agentId,
				resourceId: entry.resourceId,
				content: entry.content,
				contentHash,
				...activeLifecycleState(),
				embeddingModel: entry.embeddingModel ?? null,
				embedding: entry.embedding ?? null,
				metadata: entry.metadata ?? null,
				createdAt: entry.createdAt ?? now,
				lastSeenAt: entry.lastSeenAt ?? now,
			});

			let persisted: AgentMemoryEntryEntity | null = null;
			try {
				const [saved] = await entryRepo.save([entity]);
				persisted = saved ?? null;
			} catch (error) {
				if (!(error instanceof Error) || !isUniqueConstraintError(error)) throw error;
				const existing = await entryRepo.findOneBy({
					agentId: entry.agentId,
					resourceId: entry.resourceId,
					contentHash,
				});
				if (!existing) throw error;
				markLifecycleActive(existing);
				existing.lastSeenAt = entry.lastSeenAt ?? now;
				existing.updatedAt = now;
				const [saved] = await entryRepo.save([existing]);
				persisted = saved ?? existing;
			}

			if (!persisted) return null;

			for (const source of sources) {
				const evidenceHash = hashEpisodicMemoryEvidence(source.evidenceText);
				const sourceEntity = sourceRepo.create({
					memoryEntryId: persisted.id,
					observationId: source.observationId,
					threadId: source.threadId,
					evidenceHash,
					evidenceText: source.evidenceText,
					createdAt: source.createdAt,
				});
				try {
					await sourceRepo.save([sourceEntity]);
				} catch (error) {
					if (!(error instanceof Error) || !isUniqueConstraintError(error)) throw error;
					const existing = await sourceRepo.findOneBy({
						memoryEntryId: persisted.id,
						observationId: source.observationId,
						evidenceHash,
					});
					if (!existing) throw error;
				}
			}

			return this.toEpisodicMemoryEntry(persisted);
		});
	}

	async searchEpisodicMemoryEntries(
		scope: EpisodicMemoryScope,
		query: string,
		opts?: EpisodicMemorySearchOptions,
	): Promise<RetrievedEpisodicMemoryEntry[]> {
		const statuses = opts?.includeStatuses ?? ['active'];
		const entities = await this.memoryEntryRepository.find({
			where: { agentId: scope.agentId, resourceId: scope.resourceId, status: In(statuses) },
		});
		return rankEpisodicMemoryEntries(
			entities.map((entity) => this.toEpisodicMemoryEntry(entity)),
			query,
			opts,
		);
	}

	async supersedeEpisodicMemoryEntries(ids: string[], supersededBy: string): Promise<void> {
		const filteredIds = ids.filter((id) => id !== supersededBy);
		if (filteredIds.length === 0) return;
		await this.memoryEntryRepository.update(
			{ id: In(filteredIds), status: 'active' },
			supersededLifecycleState(supersededBy),
		);
	}

	async getEpisodicMemoryEntrySources(entryIds: string[]): Promise<EpisodicMemoryEntrySource[]> {
		if (entryIds.length === 0) return [];
		const entities = await this.memoryEntrySourceRepository.find({
			where: { memoryEntryId: In(entryIds) },
			order: { createdAt: 'ASC', id: 'ASC' },
		});
		return entities.map((entity) => this.toEpisodicMemoryEntrySource(entity));
	}

	async applyEpisodicMemoryReflection(
		scope: EpisodicMemoryScope,
		reflection: EpisodicMemoryReflectionApply,
	): Promise<EpisodicMemoryReflectionResult> {
		return await this.memoryEntryRepository.manager.transaction(async (trx) => {
			const entryRepo = trx.getRepository(AgentMemoryEntryEntity);
			const sourceRepo = trx.getRepository(AgentMemoryEntrySourceEntity);
			const actionIds = uniqueStrings([
				...reflection.drop,
				...reflection.merge.flatMap((merge) => merge.supersedes),
			]);
			if (actionIds.length === 0) return { droppedIds: [], supersededIds: [], inserted: [] };

			const activeEntries = await entryRepo.find({
				where: {
					agentId: scope.agentId,
					resourceId: scope.resourceId,
					id: In(actionIds),
					status: 'active',
				},
			});
			const activeIds = new Set(activeEntries.map((entry) => entry.id));
			const normalized = normalizeFlatReflectionActions({
				activeIds,
				drop: reflection.drop,
				merge: reflection.merge,
				normalizeMerge: (entry, supersedes) => ({ ...entry, supersedes }),
			});

			const now = new Date();
			const replacementHashes = uniqueStrings(
				normalized.merge.map(
					(item) => item.entry.contentHash ?? hashEpisodicMemoryContent(item.entry.content),
				),
			);
			const existingReplacements = replacementHashes.length
				? await entryRepo.find({
						where: {
							agentId: scope.agentId,
							resourceId: scope.resourceId,
							contentHash: In(replacementHashes),
						},
					})
				: [];
			const existingByHash = new Map(
				existingReplacements.map((entry) => [entry.contentHash, entry]),
			);
			const replacements: AgentMemoryEntryEntity[] = [];
			for (const item of normalized.merge) {
				const contentHash = item.entry.contentHash ?? hashEpisodicMemoryContent(item.entry.content);
				const existing = existingByHash.get(contentHash);
				const update: QueryDeepPartialEntity<AgentMemoryEntryEntity> = {
					...activeLifecycleState(),
					lastSeenAt: item.entry.lastSeenAt ?? now,
					updatedAt: now,
				};
				if (item.entry.embedding !== undefined) update.embedding = item.entry.embedding;
				if (item.entry.embeddingModel !== undefined) {
					update.embeddingModel = item.entry.embeddingModel;
				}
				if (item.entry.metadata !== undefined) update.metadata = item.entry.metadata;

				if (existing) {
					await entryRepo.update(
						{ agentId: scope.agentId, resourceId: scope.resourceId, id: existing.id },
						update,
					);
					replacements.push({
						...existing,
						...update,
					} as AgentMemoryEntryEntity);
					continue;
				}

				const entity = entryRepo.create({
					agentId: scope.agentId,
					resourceId: scope.resourceId,
					content: item.entry.content,
					contentHash,
					...activeLifecycleState(),
					embeddingModel: item.entry.embeddingModel ?? null,
					embedding: item.entry.embedding ?? null,
					metadata: item.entry.metadata ?? null,
					createdAt: item.entry.createdAt ?? now,
					lastSeenAt: item.entry.lastSeenAt ?? now,
				});
				try {
					const [persisted] = await entryRepo.save([entity]);
					if (persisted) {
						existingByHash.set(contentHash, persisted);
						replacements.push(persisted);
					}
				} catch (error) {
					if (!(error instanceof Error) || !isUniqueConstraintError(error)) throw error;
					const persisted = await entryRepo.findOneBy({
						agentId: scope.agentId,
						resourceId: scope.resourceId,
						contentHash,
					});
					if (!persisted) throw error;
					await entryRepo.update(
						{ agentId: scope.agentId, resourceId: scope.resourceId, id: persisted.id },
						update,
					);
					existingByHash.set(contentHash, persisted);
					replacements.push({
						...persisted,
						...update,
					} as AgentMemoryEntryEntity);
				}
			}
			const replacementIds = new Set(replacements.map((entry) => entry.id));
			const effectiveDrop = normalized.drop.filter((id) => !replacementIds.has(id));

			if (effectiveDrop.length > 0) {
				await entryRepo.update(
					{
						agentId: scope.agentId,
						resourceId: scope.resourceId,
						id: In(effectiveDrop),
						status: 'active',
					},
					droppedLifecycleState(),
				);
			}

			const supersededIds: string[] = [];
			for (const [index, item] of normalized.merge.entries()) {
				const replacement = replacements[index];
				if (!replacement) continue;
				const sourceRows = await sourceRepo.find({
					where: { memoryEntryId: In(item.supersedes) },
					order: { createdAt: 'ASC', id: 'ASC' },
				});
				const existingReplacementSources = await sourceRepo.find({
					where: { memoryEntryId: replacement.id },
				});
				const existingKeys = new Set(
					existingReplacementSources.map(
						(source) => `${source.observationId}\n${source.evidenceHash}`,
					),
				);
				const copiedSources = sourceRows.flatMap((source) => {
					const key = `${source.observationId}\n${source.evidenceHash}`;
					if (existingKeys.has(key)) return [];
					existingKeys.add(key);
					return [
						sourceRepo.create({
							memoryEntryId: replacement.id,
							observationId: source.observationId,
							threadId: source.threadId,
							evidenceHash: source.evidenceHash,
							evidenceText: source.evidenceText,
							createdAt: now,
						}),
					];
				});
				if (copiedSources.length > 0) await sourceRepo.save(copiedSources);
				const itemSupersededIds = item.supersedes.filter((id) => id !== replacement.id);
				if (itemSupersededIds.length > 0) {
					await entryRepo.update(
						{
							agentId: scope.agentId,
							resourceId: scope.resourceId,
							id: In(itemSupersededIds),
							status: 'active',
						},
						supersededLifecycleState(replacement.id),
					);
					supersededIds.push(...itemSupersededIds);
				}
			}

			return {
				droppedIds: effectiveDrop,
				supersededIds,
				inserted: replacements.map((entry) => this.toEpisodicMemoryEntry(entry)),
			};
		});
	}

	async getEpisodicMemoryCursor(scope: ObservationLogScope): Promise<EpisodicMemoryCursor | null> {
		const entity = await this.memoryEntryCursorRepository.findOneBy(scope);
		if (!entity) return null;
		return {
			scopeKind: entity.scopeKind,
			scopeId: entity.scopeId,
			lastIndexedObservationId: entity.lastIndexedObservationId,
			lastIndexedObservationCreatedAt: entity.lastIndexedObservationCreatedAt,
			updatedAt: entity.updatedAt,
		};
	}

	async setEpisodicMemoryCursor(cursor: NewEpisodicMemoryCursor): Promise<void> {
		await this.memoryEntryCursorRepository.upsert(
			{
				scopeKind: cursor.scopeKind,
				scopeId: cursor.scopeId,
				lastIndexedObservationId: cursor.lastIndexedObservationId,
				lastIndexedObservationCreatedAt: cursor.lastIndexedObservationCreatedAt,
				updatedAt: cursor.updatedAt ?? new Date(),
			},
			{ conflictPaths: ['scopeKind', 'scopeId'], skipUpdateIfNoValuesChanged: false },
		);
	}

	// ── Descriptor ───────────────────────────────────────────────────────

	describe(): MemoryDescriptor {
		return { name: 'n8n', connectionParams: {}, constructorName: this.constructor.name };
	}

	// ── Helpers ──────────────────────────────────────────────────────────

	private toAgentDbMessage(entity: AgentMessageEntity): AgentDbMessage {
		const msg = entity.content as AgentMessage & { id?: string; createdAt?: Date };
		msg.id = entity.id;
		msg.createdAt = entity.createdAt;
		return msg as AgentDbMessage;
	}

	private toObservationLogEntry(entity: AgentObservationEntity): ObservationLogEntry {
		return {
			id: entity.id,
			scopeKind: entity.scopeKind,
			scopeId: entity.scopeId,
			marker: entity.marker,
			text: entity.text,
			parentId: entity.parentId,
			tokenCount: Number(entity.tokenCount),
			status: entity.status,
			supersededBy: entity.supersededBy,
			createdAt: entity.createdAt,
		};
	}

	private toEpisodicMemoryEntry(entity: AgentMemoryEntryEntity): EpisodicMemoryEntry {
		return {
			id: entity.id,
			agentId: entity.agentId,
			resourceId: entity.resourceId,
			content: entity.content,
			contentHash: entity.contentHash,
			status: entity.status,
			supersededBy: entity.supersededBy,
			...(entity.embedding ? { embedding: entity.embedding } : {}),
			...(entity.embeddingModel ? { embeddingModel: entity.embeddingModel } : {}),
			metadata: entity.metadata,
			createdAt: entity.createdAt,
			updatedAt: entity.updatedAt,
			lastSeenAt: entity.lastSeenAt,
		};
	}

	private toEpisodicMemoryEntrySource(
		entity: AgentMemoryEntrySourceEntity,
	): EpisodicMemoryEntrySource {
		return {
			id: entity.id,
			memoryEntryId: entity.memoryEntryId,
			observationId: entity.observationId,
			threadId: entity.threadId,
			evidenceText: entity.evidenceText,
			createdAt: entity.createdAt,
		};
	}

	private toThread(entity: AgentThreadEntity): Thread {
		let metadata: Record<string, unknown> | undefined;
		if (entity.metadata) {
			try {
				metadata = JSON.parse(entity.metadata) as Record<string, unknown>;
			} catch {
				metadata = undefined;
			}
		}
		return {
			id: entity.id,
			resourceId: entity.resourceId,
			title: entity.title ?? undefined,
			metadata,
			createdAt: entity.createdAt,
			updatedAt: entity.updatedAt,
		};
	}
}
