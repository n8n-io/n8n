import type { INode, IRun, IWorkflowBase } from 'n8n-workflow';
import { LoggerProxy } from 'n8n-workflow';
import * as Db from '@/Db';
import { StatisticsNames } from '@db/entities/WorkflowStatistics';
import { getWorkflowOwner } from '@/UserManagement/UserManagementHelper';
import { QueryFailedError } from 'typeorm';
import { Container } from 'typedi';
import { InternalHooks } from '@/InternalHooks';
import config from '@/config';
import { UserService } from '@/user/user.service';

enum StatisticsUpsertResult {
	insert = 'insert',
	update = 'update',
	failed = 'failed',
}

async function upsertWorkflowStatistics(
	eventName: StatisticsNames,
	workflowId: string,
): Promise<StatisticsUpsertResult> {
	const dbType = config.getEnv('database.type');
	const { tableName } = Db.collections.WorkflowStatistics.metadata;
	try {
		if (dbType === 'sqlite') {
			await Db.collections.WorkflowStatistics.query(
				`INSERT INTO "${tableName}" ("count", "name", "workflowId", "latestEvent")
					VALUES (1, "${eventName}", "${workflowId}", CURRENT_TIMESTAMP)
					ON CONFLICT (workflowId, name)
					DO UPDATE SET count = count + 1, latestEvent = CURRENT_TIMESTAMP`,
			);
			// SQLite does not offer a reliable way to know whether or not an insert or update happened.
			// We'll use a naive approach in this case. Query again after and it might cause us to miss the
			// first production execution sometimes due to concurrency, but it's the only way.

			const counter = await Db.collections.WorkflowStatistics.findOne({
				select: ['count'],
				where: {
					name: eventName,
					workflowId,
				},
			});

			if (counter?.count === 1) {
				return StatisticsUpsertResult.insert;
			}
			return StatisticsUpsertResult.update;
		} else if (dbType === 'postgresdb') {
			const queryResult = (await Db.collections.WorkflowStatistics.query(
				`INSERT INTO "${tableName}" ("count", "name", "workflowId", "latestEvent")
					VALUES (1, '${eventName}', '${workflowId}', CURRENT_TIMESTAMP)
					ON CONFLICT ("name", "workflowId")
					DO UPDATE SET "count" = "${tableName}"."count" + 1, "latestEvent" = CURRENT_TIMESTAMP
					RETURNING *;`,
			)) as Array<{
				count: number;
			}>;
			if (queryResult[0].count === 1) {
				return StatisticsUpsertResult.insert;
			}
			return StatisticsUpsertResult.update;
		} else {
			const queryResult = (await Db.collections.WorkflowStatistics.query(
				`INSERT INTO \`${tableName}\` (count, name, workflowId, latestEvent)
					VALUES (1, "${eventName}", "${workflowId}", NOW())
					ON DUPLICATE KEY
					UPDATE count = count + 1, latestEvent = NOW();`,
			)) as {
				affectedRows: number;
			};
			if (queryResult.affectedRows === 1) {
				return StatisticsUpsertResult.insert;
			}
			// MySQL returns 2 affected rows on update
			return StatisticsUpsertResult.update;
		}
	} catch (error) {
		if (error instanceof QueryFailedError) return StatisticsUpsertResult.failed;
		throw error;
	}
}

export async function workflowExecutionCompleted(
	workflowData: IWorkflowBase,
	runData: IRun,
): Promise<void> {
	// Determine the name of the statistic
	const finished = runData.finished ? runData.finished : false;
	const manual = runData.mode === 'manual';
	let name: StatisticsNames;

	if (finished) {
		if (manual) name = StatisticsNames.manualSuccess;
		else name = StatisticsNames.productionSuccess;
	} else {
		if (manual) name = StatisticsNames.manualError;
		else name = StatisticsNames.productionError;
	}

	// Get the workflow id
	const workflowId = workflowData.id;
	if (!workflowId) return;

	try {
		const upsertResult = await upsertWorkflowStatistics(name, workflowId);

		if (
			name === StatisticsNames.productionSuccess &&
			upsertResult === StatisticsUpsertResult.insert
		) {
			const owner = await getWorkflowOwner(workflowId);
			const metrics = {
				user_id: owner.id,
				workflow_id: workflowId,
			};

			if (!owner.settings?.firstSuccessfulWorkflowId) {
				await UserService.updateUserSettings(owner.id, {
					firstSuccessfulWorkflowId: workflowId,
					userActivated: true,
					showUserActivationSurvey: true,
				});
			}

			// Send the metrics
			await Container.get(InternalHooks).onFirstProductionWorkflowSuccess(metrics);
		}
	} catch (error) {
		LoggerProxy.verbose('Unable to fire first workflow success telemetry event');
	}
}

export async function nodeFetchedData(
	workflowId: string | undefined | null,
	node: INode,
): Promise<void> {
	if (!workflowId) return;
	// Try to insert the data loaded statistic
	try {
		await Db.collections.WorkflowStatistics.insert({
			workflowId,
			name: StatisticsNames.dataLoaded,
			count: 1,
			latestEvent: new Date(),
		});
	} catch (error) {
		// if it's a duplicate key error then that's fine, otherwise throw the error
		if (!(error instanceof QueryFailedError)) {
			throw error;
		}
		// If it is a query failed error, we return
		return;
	}

	// Compile the metrics since this was a new data loaded event
	const owner = await getWorkflowOwner(workflowId);
	let metrics = {
		user_id: owner.id,
		workflow_id: workflowId,
		node_type: node.type,
		node_id: node.id,
	};

	// This is probably naive but I can't see a way for a node to have multiple credentials attached so..
	if (node.credentials) {
		Object.entries(node.credentials).forEach(([credName, credDetails]) => {
			metrics = Object.assign(metrics, {
				credential_type: credName,
				credential_id: credDetails.id,
			});
		});
	}

	// Send metrics to posthog
	await Container.get(InternalHooks).onFirstWorkflowDataLoad(metrics);
}
