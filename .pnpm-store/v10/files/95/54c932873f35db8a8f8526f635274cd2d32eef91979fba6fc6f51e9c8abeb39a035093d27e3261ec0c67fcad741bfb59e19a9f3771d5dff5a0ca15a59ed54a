import { chain, memoize } from "@smithy/property-provider";
import { fromEnv } from "./fromEnv";
import { fromSharedConfigFiles } from "./fromSharedConfigFiles";
import { fromStatic } from "./fromStatic";
export const loadConfig = ({ environmentVariableSelector, configFileSelector, default: defaultValue }, configuration = {}) => {
    const { signingName, logger } = configuration;
    const envOptions = { signingName, logger };
    return memoize(chain(fromEnv(environmentVariableSelector, envOptions), fromSharedConfigFiles(configFileSelector, configuration), fromStatic(defaultValue)));
};
