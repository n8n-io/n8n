"use strict";
/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createConfigFactory = void 0;
const EnvironmentConfigFactory_1 = require("./EnvironmentConfigFactory");
const FileConfigFactory_1 = require("./FileConfigFactory");
function createConfigFactory() {
    if ((0, FileConfigFactory_1.hasValidConfigFile)()) {
        return new FileConfigFactory_1.FileConfigFactory();
    }
    return new EnvironmentConfigFactory_1.EnvironmentConfigFactory();
}
exports.createConfigFactory = createConfigFactory;
//# sourceMappingURL=ConfigFactory.js.map