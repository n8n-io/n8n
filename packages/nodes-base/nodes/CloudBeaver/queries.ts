export type GqlQuery = { query: string; operationName: string };

export const AUTH_LOGIN: GqlQuery = {
	operationName: 'authLogin',
	query: `
query authLogin($provider: ID!, $credentials: Object) {
  authLogin(provider: $provider, credentials: $credentials) {
    authStatus
  }
}`,
};

export const SQL_CONTEXT_CREATE: GqlQuery = {
	operationName: 'sqlContextCreate',
	query: `
mutation sqlContextCreate($connectionId: ID!, $projectId: ID) {
  sqlContextCreate(connectionId: $connectionId, projectId: $projectId) {
    id
  }
}`,
};

export const SQL_CONTEXT_DESTROY: GqlQuery = {
	operationName: 'sqlContextDestroy',
	query: `
mutation sqlContextDestroy($connectionId: ID!, $contextId: ID!, $projectId: ID) {
  sqlContextDestroy(connectionId: $connectionId, contextId: $contextId, projectId: $projectId)
}`,
};

export const ASYNC_SQL_EXECUTE_QUERY: GqlQuery = {
	operationName: 'asyncSqlExecuteQuery',
	query: `
mutation asyncSqlExecuteQuery(
  $connectionId: ID!,
  $contextId: ID!,
  $sql: String!,
  $filter: SQLDataFilter,
  $projectId: ID
) {
  asyncSqlExecuteQuery(
    connectionId: $connectionId,
    contextId: $contextId,
    sql: $sql,
    filter: $filter,
    projectId: $projectId
  ) {
    id
    running
  }
}`,
};

export const ASYNC_SQL_EXECUTE_RESULTS: GqlQuery = {
	operationName: 'asyncSqlExecuteResults',
	query: `
mutation asyncSqlExecuteResults($taskId: ID!) {
  asyncSqlExecuteResults(taskId: $taskId) {
    results {
      resultSet {
        columns { name }
        rowsWithMetaData { data }
      }
    }
  }
}`,
};

export const INIT_CONNECTION: GqlQuery = {
	operationName: 'initConnection',
	query: `
mutation initConnection($id: ID!, $projectId: ID!) {
  initConnection(id: $id, projectId: $projectId) {
    id
  }
}`,
};

export const CLOSE_SESSION: GqlQuery = {
	operationName: 'closeSession',
	query: `
mutation closeSession {
  closeSession
}`,
};

export const ASYNC_TASK_INFO: GqlQuery = {
	operationName: 'asyncTaskInfo',
	query: `
mutation asyncTaskInfo($id: String!) {
  asyncTaskInfo(id: $id, removeOnFinish: false) {
    id
    running
    status
    error { message errorCode stackTrace }
  }
}`,
};
