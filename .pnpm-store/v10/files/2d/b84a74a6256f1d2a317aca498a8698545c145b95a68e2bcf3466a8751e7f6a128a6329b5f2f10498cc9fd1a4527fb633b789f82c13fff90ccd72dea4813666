import {
  StorybookError
} from "./chunk-JVRDBUUP.js";

// src/manager-errors.ts
var Category = /* @__PURE__ */ ((Category2) => (Category2.MANAGER_UNCAUGHT = "MANAGER_UNCAUGHT", Category2.MANAGER_UI = "MANAGER_UI", Category2.MANAGER_API = "MANAGER_API", Category2.MANAGER_CLIENT_LOGGER = "MANAGER_CLIENT-LOGGER", Category2.MANAGER_CHANNELS = "MANAGER_CHANNELS", Category2.MANAGER_CORE_EVENTS = "MANAGER_CORE-EVENTS", Category2.MANAGER_ROUTER = "MANAGER_ROUTER", Category2.MANAGER_THEMING = "MANAGER_THEMING", Category2))(Category || {}), ProviderDoesNotExtendBaseProviderError = class extends StorybookError {
  constructor() {
    super({
      name: "ProviderDoesNotExtendBaseProviderError",
      category: "MANAGER_UI" /* MANAGER_UI */,
      code: 1,
      message: "The Provider passed into Storybook's UI is not extended from the base Provider. Please check your Provider implementation."
    });
  }
}, UncaughtManagerError = class extends StorybookError {
  constructor(data) {
    super({
      name: "UncaughtManagerError",
      category: "MANAGER_UNCAUGHT" /* MANAGER_UNCAUGHT */,
      code: 1,
      message: data.error.message
    });
    this.data = data;
    this.stack = data.error.stack;
  }
}, StatusTypeIdMismatchError = class extends StorybookError {
  constructor(data) {
    super({
      name: "StatusTypeIdMismatchError",
      category: "MANAGER_API" /* MANAGER_API */,
      code: 1,
      message: `Status has typeId "${data.status.typeId}" but was added to store with typeId "${data.typeId}". Full status: ${JSON.stringify(
        data.status,
        null,
        2
      )}`
    });
    this.data = data;
  }
};

export {
  Category,
  ProviderDoesNotExtendBaseProviderError,
  UncaughtManagerError,
  StatusTypeIdMismatchError
};
