declare type ModuleType = "esm" | "cjs";

/**
 * Information that discribes a module to be imported.
 */
declare type ModuleInfo = {
  /**
   * Global variable name with which the import statements of the module
   * should be replaced.
   */
  varName: string;

  /**
   * Type (either `"esm"` or `"cjs"`) that determines the internal behavior of
   * this plugin. Defaults to `"esm"`.
   */
  type?: ModuleType;

  /**
   * Names of variables that are exported from the module and may be imported
   * from another module.
   * No effect if `type` is `"cjs"`.
   */
  namedExports?: readonly string[];

  /**
   * Set to `false` to prevent emitting code for default import/export
   * (which you won't need to unless you are finicky).
   * Defaults to `true`. No effect if `type` is `"cjs"`.
   */
  defaultExport?: boolean;
};

declare const globalsModuleInfoMap: Required<Record<"react" | "react-dom" | "react-dom/client" | "@storybook/icons" | "storybook/internal/manager-api" | "@storybook/manager-api" | "@storybook/core/manager-api" | "storybook/internal/components" | "@storybook/components" | "@storybook/core/components" | "storybook/internal/channels" | "@storybook/channels" | "@storybook/core/channels" | "storybook/internal/core-errors" | "@storybook/core-events" | "@storybook/core/core-events" | "storybook/internal/manager-errors" | "@storybook/core-events/manager-errors" | "@storybook/core/manager-errors" | "storybook/internal/router" | "@storybook/router" | "@storybook/core/router" | "storybook/internal/theming" | "@storybook/theming" | "@storybook/core/theming" | "storybook/internal/theming/create" | "@storybook/theming/create" | "@storybook/core/theming/create" | "storybook/internal/client-logger" | "@storybook/client-logger" | "@storybook/core/client-logger" | "storybook/internal/types" | "@storybook/types" | "@storybook/core/types", Required<ModuleInfo>>>;

export { globalsModuleInfoMap };
