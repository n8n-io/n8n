const { AbortController, AbortSignal } = require("../index.js");

describe("AbortSignal", function () {
  it("should implement EventTarget", function () {
    const controller = new AbortController();
    const signal = controller.signal;
    const unusedHandler = jest.fn();
    const handler = jest.fn();
    const event = { type: "abort", target: signal };

    signal.onabort = jest.fn();
    signal.addEventListener("abort", handler);
    signal.addEventListener("abort", unusedHandler);
    signal.removeEventListener("abort", unusedHandler);

    signal.dispatchEvent("abort", event);

    expect(unusedHandler).not.toBeCalled();
    expect(handler).toBeCalledTimes(1);
    expect(handler).toBeCalledWith(event);
    expect(signal.onabort).toBeCalledTimes(1);
    expect(signal.onabort).toBeCalledWith(event);

    jest.clearAllMocks();
    signal.dispatchEvent("abort", event);

    expect(unusedHandler).not.toBeCalled();
    expect(handler).toBeCalledTimes(1);
    expect(handler).toBeCalledWith(event);
    expect(signal.onabort).toBeCalledTimes(1);
    expect(signal.onabort).toBeCalledWith(event);

    jest.clearAllMocks();
    signal.dispatchEvent("unknown", event);

    expect(unusedHandler).not.toBeCalled();
    expect(handler).not.toBeCalled();
    expect(signal.onabort).not.toBeCalled();
  });

  it("should implement throwIfAborted", function () {
    const controller = new AbortController();
    const signal = controller.signal;
    expect(() => signal.throwIfAborted()).not.toThrowError();
    controller.abort();
    expect(() => signal.throwIfAborted()).toThrowError(new Error("AbortError"));
  });
});

describe("Static methods", () => {
  jest.useFakeTimers();
  jest.spyOn(global, "setTimeout");

  it("should implement abort", function () {
    const signal = AbortSignal.abort();
    expect(signal.aborted).toBe(true);
    expect(signal.reason).toEqual(new Error("AbortError"));
  });

  it("should implement timeout", function () {
    const signal = AbortSignal.timeout(1000);
    expect(setTimeout).toHaveBeenCalledTimes(1);
    expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 1000);
    expect(signal.aborted).toBe(false);
    expect(signal.reason).toBeUndefined();

    jest.runAllTimers();

    expect(signal.aborted).toBe(true);
    expect(signal.reason).toEqual(new Error("TimeoutError"));
  });
});
