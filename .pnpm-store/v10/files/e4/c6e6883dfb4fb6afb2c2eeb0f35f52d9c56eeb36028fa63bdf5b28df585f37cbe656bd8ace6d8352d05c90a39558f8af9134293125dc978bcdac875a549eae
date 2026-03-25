/**
 * Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as Comlink from "/base/dist/esm/comlink.mjs";

describe("Comlink across workers", function () {
  beforeEach(function () {
    this.worker = new Worker("/base/tests/fixtures/worker.js");
  });

  afterEach(function () {
    this.worker.terminate();
  });

  it("can communicate", async function () {
    const proxy = Comlink.wrap(this.worker);
    expect(await proxy(1, 3)).to.equal(4);
  });

  it("can tunnels a new endpoint with createEndpoint", async function () {
    const proxy = Comlink.wrap(this.worker);
    const otherEp = await proxy[Comlink.createEndpoint]();
    const otherProxy = Comlink.wrap(otherEp);
    expect(await otherProxy(20, 1)).to.equal(21);
  });
});
