const { AbortController } = require("../index.js");
const { fetch } = require("whatwg-fetch");

describe("node-fetch", function () {
  it("should throw exception if aborted during the request", async function () {
    expect.assertions(1);
    try {
      const controller = new AbortController();
      const signal = controller.signal;
      setTimeout(() => controller.abort(), 5);
      await fetch("https://www.google.com/", { signal });
    } catch (err) {
      expect(err.name).toBe("AbortError");
    }
  });
  it("should throw exception if passed an already aborted signal", async function () {
    expect.assertions(1);
    try {
      const controller = new AbortController();
      const signal = controller.signal;
      controller.abort();
      await fetch("https://www.google.com/", { signal });
    } catch (err) {
      expect(err.name).toBe("AbortError");
    }
  });
});
