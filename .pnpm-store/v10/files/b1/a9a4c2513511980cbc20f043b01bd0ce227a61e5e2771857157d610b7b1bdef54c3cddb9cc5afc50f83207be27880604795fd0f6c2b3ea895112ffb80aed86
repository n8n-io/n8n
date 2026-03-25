"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDockerfileImages = getDockerfileImages;
const fs_1 = require("fs");
const common_1 = require("../common");
const container_runtime_1 = require("../container-runtime");
const buildArgRegex = /\${([^{]+)}/g;
async function getDockerfileImages(dockerfile, buildArgs) {
    try {
        return (await parseImages(dockerfile))
            .map((line) => line.replace(buildArgRegex, (_, arg) => buildArgs[arg] ?? ""))
            .map((line) => container_runtime_1.ImageName.fromString(line.trim()));
    }
    catch (err) {
        common_1.log.error(`Failed to read Dockerfile "${dockerfile}": ${err}`);
        throw err;
    }
}
async function parseImages(dockerfile) {
    return Array.from((await fs_1.promises.readFile(dockerfile, "utf8"))
        .split(/\r?\n/)
        .filter((line) => line.toUpperCase().startsWith("FROM"))
        .map((line) => line.split(" ").filter(common_1.isNotEmptyString)[1])
        .reduce((prev, next) => prev.add(next), new Set())
        .values());
}
//# sourceMappingURL=dockerfile-parser.js.map