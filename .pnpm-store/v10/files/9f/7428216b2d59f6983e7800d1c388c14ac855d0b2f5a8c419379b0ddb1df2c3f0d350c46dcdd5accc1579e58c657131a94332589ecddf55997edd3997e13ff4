/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeDefaultTracerProviderConfiguration = void 0;
function initializeDefaultTracerProviderConfiguration() {
    return {
        processors: [],
        limits: {
            attribute_count_limit: 128,
            event_count_limit: 128,
            link_count_limit: 128,
            event_attribute_count_limit: 128,
            link_attribute_count_limit: 128,
        },
        sampler: {
            parent_based: {
                root: { always_on: undefined },
                remote_parent_sampled: { always_on: undefined },
                remote_parent_not_sampled: { always_off: undefined },
                local_parent_sampled: { always_on: undefined },
                local_parent_not_sampled: { always_off: undefined },
            },
        },
    };
}
exports.initializeDefaultTracerProviderConfiguration = initializeDefaultTracerProviderConfiguration;
//# sourceMappingURL=tracerProviderModel.js.map