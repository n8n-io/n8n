/**
 * # Node Execution Contexts
 *
 * This module provides specialized execution contexts for different node types and execution scenarios.
 * Each context type provides the appropriate environment and utilities for its specific execution needs.
 *
 * ## Context Types
 *
 * - **NodeExecutionContext**: Base abstract class for all contexts
 * - **BaseExecuteContext**: Foundation for regular execution contexts
 * - **ExecuteContext**: Regular node execution
 * - **ExecuteSingleContext**: Single-item node execution
 * - **WebhookContext**: Webhook node execution with HTTP request/response handling
 * - **TriggerContext**: Trigger node execution for starting workflows
 * - **PollContext**: Polling node execution for periodically checking for data
 * - **LoadOptionsContext**: Dynamic options loading for node parameters
 * - **HookContext**: Pre/post execution hooks
 * - **CredentialsTestContext**: Testing node credentials
 * - **SupplyDataContext**: Supplying data to nodes
 *
 * ## Context Hierarchy
 *
 * ```mermaid
 * classDiagram
 *     NodeExecutionContext <|-- BaseExecuteContext
 *     NodeExecutionContext <|-- WebhookContext
 *     NodeExecutionContext <|-- TriggerContext
 *     NodeExecutionContext <|-- PollContext
 *     NodeExecutionContext <|-- LoadOptionsContext
 *     NodeExecutionContext <|-- HookContext
 *     NodeExecutionContext <|-- CredentialsTestContext
 *     NodeExecutionContext <|-- SupplyDataContext
 *     BaseExecuteContext <|-- ExecuteContext
 *     BaseExecuteContext <|-- ExecuteSingleContext
 * ```
 */

export { CredentialTestContext } from './credentials-test-context';
export { ExecuteContext } from './execute-context';
export { ExecuteSingleContext } from './execute-single-context';
export { HookContext } from './hook-context';
export { LoadOptionsContext } from './load-options-context';
export { LocalLoadOptionsContext } from './local-load-options-context';
export { PollContext } from './poll-context';
export { SupplyDataContext } from './supply-data-context';
export { TriggerContext } from './trigger-context';
export { WebhookContext } from './webhook-context';

export { constructExecutionMetaData } from './utils/construct-execution-metadata';
export { getAdditionalKeys } from './utils/get-additional-keys';
export { normalizeItems } from './utils/normalize-items';
export { parseIncomingMessage } from './utils/parse-incoming-message';
export { parseRequestObject } from './utils/request-helper-functions';
export { returnJsonArray } from './utils/return-json-array';
export * from './utils/binary-helper-functions';
