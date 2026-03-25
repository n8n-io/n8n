import { readFile } from "fs/promises";
import { getSSOTokenFilepath } from "./getSSOTokenFilepath";
export const tokenIntercept = {};
export const getSSOTokenFromFile = async (id) => {
    if (tokenIntercept[id]) {
        return tokenIntercept[id];
    }
    const ssoTokenFilepath = getSSOTokenFilepath(id);
    const ssoTokenText = await readFile(ssoTokenFilepath, "utf8");
    return JSON.parse(ssoTokenText);
};
