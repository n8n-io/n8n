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
exports._LAYERS_STORE_PROPERTY = exports.kLayerPatched = void 0;
/**
 * This symbol is used to mark express layer as being already instrumented
 * since its possible to use a given layer multiple times (ex: middlewares)
 */
exports.kLayerPatched = Symbol('express-layer-patched');
/**
 * This const define where on the `request` object the Instrumentation will mount the
 * current stack of express layer.
 *
 * It is necessary because express doesn't store the different layers
 * (ie: middleware, router etc) that it called to get to the current layer.
 * Given that, the only way to know the route of a given layer is to
 * store the path of where each previous layer has been mounted.
 *
 * ex: bodyParser > auth middleware > /users router > get /:id
 *  in this case the stack would be: ["/users", "/:id"]
 *
 * ex2: bodyParser > /api router > /v1 router > /users router > get /:id
 *  stack: ["/api", "/v1", "/users", ":id"]
 *
 */
exports._LAYERS_STORE_PROPERTY = '__ot_middlewares';
//# sourceMappingURL=internal-types.js.map