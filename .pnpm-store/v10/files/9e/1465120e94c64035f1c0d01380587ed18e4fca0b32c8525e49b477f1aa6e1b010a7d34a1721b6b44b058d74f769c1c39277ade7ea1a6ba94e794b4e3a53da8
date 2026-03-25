Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');
const browserUtils = require('@sentry-internal/browser-utils');

const INTEGRATION_NAME = 'GraphQLClient';

const _graphqlClientIntegration = ((options) => {
  return {
    name: INTEGRATION_NAME,
    setup(client) {
      _updateSpanWithGraphQLData(client, options);
      _updateBreadcrumbWithGraphQLData(client, options);
    },
  };
}) ;

function _updateSpanWithGraphQLData(client, options) {
  client.on('beforeOutgoingRequestSpan', (span, hint) => {
    const spanJSON = core.spanToJSON(span);

    const spanAttributes = spanJSON.data || {};
    const spanOp = spanAttributes[core.SEMANTIC_ATTRIBUTE_SENTRY_OP];

    const isHttpClientSpan = spanOp === 'http.client';

    if (!isHttpClientSpan) {
      return;
    }

    const httpUrl = spanAttributes[core.SEMANTIC_ATTRIBUTE_URL_FULL] || spanAttributes['http.url'];
    const httpMethod = spanAttributes[core.SEMANTIC_ATTRIBUTE_HTTP_REQUEST_METHOD] || spanAttributes['http.method'];

    if (!core.isString(httpUrl) || !core.isString(httpMethod)) {
      return;
    }

    const { endpoints } = options;
    const isTracedGraphqlEndpoint = core.stringMatchesSomePattern(httpUrl, endpoints);
    const payload = getRequestPayloadXhrOrFetch(hint );

    if (isTracedGraphqlEndpoint && payload) {
      const graphqlBody = getGraphQLRequestPayload(payload);

      if (graphqlBody) {
        const operationInfo = _getGraphQLOperation(graphqlBody);
        span.updateName(`${httpMethod} ${httpUrl} (${operationInfo})`);

        // Handle standard requests - always capture the query document
        if (isStandardRequest(graphqlBody)) {
          span.setAttribute('graphql.document', graphqlBody.query);
        }

        // Handle persisted operations - capture hash for debugging
        if (isPersistedRequest(graphqlBody)) {
          span.setAttribute('graphql.persisted_query.hash.sha256', graphqlBody.extensions.persistedQuery.sha256Hash);
          span.setAttribute('graphql.persisted_query.version', graphqlBody.extensions.persistedQuery.version);
        }
      }
    }
  });
}

function _updateBreadcrumbWithGraphQLData(client, options) {
  client.on('beforeOutgoingRequestBreadcrumb', (breadcrumb, handlerData) => {
    const { category, type, data } = breadcrumb;

    const isFetch = category === 'fetch';
    const isXhr = category === 'xhr';
    const isHttpBreadcrumb = type === 'http';

    if (isHttpBreadcrumb && (isFetch || isXhr)) {
      const httpUrl = data?.url;
      const { endpoints } = options;

      const isTracedGraphqlEndpoint = core.stringMatchesSomePattern(httpUrl, endpoints);
      const payload = getRequestPayloadXhrOrFetch(handlerData );

      if (isTracedGraphqlEndpoint && data && payload) {
        const graphqlBody = getGraphQLRequestPayload(payload);

        if (!data.graphql && graphqlBody) {
          const operationInfo = _getGraphQLOperation(graphqlBody);

          data['graphql.operation'] = operationInfo;

          if (isStandardRequest(graphqlBody)) {
            data['graphql.document'] = graphqlBody.query;
          }

          if (isPersistedRequest(graphqlBody)) {
            data['graphql.persisted_query.hash.sha256'] = graphqlBody.extensions.persistedQuery.sha256Hash;
            data['graphql.persisted_query.version'] = graphqlBody.extensions.persistedQuery.version;
          }
        }
      }
    }
  });
}

/**
 * @param requestBody - GraphQL request
 * @returns A formatted version of the request: 'TYPE NAME' or 'TYPE' or 'persisted NAME'
 */
function _getGraphQLOperation(requestBody) {
  // Handle persisted operations
  if (isPersistedRequest(requestBody)) {
    return `persisted ${requestBody.operationName}`;
  }

  // Handle standard GraphQL requests
  if (isStandardRequest(requestBody)) {
    const { query: graphqlQuery, operationName: graphqlOperationName } = requestBody;
    const { operationName = graphqlOperationName, operationType } = parseGraphQLQuery(graphqlQuery);
    const operationInfo = operationName ? `${operationType} ${operationName}` : `${operationType}`;
    return operationInfo;
  }

  // Fallback for unknown request types
  return 'unknown';
}

/**
 * Get the request body/payload based on the shape of the hint.
 *
 * Exported for tests only.
 */
function getRequestPayloadXhrOrFetch(hint) {
  const isXhr = 'xhr' in hint;

  let body;

  if (isXhr) {
    const sentryXhrData = hint.xhr[browserUtils.SENTRY_XHR_DATA_KEY];
    body = sentryXhrData && browserUtils.getBodyString(sentryXhrData.body)[0];
  } else {
    const sentryFetchData = browserUtils.getFetchRequestArgBody(hint.input);
    body = browserUtils.getBodyString(sentryFetchData)[0];
  }

  return body;
}

/**
 * Extract the name and type of the operation from the GraphQL query.
 *
 * Exported for tests only.
 */
function parseGraphQLQuery(query) {
  const namedQueryRe = /^(?:\s*)(query|mutation|subscription)(?:\s*)(\w+)(?:\s*)[{(]/;
  const unnamedQueryRe = /^(?:\s*)(query|mutation|subscription)(?:\s*)[{(]/;

  const namedMatch = query.match(namedQueryRe);
  if (namedMatch) {
    return {
      operationType: namedMatch[1],
      operationName: namedMatch[2],
    };
  }

  const unnamedMatch = query.match(unnamedQueryRe);
  if (unnamedMatch) {
    return {
      operationType: unnamedMatch[1],
      operationName: undefined,
    };
  }
  return {
    operationType: undefined,
    operationName: undefined,
  };
}

/**
 * Helper to safely check if a value is a non-null object
 */
function isObject(value) {
  return typeof value === 'object' && value !== null;
}

/**
 * Type guard to check if a request is a standard GraphQL request
 */
function isStandardRequest(payload) {
  return isObject(payload) && typeof payload.query === 'string';
}

/**
 * Type guard to check if a request is a persisted operation request
 */
function isPersistedRequest(payload) {
  return (
    isObject(payload) &&
    typeof payload.operationName === 'string' &&
    isObject(payload.extensions) &&
    isObject(payload.extensions.persistedQuery) &&
    typeof payload.extensions.persistedQuery.sha256Hash === 'string' &&
    typeof payload.extensions.persistedQuery.version === 'number'
  );
}

/**
 * Extract the payload of a request if it's GraphQL.
 * Exported for tests only.
 * @param payload - A valid JSON string
 * @returns A POJO or undefined
 */
function getGraphQLRequestPayload(payload) {
  try {
    const requestBody = JSON.parse(payload);

    // Return any valid GraphQL request (standard, persisted, or APQ retry with both)
    if (isStandardRequest(requestBody) || isPersistedRequest(requestBody)) {
      return requestBody;
    }

    // Not a GraphQL request
    return undefined;
  } catch {
    // Invalid JSON
    return undefined;
  }
}

/**
 * This integration ensures that GraphQL requests made in the browser
 * have their GraphQL-specific data captured and attached to spans and breadcrumbs.
 */
const graphqlClientIntegration = core.defineIntegration(_graphqlClientIntegration);

exports._getGraphQLOperation = _getGraphQLOperation;
exports.getGraphQLRequestPayload = getGraphQLRequestPayload;
exports.getRequestPayloadXhrOrFetch = getRequestPayloadXhrOrFetch;
exports.graphqlClientIntegration = graphqlClientIntegration;
exports.parseGraphQLQuery = parseGraphQLQuery;
//# sourceMappingURL=graphqlClient.js.map
