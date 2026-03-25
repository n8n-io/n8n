import { anySignal, getTimeoutSignal } from "../../../src/core/fetcher/signals";

describe("Test getTimeoutSignal", () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it("should return an object with signal and abortId", () => {
        const { signal, abortId } = getTimeoutSignal(1000);

        expect(signal).toBeDefined();
        expect(abortId).toBeDefined();
        expect(signal).toBeInstanceOf(AbortSignal);
        expect(signal.aborted).toBe(false);
    });

    it("should create a signal that aborts after the specified timeout", () => {
        const timeoutMs = 5000;
        const { signal } = getTimeoutSignal(timeoutMs);

        expect(signal.aborted).toBe(false);

        jest.advanceTimersByTime(timeoutMs - 1);
        expect(signal.aborted).toBe(false);

        jest.advanceTimersByTime(1);
        expect(signal.aborted).toBe(true);
    });
});

describe("Test anySignal", () => {
    it("should return an AbortSignal", () => {
        const signal = anySignal(new AbortController().signal);
        expect(signal).toBeInstanceOf(AbortSignal);
    });

    it("should abort when any of the input signals is aborted", () => {
        const controller1 = new AbortController();
        const controller2 = new AbortController();
        const signal = anySignal(controller1.signal, controller2.signal);

        expect(signal.aborted).toBe(false);
        controller1.abort();
        expect(signal.aborted).toBe(true);
    });

    it("should handle an array of signals", () => {
        const controller1 = new AbortController();
        const controller2 = new AbortController();
        const signal = anySignal([controller1.signal, controller2.signal]);

        expect(signal.aborted).toBe(false);
        controller2.abort();
        expect(signal.aborted).toBe(true);
    });

    it("should abort immediately if one of the input signals is already aborted", () => {
        const controller1 = new AbortController();
        const controller2 = new AbortController();
        controller1.abort();

        const signal = anySignal(controller1.signal, controller2.signal);
        expect(signal.aborted).toBe(true);
    });
});
