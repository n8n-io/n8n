/* Copyright 2022 Mozilla Foundation
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
 */
/* eslint-disable import/no-unresolved */

import { GlobalWorkerOptions } from "./build/pdf.mjs";

if (typeof window !== "undefined" && "Worker" in window) {
  GlobalWorkerOptions.workerPort = new Worker(
    new URL("./build/pdf.worker.mjs", import.meta.url),
    { type: "module" }
  );
}

export * from "./build/pdf.mjs";
