import { Logger } from '@n8n/backend-common';
import { WorkflowDependencyRepository, WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';

import { WorkflowIndexingService } from './workflow-indexing.service';

// eslint-disable-next-line import-x/extensions
import { EventService } from '@/events/event.service';

@Service()
export class WorkflowIndexingManager {
	private isIndexing = false;

	constructor(
		private readonly logger: Logger,
		private readonly eventService: EventService,
		private readonly workflowRepository: WorkflowRepository,
		private readonly workflowDependencyRepository: WorkflowDependencyRepository,
		private readonly workflowIndexingService: WorkflowIndexingService,
	) {}

	init() {
		// Listen for server-started event to trigger initial indexing
		this.eventService.on('server-started', async () => {
			// Run indexing asynchronously without blocking startup
			void this.indexAllWorkflows();
		});

		// Listen for workflow-saved event to index on updates
		this.eventService.on('workflow-saved', async ({ workflow }) => {
			try {
				await this.indexWorkflow(workflow.id);
			} catch (error) {
				this.logger.error(`Failed to index workflow ${workflow.id} after save`, {
					workflowId: workflow.id,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		});
	}

	/**
	 * Index all workflows in the database.
	 * Processes workflows in batches to avoid overwhelming the database.
	 */
	private async indexAllWorkflows() {
		if (this.isIndexing) {
			this.logger.debug('Workflow indexing already in progress, skipping');
			return;
		}

		this.isIndexing = true;
		this.logger.info('Starting workflow indexing');

		const BATCH_SIZE = 100;
		let offset = 0;
		let totalIndexed = 0;
		let totalErrors = 0;

		try {
			while (true) {
				const workflows = await this.workflowRepository.find({
					select: ['id', 'versionCounter', 'nodes'],
					skip: offset,
					take: BATCH_SIZE,
				});

				if (workflows.length === 0) {
					break;
				}

				// Process batch
				for (const workflow of workflows) {
					try {
						const dependencies =
							this.workflowIndexingService.generateWorkflowIndexUpdates(workflow);

						if (dependencies.length === 0) {
							// Delete any existing dependencies if workflow is now empty
							await this.workflowDependencyRepository.delete({ workflowId: workflow.id });
							continue;
						}

						const updated = await this.workflowDependencyRepository.replaceWorkflowDependencies(
							workflow.id,
							dependencies,
						);

						if (updated) {
							totalIndexed++;
						}
					} catch (error) {
						totalErrors++;
						console.log(error);
						this.logger.error(`Failed to index workflow ${workflow.id}`, {
							workflowId: workflow.id,
							error: error instanceof Error ? error.message : String(error),
						});
					}
				}

				offset += BATCH_SIZE;

				// Log progress
				this.logger.debug(`Indexed batch of ${workflows.length} workflows`, {
					totalIndexed,
					totalErrors,
				});
			}

			this.logger.info('Workflow indexing completed', {
				totalIndexed,
				totalErrors,
			});
		} catch (error) {
			this.logger.error('Workflow indexing failed', {
				error: error instanceof Error ? error.message : String(error),
			});
		} finally {
			this.isIndexing = false;
		}
	}

	/**
	 * Index a single workflow by ID.
	 */
	private async indexWorkflow(workflowId: string) {
		const workflow = await this.workflowRepository.findOne({
			where: { id: workflowId },
			select: ['id', 'versionCounter', 'nodes'],
		});

		if (!workflow) {
			this.logger.warn(`Workflow ${workflowId} not found for indexing`);
			return;
		}

		const dependencies = this.workflowIndexingService.generateWorkflowIndexUpdates(workflow);

		// Skip if no dependencies (empty workflow)
		if (dependencies.length === 0) {
			// Delete any existing dependencies if workflow is now empty
			await this.workflowDependencyRepository.delete({ workflowId });
			return;
		}

		await this.workflowDependencyRepository.replaceWorkflowDependencies(workflow.id, dependencies);

		this.logger.debug(`Indexed workflow ${workflowId}`, {
			workflowId,
			dependencyCount: dependencies.length,
		});
	}
}
