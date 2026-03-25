"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoAmbiguousPaths = void 0;
const NoAmbiguousPaths = () => {
    return {
        Paths(pathMap, { report, location }) {
            const seenPaths = [];
            for (const currentPath of Object.keys(pathMap)) {
                const ambiguousPath = seenPaths.find((seenPath) => arePathsAmbiguous(seenPath, currentPath));
                if (ambiguousPath) {
                    report({
                        message: `Paths should resolve unambiguously. Found two ambiguous paths: \`${ambiguousPath}\` and \`${currentPath}\`.`,
                        location: location.child([currentPath]).key(),
                    });
                }
                seenPaths.push(currentPath);
            }
        },
    };
};
exports.NoAmbiguousPaths = NoAmbiguousPaths;
function arePathsAmbiguous(a, b) {
    const partsA = a.split('/');
    const partsB = b.split('/');
    if (partsA.length !== partsB.length)
        return false;
    let aVars = 0;
    let bVars = 0;
    let ambiguous = true;
    for (let i = 0; i < partsA.length; i++) {
        const aIsVar = partsA[i].match(/^{.+?}$/);
        const bIsVar = partsB[i].match(/^{.+?}$/);
        if (aIsVar || bIsVar) {
            if (aIsVar)
                aVars++;
            if (bIsVar)
                bVars++;
            continue;
        }
        else if (partsA[i] !== partsB[i]) {
            ambiguous = false;
        }
    }
    return ambiguous && aVars === bVars;
}
