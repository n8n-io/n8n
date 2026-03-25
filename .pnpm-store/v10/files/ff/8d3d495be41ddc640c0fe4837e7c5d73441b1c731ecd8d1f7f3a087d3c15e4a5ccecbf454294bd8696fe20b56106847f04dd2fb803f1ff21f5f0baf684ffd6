import { tokenIntercept } from "./getSSOTokenFromFile";
import { fileIntercept } from "./readFile";
export const externalDataInterceptor = {
    getFileRecord() {
        return fileIntercept;
    },
    interceptFile(path, contents) {
        fileIntercept[path] = Promise.resolve(contents);
    },
    getTokenRecord() {
        return tokenIntercept;
    },
    interceptToken(id, contents) {
        tokenIntercept[id] = contents;
    },
};
