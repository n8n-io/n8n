import { HashCalculator } from "./HashCalculator";
export const readableStreamHasher = (hashCtor, readableStream) => {
    if (readableStream.readableFlowing !== null) {
        throw new Error("Unable to calculate hash for flowing readable stream");
    }
    const hash = new hashCtor();
    const hashCalculator = new HashCalculator(hash);
    readableStream.pipe(hashCalculator);
    return new Promise((resolve, reject) => {
        readableStream.on("error", (err) => {
            hashCalculator.end();
            reject(err);
        });
        hashCalculator.on("error", reject);
        hashCalculator.on("finish", () => {
            hash.digest().then(resolve).catch(reject);
        });
    });
};
