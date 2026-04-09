"use strict";
/*
 * Copyright The OpenTelemetry Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.METRIC_HTTP_CLIENT_OPEN_CONNECTIONS = exports.METRIC_HTTP_CLIENT_CONNECTION_DURATION = exports.METRIC_HTTP_CLIENT_ACTIVE_REQUESTS = exports.METRIC_GO_SCHEDULE_DURATION = exports.METRIC_GO_PROCESSOR_LIMIT = exports.METRIC_GO_MEMORY_USED = exports.METRIC_GO_MEMORY_LIMIT = exports.METRIC_GO_MEMORY_GC_GOAL = exports.METRIC_GO_MEMORY_ALLOCATIONS = exports.METRIC_GO_MEMORY_ALLOCATED = exports.METRIC_GO_GOROUTINE_COUNT = exports.METRIC_GO_CONFIG_GOGC = exports.METRIC_GEN_AI_SERVER_TIME_TO_FIRST_TOKEN = exports.METRIC_GEN_AI_SERVER_TIME_PER_OUTPUT_TOKEN = exports.METRIC_GEN_AI_SERVER_REQUEST_DURATION = exports.METRIC_GEN_AI_CLIENT_TOKEN_USAGE = exports.METRIC_GEN_AI_CLIENT_OPERATION_DURATION = exports.METRIC_FAAS_TIMEOUTS = exports.METRIC_FAAS_NET_IO = exports.METRIC_FAAS_MEM_USAGE = exports.METRIC_FAAS_INVOKE_DURATION = exports.METRIC_FAAS_INVOCATIONS = exports.METRIC_FAAS_INIT_DURATION = exports.METRIC_FAAS_ERRORS = exports.METRIC_FAAS_CPU_USAGE = exports.METRIC_FAAS_COLDSTARTS = exports.METRIC_DNS_LOOKUP_DURATION = exports.METRIC_DB_CLIENT_OPERATION_DURATION = exports.METRIC_DB_CLIENT_CONNECTIONS_WAIT_TIME = exports.METRIC_DB_CLIENT_CONNECTIONS_USE_TIME = exports.METRIC_DB_CLIENT_CONNECTIONS_USAGE = exports.METRIC_DB_CLIENT_CONNECTIONS_TIMEOUTS = exports.METRIC_DB_CLIENT_CONNECTIONS_PENDING_REQUESTS = exports.METRIC_DB_CLIENT_CONNECTIONS_MAX = exports.METRIC_DB_CLIENT_CONNECTIONS_IDLE_MIN = exports.METRIC_DB_CLIENT_CONNECTIONS_IDLE_MAX = exports.METRIC_DB_CLIENT_CONNECTIONS_CREATE_TIME = exports.METRIC_DB_CLIENT_CONNECTION_WAIT_TIME = exports.METRIC_DB_CLIENT_CONNECTION_USE_TIME = exports.METRIC_DB_CLIENT_CONNECTION_TIMEOUTS = exports.METRIC_DB_CLIENT_CONNECTION_PENDING_REQUESTS = exports.METRIC_DB_CLIENT_CONNECTION_MAX = exports.METRIC_DB_CLIENT_CONNECTION_IDLE_MIN = exports.METRIC_DB_CLIENT_CONNECTION_IDLE_MAX = exports.METRIC_DB_CLIENT_CONNECTION_CREATE_TIME = exports.METRIC_DB_CLIENT_CONNECTION_COUNT = exports.METRIC_CONTAINER_NETWORK_IO = exports.METRIC_CONTAINER_MEMORY_USAGE = exports.METRIC_CONTAINER_DISK_IO = exports.METRIC_CONTAINER_CPU_TIME = void 0;
exports.METRIC_SYSTEM_CPU_FREQUENCY = exports.METRIC_RPC_SERVER_RESPONSES_PER_RPC = exports.METRIC_RPC_SERVER_RESPONSE_SIZE = exports.METRIC_RPC_SERVER_REQUESTS_PER_RPC = exports.METRIC_RPC_SERVER_REQUEST_SIZE = exports.METRIC_RPC_SERVER_DURATION = exports.METRIC_RPC_CLIENT_RESPONSES_PER_RPC = exports.METRIC_RPC_CLIENT_RESPONSE_SIZE = exports.METRIC_RPC_CLIENT_REQUESTS_PER_RPC = exports.METRIC_RPC_CLIENT_REQUEST_SIZE = exports.METRIC_RPC_CLIENT_DURATION = exports.METRIC_PROCESS_THREAD_COUNT = exports.METRIC_PROCESS_PAGING_FAULTS = exports.METRIC_PROCESS_OPEN_FILE_DESCRIPTOR_COUNT = exports.METRIC_PROCESS_NETWORK_IO = exports.METRIC_PROCESS_MEMORY_VIRTUAL = exports.METRIC_PROCESS_MEMORY_USAGE = exports.METRIC_PROCESS_DISK_IO = exports.METRIC_PROCESS_CPU_UTILIZATION = exports.METRIC_PROCESS_CPU_TIME = exports.METRIC_PROCESS_CONTEXT_SWITCHES = exports.METRIC_NODEJS_EVENTLOOP_UTILIZATION = exports.METRIC_NODEJS_EVENTLOOP_DELAY_STDDEV = exports.METRIC_NODEJS_EVENTLOOP_DELAY_P99 = exports.METRIC_NODEJS_EVENTLOOP_DELAY_P90 = exports.METRIC_NODEJS_EVENTLOOP_DELAY_P50 = exports.METRIC_NODEJS_EVENTLOOP_DELAY_MIN = exports.METRIC_NODEJS_EVENTLOOP_DELAY_MEAN = exports.METRIC_NODEJS_EVENTLOOP_DELAY_MAX = exports.METRIC_MESSAGING_RECEIVE_MESSAGES = exports.METRIC_MESSAGING_RECEIVE_DURATION = exports.METRIC_MESSAGING_PUBLISH_MESSAGES = exports.METRIC_MESSAGING_PUBLISH_DURATION = exports.METRIC_MESSAGING_PROCESS_MESSAGES = exports.METRIC_MESSAGING_PROCESS_DURATION = exports.METRIC_MESSAGING_CLIENT_PUBLISHED_MESSAGES = exports.METRIC_MESSAGING_CLIENT_OPERATION_DURATION = exports.METRIC_MESSAGING_CLIENT_CONSUMED_MESSAGES = exports.METRIC_JVM_SYSTEM_CPU_UTILIZATION = exports.METRIC_JVM_SYSTEM_CPU_LOAD_1M = exports.METRIC_JVM_MEMORY_INIT = exports.METRIC_JVM_BUFFER_MEMORY_USED = exports.METRIC_JVM_BUFFER_MEMORY_USAGE = exports.METRIC_JVM_BUFFER_MEMORY_LIMIT = exports.METRIC_JVM_BUFFER_COUNT = exports.METRIC_HTTP_SERVER_RESPONSE_BODY_SIZE = exports.METRIC_HTTP_SERVER_REQUEST_BODY_SIZE = exports.METRIC_HTTP_SERVER_ACTIVE_REQUESTS = exports.METRIC_HTTP_CLIENT_RESPONSE_BODY_SIZE = exports.METRIC_HTTP_CLIENT_REQUEST_BODY_SIZE = void 0;
exports.METRIC_V8JS_MEMORY_HEAP_USED = exports.METRIC_V8JS_MEMORY_HEAP_LIMIT = exports.METRIC_V8JS_HEAP_SPACE_PHYSICAL_SIZE = exports.METRIC_V8JS_HEAP_SPACE_AVAILABLE_SIZE = exports.METRIC_V8JS_GC_DURATION = exports.METRIC_SYSTEM_PROCESS_CREATED = exports.METRIC_SYSTEM_PROCESS_COUNT = exports.METRIC_SYSTEM_PAGING_UTILIZATION = exports.METRIC_SYSTEM_PAGING_USAGE = exports.METRIC_SYSTEM_PAGING_OPERATIONS = exports.METRIC_SYSTEM_PAGING_FAULTS = exports.METRIC_SYSTEM_NETWORK_PACKETS = exports.METRIC_SYSTEM_NETWORK_IO = exports.METRIC_SYSTEM_NETWORK_ERRORS = exports.METRIC_SYSTEM_NETWORK_DROPPED = exports.METRIC_SYSTEM_NETWORK_CONNECTIONS = exports.METRIC_SYSTEM_MEMORY_UTILIZATION = exports.METRIC_SYSTEM_MEMORY_USAGE = exports.METRIC_SYSTEM_MEMORY_SHARED = exports.METRIC_SYSTEM_MEMORY_LIMIT = exports.METRIC_SYSTEM_LINUX_MEMORY_SLAB_USAGE = exports.METRIC_SYSTEM_LINUX_MEMORY_AVAILABLE = exports.METRIC_SYSTEM_FILESYSTEM_UTILIZATION = exports.METRIC_SYSTEM_FILESYSTEM_USAGE = exports.METRIC_SYSTEM_DISK_OPERATIONS = exports.METRIC_SYSTEM_DISK_OPERATION_TIME = exports.METRIC_SYSTEM_DISK_MERGED = exports.METRIC_SYSTEM_DISK_IO_TIME = exports.METRIC_SYSTEM_DISK_IO = exports.METRIC_SYSTEM_CPU_UTILIZATION = exports.METRIC_SYSTEM_CPU_TIME = exports.METRIC_SYSTEM_CPU_PHYSICAL_COUNT = exports.METRIC_SYSTEM_CPU_LOGICAL_COUNT = void 0;
//----------------------------------------------------------------------------------------------------------
// DO NOT EDIT, this is an Auto-generated file from scripts/semconv/templates/register/stable/metrics.ts.j2
//----------------------------------------------------------------------------------------------------------
/**
 * Total CPU time consumed
 *
 * @note Total CPU time consumed by the specific container on all available CPU cores
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_CONTAINER_CPU_TIME = 'container.cpu.time';
/**
 * Disk bytes for the container.
 *
 * @note The total number of bytes read/written successfully (aggregated from all disks).
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_CONTAINER_DISK_IO = 'container.disk.io';
/**
 * Memory usage of the container.
 *
 * @note Memory usage of the container.
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_CONTAINER_MEMORY_USAGE = 'container.memory.usage';
/**
 * Network bytes for the container.
 *
 * @note The number of bytes sent/received on all network interfaces by the container.
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_CONTAINER_NETWORK_IO = 'container.network.io';
/**
 * The number of connections that are currently in state described by the `state` attribute
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_DB_CLIENT_CONNECTION_COUNT = 'db.client.connection.count';
/**
 * The time it took to create a new connection
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_DB_CLIENT_CONNECTION_CREATE_TIME = 'db.client.connection.create_time';
/**
 * The maximum number of idle open connections allowed
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_DB_CLIENT_CONNECTION_IDLE_MAX = 'db.client.connection.idle.max';
/**
 * The minimum number of idle open connections allowed
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_DB_CLIENT_CONNECTION_IDLE_MIN = 'db.client.connection.idle.min';
/**
 * The maximum number of open connections allowed
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_DB_CLIENT_CONNECTION_MAX = 'db.client.connection.max';
/**
 * The number of pending requests for an open connection, cumulative for the entire pool
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_DB_CLIENT_CONNECTION_PENDING_REQUESTS = 'db.client.connection.pending_requests';
/**
 * The number of connection timeouts that have occurred trying to obtain a connection from the pool
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_DB_CLIENT_CONNECTION_TIMEOUTS = 'db.client.connection.timeouts';
/**
 * The time between borrowing a connection and returning it to the pool
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_DB_CLIENT_CONNECTION_USE_TIME = 'db.client.connection.use_time';
/**
 * The time it took to obtain an open connection from the pool
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_DB_CLIENT_CONNECTION_WAIT_TIME = 'db.client.connection.wait_time';
/**
 * Deprecated, use `db.client.connection.create_time` instead. Note: the unit also changed from `ms` to `s`.
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 *
 * @deprecated  * Replaced by `db.client.connection.create_time`. Note: the unit also changed from `ms` to `s`.
 */
exports.METRIC_DB_CLIENT_CONNECTIONS_CREATE_TIME = 'db.client.connections.create_time';
/**
 * Deprecated, use `db.client.connection.idle.max` instead.
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 *
 * @deprecated  * Replaced by `db.client.connection.idle.max`.
 */
exports.METRIC_DB_CLIENT_CONNECTIONS_IDLE_MAX = 'db.client.connections.idle.max';
/**
 * Deprecated, use `db.client.connection.idle.min` instead.
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 *
 * @deprecated  * Replaced by `db.client.connection.idle.min`.
 */
exports.METRIC_DB_CLIENT_CONNECTIONS_IDLE_MIN = 'db.client.connections.idle.min';
/**
 * Deprecated, use `db.client.connection.max` instead.
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 *
 * @deprecated  * Replaced by `db.client.connection.max`.
 */
exports.METRIC_DB_CLIENT_CONNECTIONS_MAX = 'db.client.connections.max';
/**
 * Deprecated, use `db.client.connection.pending_requests` instead.
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 *
 * @deprecated  * Replaced by `db.client.connection.pending_requests`.
 */
exports.METRIC_DB_CLIENT_CONNECTIONS_PENDING_REQUESTS = 'db.client.connections.pending_requests';
/**
 * Deprecated, use `db.client.connection.timeouts` instead.
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 *
 * @deprecated  * Replaced by `db.client.connection.timeouts`.
 */
exports.METRIC_DB_CLIENT_CONNECTIONS_TIMEOUTS = 'db.client.connections.timeouts';
/**
 * Deprecated, use `db.client.connection.count` instead.
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 *
 * @deprecated  * Replaced by `db.client.connection.count`.
 */
exports.METRIC_DB_CLIENT_CONNECTIONS_USAGE = 'db.client.connections.usage';
/**
 * Deprecated, use `db.client.connection.use_time` instead. Note: the unit also changed from `ms` to `s`.
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 *
 * @deprecated  * Replaced by `db.client.connection.use_time`. Note: the unit also changed from `ms` to `s`.
 */
exports.METRIC_DB_CLIENT_CONNECTIONS_USE_TIME = 'db.client.connections.use_time';
/**
 * Deprecated, use `db.client.connection.wait_time` instead. Note: the unit also changed from `ms` to `s`.
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 *
 * @deprecated  * Replaced by `db.client.connection.wait_time`. Note: the unit also changed from `ms` to `s`.
 */
exports.METRIC_DB_CLIENT_CONNECTIONS_WAIT_TIME = 'db.client.connections.wait_time';
/**
 * Duration of database client operations.
 *
 * @note Batch operations **SHOULD** be recorded as a single operation.
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_DB_CLIENT_OPERATION_DURATION = 'db.client.operation.duration';
/**
 * Measures the time taken to perform a DNS lookup.
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_DNS_LOOKUP_DURATION = 'dns.lookup.duration';
/**
 * Number of invocation cold starts
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_FAAS_COLDSTARTS = 'faas.coldstarts';
/**
 * Distribution of CPU usage per invocation
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_FAAS_CPU_USAGE = 'faas.cpu_usage';
/**
 * Number of invocation errors
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_FAAS_ERRORS = 'faas.errors';
/**
 * Measures the duration of the function's initialization, such as a cold start
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_FAAS_INIT_DURATION = 'faas.init_duration';
/**
 * Number of successful invocations
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_FAAS_INVOCATIONS = 'faas.invocations';
/**
 * Measures the duration of the function's logic execution
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_FAAS_INVOKE_DURATION = 'faas.invoke_duration';
/**
 * Distribution of max memory usage per invocation
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_FAAS_MEM_USAGE = 'faas.mem_usage';
/**
 * Distribution of net I/O usage per invocation
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_FAAS_NET_IO = 'faas.net_io';
/**
 * Number of invocation timeouts
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_FAAS_TIMEOUTS = 'faas.timeouts';
/**
 * GenAI operation duration
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_GEN_AI_CLIENT_OPERATION_DURATION = 'gen_ai.client.operation.duration';
/**
 * Measures number of input and output tokens used
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_GEN_AI_CLIENT_TOKEN_USAGE = 'gen_ai.client.token.usage';
/**
 * Generative AI server request duration such as time-to-last byte or last output token
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_GEN_AI_SERVER_REQUEST_DURATION = 'gen_ai.server.request.duration';
/**
 * Time per output token generated after the first token for successful responses
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_GEN_AI_SERVER_TIME_PER_OUTPUT_TOKEN = 'gen_ai.server.time_per_output_token';
/**
 * Time to generate first token for successful responses
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_GEN_AI_SERVER_TIME_TO_FIRST_TOKEN = 'gen_ai.server.time_to_first_token';
/**
 * Heap size target percentage configured by the user, otherwise 100.
 *
 * @note The value range is [0.0,100.0]. Computed from `/gc/gogc:percent`.
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_GO_CONFIG_GOGC = 'go.config.gogc';
/**
 * Count of live goroutines.
 *
 * @note Computed from `/sched/goroutines:goroutines`.
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_GO_GOROUTINE_COUNT = 'go.goroutine.count';
/**
 * Memory allocated to the heap by the application.
 *
 * @note Computed from `/gc/heap/allocs:bytes`.
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_GO_MEMORY_ALLOCATED = 'go.memory.allocated';
/**
 * Count of allocations to the heap by the application.
 *
 * @note Computed from `/gc/heap/allocs:objects`.
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_GO_MEMORY_ALLOCATIONS = 'go.memory.allocations';
/**
 * Heap size target for the end of the GC cycle.
 *
 * @note Computed from `/gc/heap/goal:bytes`.
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_GO_MEMORY_GC_GOAL = 'go.memory.gc.goal';
/**
 * Go runtime memory limit configured by the user, if a limit exists.
 *
 * @note Computed from `/gc/gomemlimit:bytes`. This metric is excluded if the limit obtained from the Go runtime is math.MaxInt64.
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_GO_MEMORY_LIMIT = 'go.memory.limit';
/**
 * Memory used by the Go runtime.
 *
 * @note Computed from `(/memory/classes/total:bytes - /memory/classes/heap/released:bytes)`.
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_GO_MEMORY_USED = 'go.memory.used';
/**
 * The number of OS threads that can execute user-level Go code simultaneously.
 *
 * @note Computed from `/sched/gomaxprocs:threads`.
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_GO_PROCESSOR_LIMIT = 'go.processor.limit';
/**
 * The time goroutines have spent in the scheduler in a runnable state before actually running.
 *
 * @note Computed from `/sched/latencies:seconds`. Bucket boundaries are provided by the runtime, and are subject to change.
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_GO_SCHEDULE_DURATION = 'go.schedule.duration';
/**
 * Number of active HTTP requests.
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_HTTP_CLIENT_ACTIVE_REQUESTS = 'http.client.active_requests';
/**
 * The duration of the successfully established outbound HTTP connections.
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_HTTP_CLIENT_CONNECTION_DURATION = 'http.client.connection.duration';
/**
 * Number of outbound HTTP connections that are currently active or idle on the client.
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_HTTP_CLIENT_OPEN_CONNECTIONS = 'http.client.open_connections';
/**
 * Size of HTTP client request bodies.
 *
 * @note The size of the request payload body in bytes. This is the number of bytes transferred excluding headers and is often, but not always, present as the [Content-Length](https://www.rfc-editor.org/rfc/rfc9110.html#field.content-length) header. For requests using transport encoding, this should be the compressed size.
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_HTTP_CLIENT_REQUEST_BODY_SIZE = 'http.client.request.body.size';
/**
 * Size of HTTP client response bodies.
 *
 * @note The size of the response payload body in bytes. This is the number of bytes transferred excluding headers and is often, but not always, present as the [Content-Length](https://www.rfc-editor.org/rfc/rfc9110.html#field.content-length) header. For requests using transport encoding, this should be the compressed size.
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_HTTP_CLIENT_RESPONSE_BODY_SIZE = 'http.client.response.body.size';
/**
 * Number of active HTTP server requests.
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_HTTP_SERVER_ACTIVE_REQUESTS = 'http.server.active_requests';
/**
 * Size of HTTP server request bodies.
 *
 * @note The size of the request payload body in bytes. This is the number of bytes transferred excluding headers and is often, but not always, present as the [Content-Length](https://www.rfc-editor.org/rfc/rfc9110.html#field.content-length) header. For requests using transport encoding, this should be the compressed size.
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_HTTP_SERVER_REQUEST_BODY_SIZE = 'http.server.request.body.size';
/**
 * Size of HTTP server response bodies.
 *
 * @note The size of the response payload body in bytes. This is the number of bytes transferred excluding headers and is often, but not always, present as the [Content-Length](https://www.rfc-editor.org/rfc/rfc9110.html#field.content-length) header. For requests using transport encoding, this should be the compressed size.
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_HTTP_SERVER_RESPONSE_BODY_SIZE = 'http.server.response.body.size';
/**
 * Number of buffers in the pool.
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_JVM_BUFFER_COUNT = 'jvm.buffer.count';
/**
 * Measure of total memory capacity of buffers.
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_JVM_BUFFER_MEMORY_LIMIT = 'jvm.buffer.memory.limit';
/**
 * Deprecated, use `jvm.buffer.memory.used` instead.
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 *
 * @deprecated  * Replaced by `jvm.buffer.memory.used`.
 */
exports.METRIC_JVM_BUFFER_MEMORY_USAGE = 'jvm.buffer.memory.usage';
/**
 * Measure of memory used by buffers.
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_JVM_BUFFER_MEMORY_USED = 'jvm.buffer.memory.used';
/**
 * Measure of initial memory requested.
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_JVM_MEMORY_INIT = 'jvm.memory.init';
/**
 * Average CPU load of the whole system for the last minute as reported by the JVM.
 *
 * @note The value range is [0,n], where n is the number of CPU cores - or a negative number if the value is not available. This utilization is not defined as being for the specific interval since last measurement (unlike `system.cpu.utilization`). [Reference](https://docs.oracle.com/en/java/javase/17/docs/api/java.management/java/lang/management/OperatingSystemMXBean.html#getSystemLoadAverage()).
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_JVM_SYSTEM_CPU_LOAD_1M = 'jvm.system.cpu.load_1m';
/**
 * Recent CPU utilization for the whole system as reported by the JVM.
 *
 * @note The value range is [0.0,1.0]. This utilization is not defined as being for the specific interval since last measurement (unlike `system.cpu.utilization`). [Reference](https://docs.oracle.com/en/java/javase/17/docs/api/jdk.management/com/sun/management/OperatingSystemMXBean.html#getCpuLoad()).
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_JVM_SYSTEM_CPU_UTILIZATION = 'jvm.system.cpu.utilization';
/**
 * Number of messages that were delivered to the application.
 *
 * @note Records the number of messages pulled from the broker or number of messages dispatched to the application in push-based scenarios.
 * The metric **SHOULD** be reported once per message delivery. For example, if receiving and processing operations are both instrumented for a single message delivery, this counter is incremented when the message is received and not reported when it is processed.
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_MESSAGING_CLIENT_CONSUMED_MESSAGES = 'messaging.client.consumed.messages';
/**
 * Duration of messaging operation initiated by a producer or consumer client.
 *
 * @note This metric **SHOULD** **NOT** be used to report processing duration - processing duration is reported in `messaging.process.duration` metric.
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_MESSAGING_CLIENT_OPERATION_DURATION = 'messaging.client.operation.duration';
/**
 * Number of messages producer attempted to publish to the broker.
 *
 * @note This metric **MUST** **NOT** count messages that were created haven't yet been attempted to be published.
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_MESSAGING_CLIENT_PUBLISHED_MESSAGES = 'messaging.client.published.messages';
/**
 * Duration of processing operation.
 *
 * @note This metric **MUST** be reported for operations with `messaging.operation.type` that matches `process`.
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_MESSAGING_PROCESS_DURATION = 'messaging.process.duration';
/**
 * Deprecated. Use `messaging.client.consumed.messages` instead.
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 *
 * @deprecated  * Replaced by `messaging.client.consumed.messages`.
 */
exports.METRIC_MESSAGING_PROCESS_MESSAGES = 'messaging.process.messages';
/**
 * Deprecated. Use `messaging.client.operation.duration` instead.
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 *
 * @deprecated  * Replaced by `messaging.client.operation.duration`.
 */
exports.METRIC_MESSAGING_PUBLISH_DURATION = 'messaging.publish.duration';
/**
 * Deprecated. Use `messaging.client.produced.messages` instead.
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 *
 * @deprecated  * Replaced by `messaging.client.produced.messages`.
 */
exports.METRIC_MESSAGING_PUBLISH_MESSAGES = 'messaging.publish.messages';
/**
 * Deprecated. Use `messaging.client.operation.duration` instead.
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 *
 * @deprecated  * Replaced by `messaging.client.operation.duration`.
 */
exports.METRIC_MESSAGING_RECEIVE_DURATION = 'messaging.receive.duration';
/**
 * Deprecated. Use `messaging.client.consumed.messages` instead.
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 *
 * @deprecated  * Replaced by `messaging.client.consumed.messages`.
 */
exports.METRIC_MESSAGING_RECEIVE_MESSAGES = 'messaging.receive.messages';
/**
 * Event loop maximum delay.
 *
 * @note Value can be retrieved from value `histogram.max` of [`perf_hooks.monitorEventLoopDelay([options])`](https://nodejs.org/api/perf_hooks.html#perf_hooksmonitoreventloopdelayoptions)
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_NODEJS_EVENTLOOP_DELAY_MAX = 'nodejs.eventloop.delay.max';
/**
 * Event loop mean delay.
 *
 * @note Value can be retrieved from value `histogram.mean` of [`perf_hooks.monitorEventLoopDelay([options])`](https://nodejs.org/api/perf_hooks.html#perf_hooksmonitoreventloopdelayoptions)
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_NODEJS_EVENTLOOP_DELAY_MEAN = 'nodejs.eventloop.delay.mean';
/**
 * Event loop minimum delay.
 *
 * @note Value can be retrieved from value `histogram.min` of [`perf_hooks.monitorEventLoopDelay([options])`](https://nodejs.org/api/perf_hooks.html#perf_hooksmonitoreventloopdelayoptions)
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_NODEJS_EVENTLOOP_DELAY_MIN = 'nodejs.eventloop.delay.min';
/**
 * Event loop 50 percentile delay.
 *
 * @note Value can be retrieved from value `histogram.percentile(50)` of [`perf_hooks.monitorEventLoopDelay([options])`](https://nodejs.org/api/perf_hooks.html#perf_hooksmonitoreventloopdelayoptions)
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_NODEJS_EVENTLOOP_DELAY_P50 = 'nodejs.eventloop.delay.p50';
/**
 * Event loop 90 percentile delay.
 *
 * @note Value can be retrieved from value `histogram.percentile(90)` of [`perf_hooks.monitorEventLoopDelay([options])`](https://nodejs.org/api/perf_hooks.html#perf_hooksmonitoreventloopdelayoptions)
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_NODEJS_EVENTLOOP_DELAY_P90 = 'nodejs.eventloop.delay.p90';
/**
 * Event loop 99 percentile delay.
 *
 * @note Value can be retrieved from value `histogram.percentile(99)` of [`perf_hooks.monitorEventLoopDelay([options])`](https://nodejs.org/api/perf_hooks.html#perf_hooksmonitoreventloopdelayoptions)
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_NODEJS_EVENTLOOP_DELAY_P99 = 'nodejs.eventloop.delay.p99';
/**
 * Event loop standard deviation delay.
 *
 * @note Value can be retrieved from value `histogram.stddev` of [`perf_hooks.monitorEventLoopDelay([options])`](https://nodejs.org/api/perf_hooks.html#perf_hooksmonitoreventloopdelayoptions)
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_NODEJS_EVENTLOOP_DELAY_STDDEV = 'nodejs.eventloop.delay.stddev';
/**
 * Event loop utilization.
 *
 * @note The value range is [0.0,1.0] and can be retrieved from value [`performance.eventLoopUtilization([utilization1[, utilization2]])`](https://nodejs.org/api/perf_hooks.html#performanceeventlooputilizationutilization1-utilization2)
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_NODEJS_EVENTLOOP_UTILIZATION = 'nodejs.eventloop.utilization';
/**
 * Number of times the process has been context switched.
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_PROCESS_CONTEXT_SWITCHES = 'process.context_switches';
/**
 * Total CPU seconds broken down by different states.
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_PROCESS_CPU_TIME = 'process.cpu.time';
/**
 * Difference in process.cpu.time since the last measurement, divided by the elapsed time and number of CPUs available to the process.
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_PROCESS_CPU_UTILIZATION = 'process.cpu.utilization';
/**
 * Disk bytes transferred.
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_PROCESS_DISK_IO = 'process.disk.io';
/**
 * The amount of physical memory in use.
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_PROCESS_MEMORY_USAGE = 'process.memory.usage';
/**
 * The amount of committed virtual memory.
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_PROCESS_MEMORY_VIRTUAL = 'process.memory.virtual';
/**
 * Network bytes transferred.
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_PROCESS_NETWORK_IO = 'process.network.io';
/**
 * Number of file descriptors in use by the process.
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_PROCESS_OPEN_FILE_DESCRIPTOR_COUNT = 'process.open_file_descriptor.count';
/**
 * Number of page faults the process has made.
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_PROCESS_PAGING_FAULTS = 'process.paging.faults';
/**
 * Process threads count.
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_PROCESS_THREAD_COUNT = 'process.thread.count';
/**
 * Measures the duration of outbound RPC.
 *
 * @note While streaming RPCs may record this metric as start-of-batch
 * to end-of-batch, it's hard to interpret in practice.
 *
 * **Streaming**: N/A.
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_RPC_CLIENT_DURATION = 'rpc.client.duration';
/**
 * Measures the size of RPC request messages (uncompressed).
 *
 * @note **Streaming**: Recorded per message in a streaming batch
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_RPC_CLIENT_REQUEST_SIZE = 'rpc.client.request.size';
/**
 * Measures the number of messages received per RPC.
 *
 * @note Should be 1 for all non-streaming RPCs.
 *
 * **Streaming**: This metric is required for server and client streaming RPCs
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_RPC_CLIENT_REQUESTS_PER_RPC = 'rpc.client.requests_per_rpc';
/**
 * Measures the size of RPC response messages (uncompressed).
 *
 * @note **Streaming**: Recorded per response in a streaming batch
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_RPC_CLIENT_RESPONSE_SIZE = 'rpc.client.response.size';
/**
 * Measures the number of messages sent per RPC.
 *
 * @note Should be 1 for all non-streaming RPCs.
 *
 * **Streaming**: This metric is required for server and client streaming RPCs
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_RPC_CLIENT_RESPONSES_PER_RPC = 'rpc.client.responses_per_rpc';
/**
 * Measures the duration of inbound RPC.
 *
 * @note While streaming RPCs may record this metric as start-of-batch
 * to end-of-batch, it's hard to interpret in practice.
 *
 * **Streaming**: N/A.
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_RPC_SERVER_DURATION = 'rpc.server.duration';
/**
 * Measures the size of RPC request messages (uncompressed).
 *
 * @note **Streaming**: Recorded per message in a streaming batch
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_RPC_SERVER_REQUEST_SIZE = 'rpc.server.request.size';
/**
 * Measures the number of messages received per RPC.
 *
 * @note Should be 1 for all non-streaming RPCs.
 *
 * **Streaming** : This metric is required for server and client streaming RPCs
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_RPC_SERVER_REQUESTS_PER_RPC = 'rpc.server.requests_per_rpc';
/**
 * Measures the size of RPC response messages (uncompressed).
 *
 * @note **Streaming**: Recorded per response in a streaming batch
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_RPC_SERVER_RESPONSE_SIZE = 'rpc.server.response.size';
/**
 * Measures the number of messages sent per RPC.
 *
 * @note Should be 1 for all non-streaming RPCs.
 *
 * **Streaming**: This metric is required for server and client streaming RPCs
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_RPC_SERVER_RESPONSES_PER_RPC = 'rpc.server.responses_per_rpc';
/**
 * Reports the current frequency of the CPU in Hz
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_SYSTEM_CPU_FREQUENCY = 'system.cpu.frequency';
/**
 * Reports the number of logical (virtual) processor cores created by the operating system to manage multitasking
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_SYSTEM_CPU_LOGICAL_COUNT = 'system.cpu.logical.count';
/**
 * Reports the number of actual physical processor cores on the hardware
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_SYSTEM_CPU_PHYSICAL_COUNT = 'system.cpu.physical.count';
/**
 * Seconds each logical CPU spent on each mode
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_SYSTEM_CPU_TIME = 'system.cpu.time';
/**
 * Difference in system.cpu.time since the last measurement, divided by the elapsed time and number of logical CPUs
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_SYSTEM_CPU_UTILIZATION = 'system.cpu.utilization';
/**

 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_SYSTEM_DISK_IO = 'system.disk.io';
/**
 * Time disk spent activated
 *
 * @note The real elapsed time ("wall clock") used in the I/O path (time from operations running in parallel are not counted). Measured as:
 *
 * - Linux: Field 13 from [procfs-diskstats](https://www.kernel.org/doc/Documentation/ABI/testing/procfs-diskstats)
 * - Windows: The complement of
 *   ["Disk\% Idle Time"](https://learn.microsoft.com/archive/blogs/askcore/windows-performance-monitor-disk-counters-explained#windows-performance-monitor-disk-counters-explained)
 *   performance counter: `uptime * (100 - "Disk\% Idle Time") / 100`
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_SYSTEM_DISK_IO_TIME = 'system.disk.io_time';
/**

 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_SYSTEM_DISK_MERGED = 'system.disk.merged';
/**
 * Sum of the time each operation took to complete
 *
 * @note Because it is the sum of time each request took, parallel-issued requests each contribute to make the count grow. Measured as:
 *
 * - Linux: Fields 7 & 11 from [procfs-diskstats](https://www.kernel.org/doc/Documentation/ABI/testing/procfs-diskstats)
 * - Windows: "Avg. Disk sec/Read" perf counter multiplied by "Disk Reads/sec" perf counter (similar for Writes)
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_SYSTEM_DISK_OPERATION_TIME = 'system.disk.operation_time';
/**

 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_SYSTEM_DISK_OPERATIONS = 'system.disk.operations';
/**

 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_SYSTEM_FILESYSTEM_USAGE = 'system.filesystem.usage';
/**

 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_SYSTEM_FILESYSTEM_UTILIZATION = 'system.filesystem.utilization';
/**
 * An estimate of how much memory is available for starting new applications, without causing swapping
 *
 * @note This is an alternative to `system.memory.usage` metric with `state=free`.
 * Linux starting from 3.14 exports "available" memory. It takes "free" memory as a baseline, and then factors in kernel-specific values.
 * This is supposed to be more accurate than just "free" memory.
 * For reference, see the calculations [here](https://superuser.com/a/980821).
 * See also `MemAvailable` in [/proc/meminfo](https://man7.org/linux/man-pages/man5/proc.5.html).
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_SYSTEM_LINUX_MEMORY_AVAILABLE = 'system.linux.memory.available';
/**
 * Reports the memory used by the Linux kernel for managing caches of frequently used objects.
 *
 * @note The sum over the `reclaimable` and `unreclaimable` state values in `linux.memory.slab.usage` **SHOULD** be equal to the total slab memory available on the system.
 * Note that the total slab memory is not constant and may vary over time.
 * See also the [Slab allocator](https://blogs.oracle.com/linux/post/understanding-linux-kernel-memory-statistics) and `Slab` in [/proc/meminfo](https://man7.org/linux/man-pages/man5/proc.5.html).
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_SYSTEM_LINUX_MEMORY_SLAB_USAGE = 'system.linux.memory.slab.usage';
/**
 * Total memory available in the system.
 *
 * @note Its value **SHOULD** equal the sum of `system.memory.state` over all states.
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_SYSTEM_MEMORY_LIMIT = 'system.memory.limit';
/**
 * Shared memory used (mostly by tmpfs).
 *
 * @note Equivalent of `shared` from [`free` command](https://man7.org/linux/man-pages/man1/free.1.html) or
 * `Shmem` from [`/proc/meminfo`](https://man7.org/linux/man-pages/man5/proc.5.html)"
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_SYSTEM_MEMORY_SHARED = 'system.memory.shared';
/**
 * Reports memory in use by state.
 *
 * @note The sum over all `system.memory.state` values **SHOULD** equal the total memory
 * available on the system, that is `system.memory.limit`.
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_SYSTEM_MEMORY_USAGE = 'system.memory.usage';
/**

 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_SYSTEM_MEMORY_UTILIZATION = 'system.memory.utilization';
/**

 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_SYSTEM_NETWORK_CONNECTIONS = 'system.network.connections';
/**
 * Count of packets that are dropped or discarded even though there was no error
 *
 * @note Measured as:
 *
 * - Linux: the `drop` column in `/proc/dev/net` ([source](https://web.archive.org/web/20180321091318/http://www.onlamp.com/pub/a/linux/2000/11/16/LinuxAdmin.html))
 * - Windows: [`InDiscards`/`OutDiscards`](https://docs.microsoft.com/windows/win32/api/netioapi/ns-netioapi-mib_if_row2)
 *   from [`GetIfEntry2`](https://docs.microsoft.com/windows/win32/api/netioapi/nf-netioapi-getifentry2)
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_SYSTEM_NETWORK_DROPPED = 'system.network.dropped';
/**
 * Count of network errors detected
 *
 * @note Measured as:
 *
 * - Linux: the `errs` column in `/proc/dev/net` ([source](https://web.archive.org/web/20180321091318/http://www.onlamp.com/pub/a/linux/2000/11/16/LinuxAdmin.html)).
 * - Windows: [`InErrors`/`OutErrors`](https://docs.microsoft.com/windows/win32/api/netioapi/ns-netioapi-mib_if_row2)
 *   from [`GetIfEntry2`](https://docs.microsoft.com/windows/win32/api/netioapi/nf-netioapi-getifentry2).
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_SYSTEM_NETWORK_ERRORS = 'system.network.errors';
/**

 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_SYSTEM_NETWORK_IO = 'system.network.io';
/**

 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_SYSTEM_NETWORK_PACKETS = 'system.network.packets';
/**

 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_SYSTEM_PAGING_FAULTS = 'system.paging.faults';
/**

 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_SYSTEM_PAGING_OPERATIONS = 'system.paging.operations';
/**
 * Unix swap or windows pagefile usage
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_SYSTEM_PAGING_USAGE = 'system.paging.usage';
/**

 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_SYSTEM_PAGING_UTILIZATION = 'system.paging.utilization';
/**
 * Total number of processes in each state
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_SYSTEM_PROCESS_COUNT = 'system.process.count';
/**
 * Total number of processes created over uptime of the host
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_SYSTEM_PROCESS_CREATED = 'system.process.created';
/**
 * Garbage collection duration.
 *
 * @note The values can be retrieve from [`perf_hooks.PerformanceObserver(...).observe({ entryTypes: ['gc'] })`](https://nodejs.org/api/perf_hooks.html#performanceobserverobserveoptions)
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_V8JS_GC_DURATION = 'v8js.gc.duration';
/**
 * Heap space available size.
 *
 * @note Value can be retrieved from value `space_available_size` of [`v8.getHeapSpaceStatistics()`](https://nodejs.org/api/v8.html#v8getheapspacestatistics)
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_V8JS_HEAP_SPACE_AVAILABLE_SIZE = 'v8js.heap.space.available_size';
/**
 * Committed size of a heap space.
 *
 * @note Value can be retrieved from value `physical_space_size` of [`v8.getHeapSpaceStatistics()`](https://nodejs.org/api/v8.html#v8getheapspacestatistics)
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_V8JS_HEAP_SPACE_PHYSICAL_SIZE = 'v8js.heap.space.physical_size';
/**
 * Total heap memory size pre-allocated.
 *
 * @note The value can be retrieved from value `space_size` of [`v8.getHeapSpaceStatistics()`](https://nodejs.org/api/v8.html#v8getheapspacestatistics)
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_V8JS_MEMORY_HEAP_LIMIT = 'v8js.memory.heap.limit';
/**
 * Heap Memory size allocated.
 *
 * @note The value can be retrieved from value `space_used_size` of [`v8.getHeapSpaceStatistics()`](https://nodejs.org/api/v8.html#v8getheapspacestatistics)
 *
 * @experimental This metric is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.METRIC_V8JS_MEMORY_HEAP_USED = 'v8js.memory.heap.used';
//# sourceMappingURL=experimental_metrics.js.map