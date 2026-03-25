import { createReadStream } from "fs";
import { HashCalculator } from "./HashCalculator";
export const fileStreamHasher = (hashCtor, fileStream) => new Promise((resolve, reject) => {
    if (!isReadStream(fileStream)) {
        reject(new Error("Unable to calculate hash for non-file streams."));
        return;
    }
    const fileStreamTee = createReadStream(fileStream.path, {
        start: fileStream.start,
        end: fileStream.end,
    });
    const hash = new hashCtor();
    const hashCalculator = new HashCalculator(hash);
    fileStreamTee.pipe(hashCalculator);
    fileStreamTee.on("error", (err) => {
        hashCalculator.end();
        reject(err);
    });
    hashCalculator.on("error", reject);
    hashCalculator.on("finish", function () {
        hash.digest().then(resolve).catch(reject);
    });
});
const isReadStream = (stream) => typeof stream.path === "string";
