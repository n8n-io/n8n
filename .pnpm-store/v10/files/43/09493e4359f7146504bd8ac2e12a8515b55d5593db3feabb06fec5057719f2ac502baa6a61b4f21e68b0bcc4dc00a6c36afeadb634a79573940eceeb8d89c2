import { z } from "zod/v3";

//#region src/graph/zod/plugin.d.ts
interface ZodLangGraphTypesV3<T extends z.ZodTypeAny, Output> {
  reducer<Input = z.output<T>>(transform: (a: Output, arg: Input) => Output, options?: z.ZodType<Input>): z.ZodType<Output, z.ZodEffectsDef<T>, Input>;
  metadata(payload: {
    langgraph_nodes?: string[];
    langgraph_type?: "prompt";
    [key: string]: unknown;
  }): T;
}
declare module "zod" {
  interface ZodType<Output> {
    /**
     * @deprecated Using the langgraph zod plugin is deprecated and will be removed in future versions
     * Consider upgrading to zod 4 and using the exported langgraph meta registry. {@link langgraphRegistry}
     */
    langgraph: ZodLangGraphTypesV3<any, Output>;
  }
}
declare module "zod/v3" {
  interface ZodType<Output> {
    /**
     * @deprecated Using the langgraph zod plugin is deprecated and will be removed in future versions
     * Consider upgrading to zod 4 and using the exported langgraph meta registry. {@link langgraphRegistry}
     */
    langgraph: ZodLangGraphTypesV3<this, Output>;
  }
}
//# sourceMappingURL=plugin.d.ts.map