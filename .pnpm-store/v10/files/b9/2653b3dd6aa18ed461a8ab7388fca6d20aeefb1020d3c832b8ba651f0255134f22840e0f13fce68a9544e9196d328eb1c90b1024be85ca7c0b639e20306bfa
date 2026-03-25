const pattern = /(^|;)\s*(export|import)((\s+\w)|(\s*[*={]))|import\(/m;
export function isMaybeUnambiguousModule(content) {
    return pattern.test(content);
}
const unambiguousNodeType = /^(?:(?:Exp|Imp)ort.*Declaration|TSExportAssignment)$/;
export function isUnambiguousModule(ast) {
    return ast.body && ast.body.some(node => unambiguousNodeType.test(node.type));
}
//# sourceMappingURL=unambiguous.js.map