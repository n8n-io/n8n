import { getEnvironmentVariable, getLangSmithEnvironmentVariable, } from "./env.js";
export const getDefaultProjectName = () => {
    return (getLangSmithEnvironmentVariable("PROJECT") ??
        getEnvironmentVariable("LANGCHAIN_SESSION") ?? // TODO: Deprecate
        "default");
};
