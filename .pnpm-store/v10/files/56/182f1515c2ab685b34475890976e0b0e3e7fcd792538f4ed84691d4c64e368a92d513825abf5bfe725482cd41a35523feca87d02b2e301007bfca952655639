import { getConfigFilepath } from "./getConfigFilepath";
import { getSsoSessionData } from "./getSsoSessionData";
import { parseIni } from "./parseIni";
import { readFile } from "./readFile";
const swallowError = () => ({});
export const loadSsoSessionData = async (init = {}) => readFile(init.configFilepath ?? getConfigFilepath())
    .then(parseIni)
    .then(getSsoSessionData)
    .catch(swallowError);
