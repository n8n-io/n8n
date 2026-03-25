describe("AbortController in browser", function () {
  // Mock AbortController
  const mockedGlobalAbortController = jest.fn();

  beforeAll(() => {
    // Attach mocked AbortController to global
    self.AbortController = mockedGlobalAbortController;
  });

  it("should call global abort controller", function () {
    // Require module after global setup
    const { AbortController } = require("../browser.js");

    const controller = new AbortController();

    expect(controller).toBeTruthy();
    expect(mockedGlobalAbortController).toBeCalled();
  });
});
