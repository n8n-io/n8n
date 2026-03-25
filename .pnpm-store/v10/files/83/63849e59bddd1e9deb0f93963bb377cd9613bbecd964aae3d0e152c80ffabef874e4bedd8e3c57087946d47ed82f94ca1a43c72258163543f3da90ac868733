"use strict";
/*
 * Copyright 2019 gRPC authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.recognizedOptions = void 0;
exports.channelOptionsEqual = channelOptionsEqual;
/**
 * This is for checking provided options at runtime. This is an object for
 * easier membership checking.
 */
exports.recognizedOptions = {
    'grpc.ssl_target_name_override': true,
    'grpc.primary_user_agent': true,
    'grpc.secondary_user_agent': true,
    'grpc.default_authority': true,
    'grpc.keepalive_time_ms': true,
    'grpc.keepalive_timeout_ms': true,
    'grpc.keepalive_permit_without_calls': true,
    'grpc.service_config': true,
    'grpc.max_concurrent_streams': true,
    'grpc.initial_reconnect_backoff_ms': true,
    'grpc.max_reconnect_backoff_ms': true,
    'grpc.use_local_subchannel_pool': true,
    'grpc.max_send_message_length': true,
    'grpc.max_receive_message_length': true,
    'grpc.enable_http_proxy': true,
    'grpc.enable_channelz': true,
    'grpc.dns_min_time_between_resolutions_ms': true,
    'grpc.enable_retries': true,
    'grpc.per_rpc_retry_buffer_size': true,
    'grpc.retry_buffer_size': true,
    'grpc.max_connection_age_ms': true,
    'grpc.max_connection_age_grace_ms': true,
    'grpc-node.max_session_memory': true,
    'grpc.service_config_disable_resolution': true,
    'grpc.client_idle_timeout_ms': true,
    'grpc-node.tls_enable_trace': true,
    'grpc.lb.ring_hash.ring_size_cap': true,
    'grpc-node.retry_max_attempts_limit': true,
    'grpc-node.flow_control_window': true,
};
function channelOptionsEqual(options1, options2) {
    const keys1 = Object.keys(options1).sort();
    const keys2 = Object.keys(options2).sort();
    if (keys1.length !== keys2.length) {
        return false;
    }
    for (let i = 0; i < keys1.length; i += 1) {
        if (keys1[i] !== keys2[i]) {
            return false;
        }
        if (options1[keys1[i]] !== options2[keys2[i]]) {
            return false;
        }
    }
    return true;
}
//# sourceMappingURL=channel-options.js.map