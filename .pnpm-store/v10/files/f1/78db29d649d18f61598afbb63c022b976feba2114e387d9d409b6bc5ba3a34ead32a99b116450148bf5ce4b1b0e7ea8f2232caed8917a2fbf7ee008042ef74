import { AlgorithmId } from "@smithy/types";
export { AlgorithmId };
const knownAlgorithms = Object.values(AlgorithmId);
export const getChecksumConfiguration = (runtimeConfig) => {
    const checksumAlgorithms = [];
    for (const id in AlgorithmId) {
        const algorithmId = AlgorithmId[id];
        if (runtimeConfig[algorithmId] === undefined) {
            continue;
        }
        checksumAlgorithms.push({
            algorithmId: () => algorithmId,
            checksumConstructor: () => runtimeConfig[algorithmId],
        });
    }
    for (const [id, ChecksumCtor] of Object.entries(runtimeConfig.checksumAlgorithms ?? {})) {
        checksumAlgorithms.push({
            algorithmId: () => id,
            checksumConstructor: () => ChecksumCtor,
        });
    }
    return {
        addChecksumAlgorithm(algo) {
            runtimeConfig.checksumAlgorithms = runtimeConfig.checksumAlgorithms ?? {};
            const id = algo.algorithmId();
            const ctor = algo.checksumConstructor();
            if (knownAlgorithms.includes(id)) {
                runtimeConfig.checksumAlgorithms[id.toUpperCase()] = ctor;
            }
            else {
                runtimeConfig.checksumAlgorithms[id] = ctor;
            }
            checksumAlgorithms.push(algo);
        },
        checksumAlgorithms() {
            return checksumAlgorithms;
        },
    };
};
export const resolveChecksumRuntimeConfig = (clientConfig) => {
    const runtimeConfig = {};
    clientConfig.checksumAlgorithms().forEach((checksumAlgorithm) => {
        const id = checksumAlgorithm.algorithmId();
        if (knownAlgorithms.includes(id)) {
            runtimeConfig[id] = checksumAlgorithm.checksumConstructor();
        }
    });
    return runtimeConfig;
};
