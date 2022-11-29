import { validate as jsonSchemaValidate } from 'jsonschema';
import { deepCopy, IDataObject, LoggerProxy, JsonObject, jsonParse } from 'n8n-workflow';
import { FindOperator, In, IsNull, LessThanOrEqual, Not, Raw } from 'typeorm';
import * as ActiveExecutions from '@/ActiveExecutions';
import config from '@/config';
import { User } from '@/databases/entities/User';
import { DEFAULT_EXECUTIONS_GET_ALL_LIMIT } from '@/GenericHelpers';
import {
	IExecutionFlattedResponse,
	IExecutionResponse,
	IExecutionsListResponse,
	IWorkflowExecutionDataProcess,
} from '@/Interfaces';
import * as Queue from '@/Queue';
import type { ExecutionRequest } from '@/requests';
import * as ResponseHelper from '@/ResponseHelper';
import { getSharedWorkflowIds } from '@/WorkflowHelpers';
import { DatabaseType, Db, GenericHelpers } from '..';

interface IGetExecutionsQueryFilter {
	id?: FindOperator<string>;
	finished?: boolean;
	mode?: string;
	retryOf?: string;
	retrySuccessId?: string;
	workflowId?: number | string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	waitTill?: FindOperator<any> | boolean;
}

const schemaGetExecutionsQueryFilter = {
	$id: '/IGetExecutionsQueryFilter',
	type: 'object',
	properties: {
		finished: { type: 'boolean' },
		mode: { type: 'string' },
		retryOf: { type: 'string' },
		retrySuccessId: { type: 'string' },
		waitTill: { type: 'boolean' },
		workflowId: { anyOf: [{ type: 'integer' }, { type: 'string' }] },
	},
};

const allowedExecutionsQueryFilterFields = Object.keys(schemaGetExecutionsQueryFilter.properties);

export class ExecutionsService {
	/**
	 * Function to get the workflow Ids for a User
	 * Overridden in EE version to ignore roles
	 */
	static async getWorkflowIdsForUser(user: User): Promise<number[]> {
		// Get all workflows using owner role
		console.log('FE list called');
		return getSharedWorkflowIds(user, ['owner']);
	}

	/**
	 * Helper function to retrieve count of Executions
	 */
	static async getExecutionsCount(
		countFilter: IDataObject,
		user: User,
	): Promise<{ count: number; estimated: boolean }> {
		const dbType = (await GenericHelpers.getConfigValue('database.type')) as DatabaseType;
		const filteredFields = Object.keys(countFilter).filter((field) => field !== 'id');

		// For databases other than Postgres, do a regular count
		// when filtering based on `workflowId` or `finished` fields.
		if (dbType !== 'postgresdb' || filteredFields.length > 0 || user.globalRole.name !== 'owner') {
			const sharedWorkflowIds = await this.getWorkflowIdsForUser(user);

			const countParams = { where: { workflowId: In(sharedWorkflowIds), ...countFilter } };
			const count = await Db.collections.Execution.count(countParams);
			return { count, estimated: false };
		}

		try {
			// Get an estimate of rows count.
			const estimateRowsNumberSql =
				"SELECT n_live_tup FROM pg_stat_all_tables WHERE relname = 'execution_entity';";
			const rows: Array<{ n_live_tup: string }> = await Db.collections.Execution.query(
				estimateRowsNumberSql,
			);

			const estimate = parseInt(rows[0].n_live_tup, 10);
			// If over 100k, return just an estimate.
			if (estimate > 100_000) {
				// if less than 100k, we get the real count as even a full
				// table scan should not take so long.
				return { count: estimate, estimated: true };
			}
		} catch (error) {
			LoggerProxy.warn(`Failed to get executions count from Postgres: ${error}`);
		}

		const sharedWorkflowIds = await getSharedWorkflowIds(user);

		const count = await Db.collections.Execution.count({
			where: {
				workflowId: In(sharedWorkflowIds),
			},
		});

		return { count, estimated: false };
	}

	static async getExecutionsList(
		req: ExecutionRequest.GetAll,
		sharedWorkflowIds: number[],
	): Promise<IExecutionsListResponse> {
		if (sharedWorkflowIds.length === 0) {
			// return early since without shared workflows there can be no hits
			// (note: getSharedWorkflowIds() returns _all_ workflow ids for global owners)
			return {
				count: 0,
				estimated: false,
				results: [],
			};
		}

		// parse incoming filter object and remove non-valid fields
		let filter: IGetExecutionsQueryFilter | undefined = undefined;
		if (req.query.filter) {
			try {
				const filterJson: JsonObject = jsonParse(req.query.filter);
				if (filterJson) {
					Object.keys(filterJson).map((key) => {
						if (!allowedExecutionsQueryFilterFields.includes(key)) delete filterJson[key];
					});
					if (jsonSchemaValidate(filterJson, schemaGetExecutionsQueryFilter).valid) {
						filter = filterJson as IGetExecutionsQueryFilter;
					}
				}
			} catch (error) {
				LoggerProxy.error('Failed to parse filter', {
					userId: req.user.id,
					filter: req.query.filter,
				});
				throw new ResponseHelper.InternalServerError(
					`Parameter "filter" contained invalid JSON string.`,
				);
			}
		}

		// safeguard against querying workflowIds not shared with the user
		if (filter?.workflowId !== undefined) {
			const workflowId = parseInt(filter.workflowId.toString());
			if (workflowId && !sharedWorkflowIds.includes(workflowId)) {
				LoggerProxy.verbose(
					`User ${req.user.id} attempted to query non-shared workflow ${workflowId}`,
				);
				return {
					count: 0,
					estimated: false,
					results: [],
				};
			}
		}

		const limit = req.query.limit
			? parseInt(req.query.limit, 10)
			: DEFAULT_EXECUTIONS_GET_ALL_LIMIT;

		const executingWorkflowIds: string[] = [];

		if (config.getEnv('executions.mode') === 'queue') {
			const currentJobs = await Queue.getInstance().getJobs(['active', 'waiting']);
			executingWorkflowIds.push(...currentJobs.map(({ data }) => data.executionId));
		}

		// We may have manual executions even with queue so we must account for these.
		executingWorkflowIds.push(
			...ActiveExecutions.getInstance()
				.getActiveExecutions()
				.map(({ id }) => id),
		);

		const findWhere = { workflowId: In(sharedWorkflowIds) };

		const rangeQuery: string[] = [];
		const rangeQueryParams: {
			lastId?: string;
			firstId?: string;
			executingWorkflowIds?: string[];
		} = {};

		if (req.query.lastId) {
			rangeQuery.push('id < :lastId');
			rangeQueryParams.lastId = req.query.lastId;
		}

		if (req.query.firstId) {
			rangeQuery.push('id > :firstId');
			rangeQueryParams.firstId = req.query.firstId;
		}

		if (executingWorkflowIds.length > 0) {
			rangeQuery.push(`id NOT IN (:...executingWorkflowIds)`);
			rangeQueryParams.executingWorkflowIds = executingWorkflowIds;
		}

		if (rangeQuery.length) {
			Object.assign(findWhere, {
				id: Raw(() => rangeQuery.join(' and '), rangeQueryParams),
			});
		}

		let query = Db.collections.Execution.createQueryBuilder()
			.select()
			.orderBy('id', 'DESC')
			.take(limit)
			.where(findWhere);

		if (filter) {
			if (filter.waitTill === true) {
				filter.waitTill = Not(IsNull());
				// eslint-disable-next-line @typescript-eslint/no-unnecessary-boolean-literal-compare
			} else if (filter.finished === false) {
				filter.waitTill = IsNull();
			} else {
				delete filter.waitTill;
			}
			query = query.andWhere(filter);
		}

		const countFilter = deepCopy(filter ?? {});
		countFilter.id = Not(In(executingWorkflowIds));

		const executions = await query.getMany();

		const { count, estimated } = await this.getExecutionsCount(
			countFilter as IDataObject,
			req.user,
		);

		const formattedExecutions = executions.map((execution) => {
			return {
				id: execution.id.toString(),
				finished: execution.finished,
				mode: execution.mode,
				retryOf: execution.retryOf?.toString(),
				retrySuccessId: execution?.retrySuccessId?.toString(),
				waitTill: execution.waitTill as Date | undefined,
				startedAt: execution.startedAt,
				stoppedAt: execution.stoppedAt,
				workflowId: execution.workflowData?.id?.toString() ?? '',
				workflowName: execution.workflowData?.name,
			};
		});

		return {
			count,
			results: formattedExecutions,
			estimated,
		};
	}
}
