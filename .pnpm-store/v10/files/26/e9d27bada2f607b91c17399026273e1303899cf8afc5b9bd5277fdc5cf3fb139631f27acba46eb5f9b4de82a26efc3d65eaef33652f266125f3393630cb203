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

class SampleClass {
  constructor(counterInit = 1) {
    this._counter = counterInit;
    this._promise = Promise.resolve(4);
  }

  static get SOME_NUMBER() {
    return 4;
  }

  static ADD(a, b) {
    return a + b;
  }

  get counter() {
    return this._counter;
  }

  set counter(value) {
    this._counter = value;
  }

  get promise() {
    return this._promise;
  }

  method() {
    return 4;
  }

  increaseCounter(delta = 1) {
    this._counter += delta;
  }

  promiseFunc() {
    return new Promise((resolve) => setTimeout((_) => resolve(4), 100));
  }

  proxyFunc() {
    return Comlink.proxy({
      counter: 0,
      inc() {
        this.counter++;
      },
    });
  }

  throwsAnError() {
    throw Error("OMG");
  }
}

describe("Comlink in the same realm", function () {
  beforeEach(function () {
    const { port1, port2 } = new MessageChannel();
    port1.start();
    port2.start();
    this.port1 = port1;
    this.port2 = port2;
  });

  it("can work with objects", async function () {
    const thing = Comlink.wrap(this.port1);
    Comlink.expose({ value: 4 }, this.port2);
    expect(await thing.value).to.equal(4);
  });

  it("can work with functions on an object", async function () {
    const thing = Comlink.wrap(this.port1);
    Comlink.expose({ f: (_) => 4 }, this.port2);
    expect(await thing.f()).to.equal(4);
  });

  it("can work with functions", async function () {
    const thing = Comlink.wrap(this.port1);
    Comlink.expose((_) => 4, this.port2);
    expect(await thing()).to.equal(4);
  });

  it("can work with objects that have undefined properties", async function () {
    const thing = Comlink.wrap(this.port1);
    Comlink.expose({ x: undefined }, this.port2);
    expect(await thing.x).to.be.undefined;
  });

  it("can keep the stack and message of thrown errors", async function () {
    let stack;
    const thing = Comlink.wrap(this.port1);
    Comlink.expose((_) => {
      const error = Error("OMG");
      stack = error.stack;
      throw error;
    }, this.port2);
    try {
      await thing();
      throw "Should have thrown";
    } catch (err) {
      expect(err).to.not.eq("Should have thrown");
      expect(err.message).to.equal("OMG");
      expect(err.stack).to.equal(stack);
    }
  });

  it("can forward an async function error", async function () {
    const thing = Comlink.wrap(this.port1);
    Comlink.expose(
      {
        async throwError() {
          throw new Error("Should have thrown");
        },
      },
      this.port2
    );
    try {
      await thing.throwError();
    } catch (err) {
      expect(err.message).to.equal("Should have thrown");
    }
  });

  it("can rethrow non-error objects", async function () {
    const thing = Comlink.wrap(this.port1);
    Comlink.expose((_) => {
      throw { test: true };
    }, this.port2);
    try {
      await thing();
      throw "Should have thrown";
    } catch (err) {
      expect(err).to.not.equal("Should have thrown");
      expect(err.test).to.equal(true);
    }
  });

  it("can rethrow scalars", async function () {
    const thing = Comlink.wrap(this.port1);
    Comlink.expose((_) => {
      throw "oops";
    }, this.port2);
    try {
      await thing();
      throw "Should have thrown";
    } catch (err) {
      expect(err).to.not.equal("Should have thrown");
      expect(err).to.equal("oops");
      expect(typeof err).to.equal("string");
    }
  });

  it("can rethrow null", async function () {
    const thing = Comlink.wrap(this.port1);
    Comlink.expose((_) => {
      throw null;
    }, this.port2);
    try {
      await thing();
      throw "Should have thrown";
    } catch (err) {
      expect(err).to.not.equal("Should have thrown");
      expect(err).to.equal(null);
      expect(typeof err).to.equal("object");
    }
  });

  it("can work with parameterized functions", async function () {
    const thing = Comlink.wrap(this.port1);
    Comlink.expose((a, b) => a + b, this.port2);
    expect(await thing(1, 3)).to.equal(4);
  });

  it("can work with functions that return promises", async function () {
    const thing = Comlink.wrap(this.port1);
    Comlink.expose(
      (_) => new Promise((resolve) => setTimeout((_) => resolve(4), 100)),
      this.port2
    );
    expect(await thing()).to.equal(4);
  });

  it("can work with classes", async function () {
    const thing = Comlink.wrap(this.port1);
    Comlink.expose(SampleClass, this.port2);
    const instance = await new thing();
    expect(await instance.method()).to.equal(4);
  });

  it("can pass parameters to class constructor", async function () {
    const thing = Comlink.wrap(this.port1);
    Comlink.expose(SampleClass, this.port2);
    const instance = await new thing(23);
    expect(await instance.counter).to.equal(23);
  });

  it("can access a class in an object", async function () {
    const thing = Comlink.wrap(this.port1);
    Comlink.expose({ SampleClass }, this.port2);
    const instance = await new thing.SampleClass();
    expect(await instance.method()).to.equal(4);
  });

  it("can work with class instance properties", async function () {
    const thing = Comlink.wrap(this.port1);
    Comlink.expose(SampleClass, this.port2);
    const instance = await new thing();
    expect(await instance._counter).to.equal(1);
  });

  it("can set class instance properties", async function () {
    const thing = Comlink.wrap(this.port1);
    Comlink.expose(SampleClass, this.port2);
    const instance = await new thing();
    expect(await instance._counter).to.equal(1);
    await (instance._counter = 4);
    expect(await instance._counter).to.equal(4);
  });

  it("can work with class instance methods", async function () {
    const thing = Comlink.wrap(this.port1);
    Comlink.expose(SampleClass, this.port2);
    const instance = await new thing();
    expect(await instance.counter).to.equal(1);
    await instance.increaseCounter();
    expect(await instance.counter).to.equal(2);
  });

  it("can handle throwing class instance methods", async function () {
    const thing = Comlink.wrap(this.port1);
    Comlink.expose(SampleClass, this.port2);
    const instance = await new thing();
    return instance
      .throwsAnError()
      .then((_) => Promise.reject())
      .catch((err) => {});
  });

  it("can work with class instance methods multiple times", async function () {
    const thing = Comlink.wrap(this.port1);
    Comlink.expose(SampleClass, this.port2);
    const instance = await new thing();
    expect(await instance.counter).to.equal(1);
    await instance.increaseCounter();
    await instance.increaseCounter(5);
    expect(await instance.counter).to.equal(7);
  });

  it("can work with class instance methods that return promises", async function () {
    const thing = Comlink.wrap(this.port1);
    Comlink.expose(SampleClass, this.port2);
    const instance = await new thing();
    expect(await instance.promiseFunc()).to.equal(4);
  });

  it("can work with class instance properties that are promises", async function () {
    const thing = Comlink.wrap(this.port1);
    Comlink.expose(SampleClass, this.port2);
    const instance = await new thing();
    expect(await instance._promise).to.equal(4);
  });

  it("can work with class instance getters that are promises", async function () {
    const thing = Comlink.wrap(this.port1);
    Comlink.expose(SampleClass, this.port2);
    const instance = await new thing();
    expect(await instance.promise).to.equal(4);
  });

  it("can work with static class properties", async function () {
    const thing = Comlink.wrap(this.port1);
    Comlink.expose(SampleClass, this.port2);
    expect(await thing.SOME_NUMBER).to.equal(4);
  });

  it("can work with static class methods", async function () {
    const thing = Comlink.wrap(this.port1);
    Comlink.expose(SampleClass, this.port2);
    expect(await thing.ADD(1, 3)).to.equal(4);
  });

  it("can work with bound class instance methods", async function () {
    const thing = Comlink.wrap(this.port1);
    Comlink.expose(SampleClass, this.port2);
    const instance = await new thing();
    expect(await instance.counter).to.equal(1);
    const method = instance.increaseCounter.bind(instance);
    await method();
    expect(await instance.counter).to.equal(2);
  });

  it("can work with class instance getters", async function () {
    const thing = Comlink.wrap(this.port1);
    Comlink.expose(SampleClass, this.port2);
    const instance = await new thing();
    expect(await instance.counter).to.equal(1);
    await instance.increaseCounter();
    expect(await instance.counter).to.equal(2);
  });

  it("can work with class instance setters", async function () {
    const thing = Comlink.wrap(this.port1);
    Comlink.expose(SampleClass, this.port2);
    const instance = await new thing();
    expect(await instance._counter).to.equal(1);
    await (instance.counter = 4);
    expect(await instance._counter).to.equal(4);
  });

  const hasBroadcastChannel = (_) => "BroadcastChannel" in self;
  guardedIt(hasBroadcastChannel)(
    "will work with BroadcastChannel",
    async function () {
      const b1 = new BroadcastChannel("comlink_bc_test");
      const b2 = new BroadcastChannel("comlink_bc_test");
      const thing = Comlink.wrap(b1);
      Comlink.expose((b) => 40 + b, b2);
      expect(await thing(2)).to.equal(42);
    }
  );

  // Buffer transfers seem to have regressed in Safari 11.1, it’s fixed in 11.2.
  const isNotSafari11_1 = (_) =>
    !/11\.1(\.[0-9]+)? Safari/.test(navigator.userAgent);
  guardedIt(isNotSafari11_1)("will transfer buffers", async function () {
    const thing = Comlink.wrap(this.port1);
    Comlink.expose((b) => b.byteLength, this.port2);
    const buffer = new Uint8Array([1, 2, 3]).buffer;
    expect(await thing(Comlink.transfer(buffer, [buffer]))).to.equal(3);
    expect(buffer.byteLength).to.equal(0);
  });

  guardedIt(isNotSafari11_1)("will copy TypedArrays", async function () {
    const thing = Comlink.wrap(this.port1);
    Comlink.expose((b) => b, this.port2);
    const array = new Uint8Array([1, 2, 3]);
    const receive = await thing(array);
    expect(array).to.not.equal(receive);
    expect(array.byteLength).to.equal(receive.byteLength);
    expect([...array]).to.deep.equal([...receive]);
  });

  guardedIt(isNotSafari11_1)("will copy nested TypedArrays", async function () {
    const thing = Comlink.wrap(this.port1);
    Comlink.expose((b) => b, this.port2);
    const array = new Uint8Array([1, 2, 3]);
    const receive = await thing({
      v: 1,
      array,
    });
    expect(array).to.not.equal(receive.array);
    expect(array.byteLength).to.equal(receive.array.byteLength);
    expect([...array]).to.deep.equal([...receive.array]);
  });

  guardedIt(isNotSafari11_1)(
    "will transfer deeply nested buffers",
    async function () {
      const thing = Comlink.wrap(this.port1);
      Comlink.expose((a) => a.b.c.d.byteLength, this.port2);
      const buffer = new Uint8Array([1, 2, 3]).buffer;
      expect(
        await thing(Comlink.transfer({ b: { c: { d: buffer } } }, [buffer]))
      ).to.equal(3);
      expect(buffer.byteLength).to.equal(0);
    }
  );

  it("will transfer a message port", async function () {
    const thing = Comlink.wrap(this.port1);
    Comlink.expose((a) => a.postMessage("ohai"), this.port2);
    const { port1, port2 } = new MessageChannel();
    await thing(Comlink.transfer(port2, [port2]));
    return new Promise((resolve) => {
      port1.onmessage = (event) => {
        expect(event.data).to.equal("ohai");
        resolve();
      };
    });
  });

  it("will wrap marked return values", async function () {
    const thing = Comlink.wrap(this.port1);
    Comlink.expose(
      (_) =>
        Comlink.proxy({
          counter: 0,
          inc() {
            this.counter += 1;
          },
        }),
      this.port2
    );
    const obj = await thing();
    expect(await obj.counter).to.equal(0);
    await obj.inc();
    expect(await obj.counter).to.equal(1);
  });

  it("will wrap marked return values from class instance methods", async function () {
    const thing = Comlink.wrap(this.port1);
    Comlink.expose(SampleClass, this.port2);
    const instance = await new thing();
    const obj = await instance.proxyFunc();
    expect(await obj.counter).to.equal(0);
    await obj.inc();
    expect(await obj.counter).to.equal(1);
  });

  it("will wrap marked parameter values", async function () {
    const thing = Comlink.wrap(this.port1);
    const local = {
      counter: 0,
      inc() {
        this.counter++;
      },
    };
    Comlink.expose(async function (f) {
      await f.inc();
    }, this.port2);
    expect(local.counter).to.equal(0);
    await thing(Comlink.proxy(local));
    expect(await local.counter).to.equal(1);
  });

  it("will wrap marked assignments", function (done) {
    const thing = Comlink.wrap(this.port1);
    const obj = {
      onready: null,
      call() {
        this.onready();
      },
    };
    Comlink.expose(obj, this.port2);

    thing.onready = Comlink.proxy(() => done());
    thing.call();
  });

  it("will wrap marked parameter values, simple function", async function () {
    const thing = Comlink.wrap(this.port1);
    Comlink.expose(async function (f) {
      await f();
    }, this.port2);
    // Weird code because Mocha
    await new Promise(async (resolve) => {
      thing(Comlink.proxy((_) => resolve()));
    });
  });

  it("will wrap multiple marked parameter values, simple function", async function () {
    const thing = Comlink.wrap(this.port1);
    Comlink.expose(async function (f1, f2, f3) {
      return (await f1()) + (await f2()) + (await f3());
    }, this.port2);
    // Weird code because Mocha
    expect(
      await thing(
        Comlink.proxy((_) => 1),
        Comlink.proxy((_) => 2),
        Comlink.proxy((_) => 3)
      )
    ).to.equal(6);
  });

  it("will proxy deeply nested values", async function () {
    const thing = Comlink.wrap(this.port1);
    const obj = {
      a: {
        v: 4,
      },
      b: Comlink.proxy({
        v: 5,
      }),
    };
    Comlink.expose(obj, this.port2);

    const a = await thing.a;
    const b = await thing.b;
    expect(await a.v).to.equal(4);
    expect(await b.v).to.equal(5);
    await (a.v = 8);
    await (b.v = 9);
    // Workaround for a weird scheduling inconsistency in Firefox.
    // This test failed, but not when run in isolation, and only
    // in Firefox. I think there might be problem with task ordering.
    await new Promise((resolve) => setTimeout(resolve, 1));
    expect(await thing.a.v).to.equal(4);
    expect(await thing.b.v).to.equal(9);
  });

  it("will handle undefined parameters", async function () {
    const thing = Comlink.wrap(this.port1);
    Comlink.expose({ f: (_) => 4 }, this.port2);
    expect(await thing.f(undefined)).to.equal(4);
  });

  it("can handle destructuring", async function () {
    Comlink.expose(
      {
        a: 4,
        get b() {
          return 5;
        },
        c() {
          return 6;
        },
      },
      this.port2
    );
    const { a, b, c } = Comlink.wrap(this.port1);
    expect(await a).to.equal(4);
    expect(await b).to.equal(5);
    expect(await c()).to.equal(6);
  });

  it("lets users define transfer handlers", function (done) {
    Comlink.transferHandlers.set("event", {
      canHandle(obj) {
        return obj instanceof Event;
      },
      serialize(obj) {
        return [obj.data, []];
      },
      deserialize(data) {
        return new MessageEvent("message", { data });
      },
    });

    Comlink.expose((ev) => {
      expect(ev).to.be.an.instanceOf(Event);
      expect(ev.data).to.deep.equal({ a: 1 });
      done();
    }, this.port1);
    const thing = Comlink.wrap(this.port2);

    const { port1, port2 } = new MessageChannel();
    port1.addEventListener("message", thing.bind(this));
    port1.start();
    port2.postMessage({ a: 1 });
  });

  it("can tunnels a new endpoint with createEndpoint", async function () {
    Comlink.expose(
      {
        a: 4,
        c() {
          return 5;
        },
      },
      this.port2
    );
    const proxy = Comlink.wrap(this.port1);
    const otherEp = await proxy[Comlink.createEndpoint]();
    const otherProxy = Comlink.wrap(otherEp);
    expect(await otherProxy.a).to.equal(4);
    expect(await proxy.a).to.equal(4);
    expect(await otherProxy.c()).to.equal(5);
    expect(await proxy.c()).to.equal(5);
  });

  it("released proxy should no longer be useable and throw an exception", async function () {
    const thing = Comlink.wrap(this.port1);
    Comlink.expose(SampleClass, this.port2);
    const instance = await new thing();
    await instance[Comlink.releaseProxy]();
    expect(() => instance.method()).to.throw();
  });

  it("released proxy should invoke finalizer", async function () {
    let finalized = false;
    Comlink.expose(
      {
        a: "thing",
        [Comlink.finalizer]: () => {
          finalized = true;
        },
      },
      this.port2
    );
    const instance = Comlink.wrap(this.port1);
    expect(await instance.a).to.equal("thing");
    await instance[Comlink.releaseProxy]();
    // wait a beat to let the events process
    await new Promise((resolve) => setTimeout(resolve, 1));
    expect(finalized).to.be.true;
  });

  // commented out this test as it could be unreliable in various browsers as
  // it has to wait for GC to kick in which could happen at any timing
  // this does seem to work when testing locally
  it.skip("released proxy via GC should invoke finalizer", async function () {
    let finalized = false;
    Comlink.expose(
      {
        a: "thing",
        [Comlink.finalizer]: () => {
          finalized = true;
        },
      },
      this.port2
    );

    let registry;

    // set a long enough timeout to wait for a garbage collection
    this.timeout(10000);
    // promise will resolve when the proxy is garbage collected
    await new Promise(async (resolve, reject) => {
      registry = new FinalizationRegistry((heldValue) => {
        heldValue();
      });

      const instance = Comlink.wrap(this.port1);
      registry.register(instance, resolve);
      expect(await instance.a).to.equal("thing");
    });
    // wait a beat to let the events process
    await new Promise((resolve) => setTimeout(resolve, 1));
    expect(finalized).to.be.true;
  });

  it("can proxy with a given target", async function () {
    const thing = Comlink.wrap(this.port1, { value: {} });
    Comlink.expose({ value: 4 }, this.port2);
    expect(await thing.value).to.equal(4);
  });

  it("can handle unserializable types", async function () {
    const thing = Comlink.wrap(this.port1, { value: {} });
    Comlink.expose({ value: () => "boom" }, this.port2);

    try {
      await thing.value;
    } catch (err) {
      expect(err.message).to.equal("Unserializable return value");
    }
  });
});

function guardedIt(f) {
  return f() ? it : xit;
}
