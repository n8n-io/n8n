"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createParserServices = void 0;
function createParserServices(astMaps, program) {
    if (!program) {
        // we always return the node maps because
        // (a) they don't require type info and
        // (b) they can be useful when using some of TS's internal non-type-aware AST utils
        return { program, ...astMaps };
    }
    const checker = program.getTypeChecker();
    return {
        program,
        ...astMaps,
        getSymbolAtLocation: node => checker.getSymbolAtLocation(astMaps.esTreeNodeToTSNodeMap.get(node)),
        getTypeAtLocation: node => checker.getTypeAtLocation(astMaps.esTreeNodeToTSNodeMap.get(node)),
    };
}
exports.createParserServices = createParserServices;
//# sourceMappingURL=createParserServices.js.map